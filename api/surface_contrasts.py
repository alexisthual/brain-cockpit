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

gifti_files = "/home/alexis/singbrain/data/mathlang_rsvp_fs5_fs7_individual_db"
shapes = {"fsaverage5": 10242, "fsaverage7": 163_842}


## Util functions
def parse_hemi(hemi):
    if hemi == "left":
        return "lh"
    elif hemi == "right":
        return "rh"
    return "lh"


def multiindex_to_nested_dict(df):
    if isinstance(df.index, pd.core.indexes.multi.MultiIndex):
        return dict(
            (k, multiindex_to_nested_dict(df.loc[k]))
            for k in df.index.remove_unused_levels().levels[0]
        )
    else:
        d = dict()
        for idx in df.index:
            d[idx] = df.loc[idx, "path"]
        return d


def load_data(df):
    meshes = df["mesh"].unique().tolist()
    subjects = df["subject"].unique().tolist()
    tasks_contrasts = (
        df.groupby(["task", "contrast"])
        .count()
        .reset_index()
        .sort_values(["task", "contrast"])[["task", "contrast"]]
        .values.tolist()
    )
    sides = df["side"].unique().tolist()

    # Group rows before turning the dataframe into a python dict d
    # such that d[mesh][subject][task][contrast][side]
    # is the path to a gifti file describing this data
    df_grouped = df.groupby(["mesh", "subject", "task", "contrast", "side"])[
        "path"
    ].first()
    paths = multiindex_to_nested_dict(df_grouped.to_frame())

    # Load gifti files
    # and populate missing (mesh, subject, task, contrast, side) tuples
    # with None
    print(f"Loading {len(tasks_contrasts)} contrasts...", end=" ")
    data = dict()
    for mesh in tqdm(meshes):
        dsu = dict()
        for subject in tqdm(subjects):
            dtc = dict()
            for task, contrast in tasks_contrasts:
                dsi = dict()
                for side in ["lh", "rh"]:
                    hemi = "left" if side == "lh" else "right"
                    try:
                        dsi[hemi] = (
                            nib.load(
                                os.path.join(
                                    gifti_files,
                                    paths[mesh][subject][task][contrast][side],
                                )
                            )
                            .darrays[0]
                            .data
                        )
                    except KeyError:
                        dsi[hemi] = None
                if task not in dtc:
                    dtc[task] = dict()
                dtc[task][contrast] = dsi
            dsu[subject] = dtc
        data[mesh] = dsu
    print(f"OK")

    return meshes, subjects, tasks_contrasts, sides, data


def load_contrasts():
    df = pd.DataFrame()
    meshes, subjects, tasks_contrasts, sides = [], [], [], []

    if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
        ## Load selected subjects and contrasts
        df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)
        meshes, subjects, tasks_contrasts, sides, data = load_data(df)

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc
    @app.route("/subjects", methods=["GET"])
    def get_subjects():
        return jsonify(subjects)

    @app.route("/contrast_labels", methods=["GET"])
    def get_contrast_labels():
        return jsonify(tasks_contrasts)

    @app.route("/mesh/<path:path>", methods=["GET"])
    def get_mesh(path):
        return send_from_directory(MESH_PATH, path)

    @app.route("/voxel_fingerprint", methods=["GET"])
    def get_voxel_fingerprint():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)

        subject = subjects[subject_index]
        # Deduce hemi from voxel index
        n_voxels_left_hemi = shapes[mesh]
        hemi = "left"
        ## If voxel_index is in the right hemisphere,
        ## update values of hemi and voxel_index
        if voxel_index >= n_voxels_left_hemi:
            voxel_index -= n_voxels_left_hemi
            hemi = "right"

        fingerprint = [
            data[mesh][subject][task][contrast][hemi][voxel_index]
            if data[mesh][subject][task][contrast][hemi] is not None
            else None
            for task, contrast in tasks_contrasts
        ]

        return jsonify(fingerprint)

    @app.route("/voxel_fingerprint_mean", methods=["GET"])
    def get_voxel_fingerprint_mean():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        voxel_index = request.args.get("voxel_index", type=int)

        # Deduce hemi from voxel index
        n_voxels_left_hemi = shapes[mesh]
        hemi = "left"
        ## If voxel_index is in the right hemisphere,
        ## update values of hemi and voxel_index
        if voxel_index >= n_voxels_left_hemi:
            voxel_index -= n_voxels_left_hemi
            hemi = "right"

        mean = np.nanmean(
            np.concatenate(
                [
                    np.array(
                        [
                            data[mesh][subject][task][contrast][hemi][
                                voxel_index
                            ]
                            if data[mesh][subject][task][contrast][hemi]
                            is not None
                            else None
                            for task, contrast in tasks_contrasts
                        ]
                    )
                    for subject in subjects
                ]
            ),
            axis=0,
        )

        return jsonify(mean)

    @app.route("/contrast", methods=["GET"])
    def get_contrast():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        subject_index = request.args.get("subject_index", type=int)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        subject = subjects[subject_index]
        task, contrast = tasks_contrasts[contrast_index]

        if hemi == "left" or hemi == "right":
            return jsonify(data[mesh][subject][task][contrast][hemi])
        elif hemi == "both":
            return jsonify(
                np.concatenate(
                    [
                        data[mesh][subject][task][contrast]["left"],
                        data[mesh][subject][task][contrast]["right"],
                    ]
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])

    @app.route("/contrast_mean", methods=["GET"])
    def get_contrast_mean():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        task, contrast = tasks_contrasts[contrast_index]
        if hemi == "left" or hemi == "right":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        [
                            data[mesh][subject][task][contrast][hemi]
                            for subject in subjects
                        ]
                    ),
                    axis=0,
                )
            )
        elif hemi == "both":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        [
                            np.concatenate(
                                [
                                    data[mesh][subject][task][contrast][
                                        "left"
                                    ],
                                    data[mesh][subject][task][contrast][
                                        "right"
                                    ],
                                ]
                            )
                            for subject in subjects
                        ]
                    ),
                    axis=0,
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])
