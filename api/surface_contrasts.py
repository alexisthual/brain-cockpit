from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

import custom_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_CONDITIONS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_CONDITIONS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")

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
    contrasts: list of string
    tasks: list of string
    """
    # Select subjects with enough contrasts
    grouped_by_subject = df.groupby(["subject"])["contrast"].nunique()
    selected_subjects = grouped_by_subject[
        grouped_by_subject > 100
    ].index.values

    # Select contrasts available for all selected subjects
    grouped_by_contrast = df.groupby(["contrast", "task"])["subject"].unique()
    grouped_by_contrast = grouped_by_contrast.sort_index(
        level=["task", "contrast"]
    )
    grouped_by_contrast = grouped_by_contrast.reset_index()
    mask = [
        np.array_equal(
            np.intersect1d(subjects, selected_subjects), selected_subjects
        )
        for subjects in grouped_by_contrast.subject
    ]
    selected_contrasts = grouped_by_contrast[mask]
    selected_contrasts = selected_contrasts.reset_index()

    selected_tasks = (
        selected_contrasts.groupby(["task"])["contrast"]
        .nunique()
        .reset_index()
    )

    return (
        selected_subjects,
        selected_contrasts.contrast.values,
        selected_tasks.values,
    )


# Load FMRI data
def load_subject_fmri(df, subject, unique_contrasts):
    """
    Read functional data corresponding to contrast list and provided subject

    Inputs:
    df: Pandas DataFrame,
        Database descriptor
    subject: string,
             subject identifier
    unique_contrasts: list of strings,
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
    for contrast in unique_contrasts:
        # Select lines with matching contrast and subject
        mask = (df.contrast == contrast).values * (
            df.subject == subject
        ).values

        # Among selected lines, add "path" of last row to list.
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

    # Load all images
    Xr = np.array(
        [nib.load(texture).darrays[0].data for texture in list(paths_rh)]
    )
    Xl = np.array(
        [nib.load(texture).darrays[0].data for texture in list(paths_lh)]
    )

    # impute Nans by 0
    Xl[np.isnan(Xl)] = 0
    Xr[np.isnan(Xr)] = 0

    return Xl, Xr


def load_fmri(df, subjects, unique_contrasts):
    """
    Load data for a given list of subjects and contrasts.

    Outputs:
    X: array of size (2*n_voxels_hemi * n_subjects, n_contrasts)
    """

    X = np.empty((0, len(unique_contrasts)))

    for subject in subjects:
        X_left, X_right = load_subject_fmri(df, subject, unique_contrasts)
        X = np.append(X, np.concatenate([X_left.T, X_right.T]), axis=0)

    return X


## Init variables and load data if possible
df = pd.DataFrame()
subjects, contrasts, n_contrasts_by_task = [], [], []
n_subjects, n_contrasts = 0, 0
X = np.empty((0, 0))
n_voxels = 0

if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
    ## Load selected subjects and contrasts
    df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)

    subjects, contrasts, n_contrasts_by_task = parse_conditions_db(df)
    n_subjects, n_contrasts = len(subjects), len(contrasts)

    ## Load functional data for all subjects
    print("Loading contrasts...")
    X = load_fmri(df, subjects, contrasts)
    n_voxels = X.shape[0] // n_subjects

# Expose functions for exploring contrasts
@eel.expose
def get_subjects():
    if DEBUG:
        print(f"[{datetime.now()}] get_subjects")
    return subjects.tolist()


@eel.expose
def get_contrast_labels():
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_labels")
    return contrasts.tolist()


@eel.expose
def get_tasks():
    if DEBUG:
        print(f"[{datetime.now()}] get_tasks")
    return n_contrasts_by_task.tolist()


@eel.expose
def get_voxel_fingerprint(subject_index, voxel_index):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_voxel_fingerprint {voxel_index} for {subjects[subject_index]} ({subject_index})"
        )
    return X[n_voxels * subject_index + voxel_index, :].tolist()


@eel.expose
def get_voxel_fingerprint_mean(voxel_index):
    if DEBUG:
        print(f"[{datetime.now()}] get_voxel_mean_fingerprint {voxel_index}")
    mean = np.mean(
        X[
            [
                n_voxels * subject_index + voxel_index
                for subject_index in range(n_subjects)
            ],
            :,
        ],
        axis=0,
    )
    return mean.tolist()


@eel.expose
def get_contrast(subject_index, contrast_index, hemi="both"):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    start_index = n_voxels * subject_index

    if hemi == "left":
        return X[
            start_index : start_index + n_voxels // 2, contrast_index
        ].tolist()
    elif hemi == "right":
        return X[
            start_index + n_voxels // 2 : start_index + n_voxels,
            contrast_index,
        ].tolist()
    elif hemi == "both":
        return X[start_index : start_index + n_voxels, contrast_index].tolist()
    else:
        print(f"Unknown value for hemi: {hemi}")
        return []


@eel.expose
def get_contrast_mean(contrast_index, hemi="both"):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_mean {contrasts[contrast_index]} ({contrast_index})"
        )

    mean = []

    if hemi == "left":
        mean = np.mean(
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
        mean = np.mean(
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
        mean = np.mean(
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

    return mean.tolist()
