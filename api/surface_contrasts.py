from api import app
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request, send_from_directory
import nibabel as nib
import numpy as np
import os
import pandas as pd
import simplejson
from tqdm import tqdm

import custom_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_CONDITIONS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_CONDITIONS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")
MESH_PATH = os.getenv("MESH_PATH")

n_voxels_hemi = 10242

# IBC contrasts exploration


## Util functions


def parse_conditions_db(df):
    """
    Given a DataFrame containing all available gifti files,
    preselects subjects with enough contrasts,
    contrasts which exists for all these subjects,
    and tasks from which these contrasts are taken.

    Inputs
    ------
    df: DataFrame
        each row points to an available gifti file
        and specifies the subject, contrast, resolution, etc

    Outputs
    -------
    subjects: list of strings
    contrasts: list of (task, contrast) tuples
    """
    # Select subjects
    selected_subjects = np.array(
        [
            "sub-01",
            "sub-04",
            "sub-05",
            "sub-06",
            "sub-07",
            "sub-09",
            "sub-11",
            "sub-12",
            "sub-13",
            "sub-14",
            "sub-15",
        ]
    )

    # Select contrasts which are available for any of the selected subjects
    selected_contrasts = (
        df[df["subject"].isin(selected_subjects)]
        .groupby(["task", "contrast"])["subject"]
        .nunique()
        .reset_index()
        .sort_values(["task", "contrast"])[["task", "contrast"]]
    ).values

    return (selected_subjects, selected_contrasts)


# Load FMRI data
def load_subject_fmri(df, subject, unique_contrasts):
    """
    Read functional data corresponding to contrast list and provided subject

    Inputs:
    df: Pandas DataFrame,
        Database descriptor
    subject: string,
             subject identifier
    unique_contrasts: list of (task, contrast) tuples,
                      Contrasts wanted

    Outputs:
    Xl: array of shape (n_vertices, n_contrasts),
        functional data read from left-hemisphere textures
    Xr: array of shape (n_vertices, n_contrasts),
        functional data read from right-hemisphere textures
    """

    paths_lh = []
    paths_rh = []

    # Iterate through every selected contrast
    for task, contrast in unique_contrasts:
        # Select db rows with matching subject and contrast
        mask = (
            (df.subject == subject).values
            * (df.contrast == contrast).values
            * (df.task == task).values
        )

        # It can be that there is no matching row
        # because this contrast was not acquired for this subject
        if len(df.loc[mask]) == 0:
            paths_lh.append(None)
            paths_rh.append(None)
        # but otherwise, one adds the path to the matching contrast
        # to our path lists
        else:
            # Among selected rows, add "path" of last row to path lists.
            # Indeed, it might be that a given tuple
            # (subject, task, contrast) corresponds to several rows
            # because the same contrast might have been acquired
            # multiple times.
            # We deal with this by sorting selected rows by "session"
            # and choosing the last row is equivalent to choosing
            # the latest acquired contrast.
            paths_lh.append(
                df.loc[mask]
                .loc[df.side == "lh"]
                .sort_values(by=["session"])
                .path.values[-1]
            )
            paths_rh.append(
                df.loc[mask]
                .loc[df.side == "rh"]
                .sort_values(by=["session"])
                .path.values[-1]
            )

    # Load all images available;
    # for values of path that are None, simply return
    # a numpy array of the size of the mesh filled with NaNs
    Xl = np.array(
        [
            nib.load(path_lh).darrays[0].data
            if path_lh is not None
            else np.full(n_voxels_hemi, np.nan)
            for path_lh in list(paths_lh)
        ]
    )
    Xr = np.array(
        [
            nib.load(path_rh).darrays[0].data
            if path_rh is not None
            else np.full(n_voxels_hemi, np.nan)
            for path_rh in list(paths_rh)
        ]
    )

    return Xl, Xr


def load_fmri(df, subjects, unique_contrasts):
    """
    Load data for a given list of subjects and contrasts.

    Outputs
    -------
    X: array of size (2*n_voxels_hemi * n_subjects, n_contrasts)
    """

    X = np.empty((0, len(unique_contrasts)))

    for subject in subjects:
        X_left, X_right = load_subject_fmri(df, subject, unique_contrasts)
        X = np.append(X, np.concatenate([X_left.T, X_right.T]), axis=0)

    return X


## Init variables and load data if possible
df = pd.DataFrame()
subjects, contrasts = [], []
n_subjects, n_contrasts = 0, 0
X = np.empty((0, 0))
n_voxels = 0

if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
    ## Load selected subjects and contrasts
    df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)

    subjects, contrasts = parse_conditions_db(df)
    n_subjects, n_contrasts = len(subjects), len(contrasts)

    ## Load functional data for all subjects
    print(f"Loading {n_contrasts} contrasts...", end=" ")
    X = load_fmri(df, subjects, contrasts)
    n_voxels = X.shape[0] // n_subjects
    print(f"OK")

# Expose functions for exploring contrasts
@app.route("/subjects", methods=["GET"])
def get_subjects():
    if DEBUG:
        print(f"[{datetime.now()}] get_subjects")

    return jsonify(subjects)


@app.route("/contrast_labels", methods=["GET"])
def get_contrast_labels():
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_labels")

    return jsonify(contrasts)


@app.route("/mesh/<path:path>", methods=["GET"])
def get_mesh(path):
    if DEBUG:
        print(f"[{datetime.now()}] get_mesh {path}")

    return send_from_directory(MESH_PATH, path)


@app.route("/voxel_fingerprint", methods=["GET"])
def get_voxel_fingerprint():
    subject_index = request.args.get("subject_index", type=int)
    voxel_index = request.args.get("voxel_index", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_voxel_fingerprint {voxel_index} for {subjects[subject_index]} ({subject_index})"
        )

    return jsonify(X[n_voxels * subject_index + voxel_index, :])


@app.route("/voxel_fingerprint_mean", methods=["GET"])
def get_voxel_fingerprint_mean():
    voxel_index = request.args.get("voxel_index", type=int)

    if DEBUG:
        print(f"[{datetime.now()}] get_voxel_mean_fingerprint {voxel_index}")
    mean = np.nanmean(
        X[
            [
                n_voxels * subject_index + voxel_index
                for subject_index in range(n_subjects)
            ],
            :,
        ],
        axis=0,
    )

    return jsonify(mean)


@app.route("/contrast", methods=["GET"])
def get_contrast():
    subject_index = request.args.get("subject_index", type=int)
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    start_index = n_voxels * subject_index

    if hemi == "left":
        return jsonify(
            X[start_index : start_index + n_voxels // 2, contrast_index]
        )
    elif hemi == "right":
        return jsonify(
            X[
                start_index + n_voxels // 2 : start_index + n_voxels,
                contrast_index,
            ]
        )
    elif hemi == "both":
        return jsonify(X[start_index : start_index + n_voxels, contrast_index])
    else:
        print(f"Unknown value for hemi: {hemi}")
        return jsonify([])


@app.route("/contrast_mean", methods=["GET"])
def get_contrast_mean():
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_mean {contrasts[contrast_index]} ({contrast_index}), hemi {hemi}"
        )

    mean = []

    if hemi == "left":
        mean = np.nanmean(
            np.vstack(
                [
                    X[
                        n_voxels * subject_index : n_voxels * subject_index
                        + n_voxels // 2,
                        contrast_index,
                    ]
                    for subject_index in range(n_subjects)
                ]
            ),
            axis=0,
        )
    elif hemi == "right":
        mean = np.nanmean(
            np.vstack(
                [
                    X[
                        n_voxels * subject_index
                        + n_voxels // 2 : n_voxels * subject_index
                        + n_voxels,
                        contrast_index,
                    ]
                    for subject_index in range(n_subjects)
                ]
            ),
            axis=0,
        )
    elif hemi == "both":
        mean = np.nanmean(
            np.vstack(
                [
                    X[
                        n_voxels * subject_index : n_voxels * subject_index
                        + n_voxels,
                        contrast_index,
                    ]
                    for subject_index in range(n_subjects)
                ]
            ),
            axis=0,
        )
    else:
        print(f"Unknown value for hemi: {hemi}")

    return jsonify(mean)
