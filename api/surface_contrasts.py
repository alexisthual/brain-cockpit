from distutils.util import strtobool
import dotenv
from flask import jsonify, request, send_from_directory
from joblib import Memory
import json
import nibabel as nib
import numpy as np
import os
import pandas as pd
import sys
from tqdm import tqdm

from api import app
import custom_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_CONDITIONS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_CONDITIONS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")
DATA_DESCRIPTION_FILE_PATH = os.getenv("DATA_DESCRIPTION_FILE_PATH")
MESH_PATH = os.getenv("MESH_PATH")

BC_TMPDIR = os.getenv("BC_TMPDIR") if os.getenv("BC_TMPDIR") else "/tmp"
memory = Memory(BC_TMPDIR, verbose=0)

mesh_shape = {
    "fsaverage5": {"left": 10242, "right": 10242},
    "fsaverage7": {"left": 163_842, "right": 163_842},
    "individual": {},
}


# UTIL FUNCTIONS
# These functions are useful for loading data


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


def parse_metadata(df):
    """
    Inputs:
    - df: DataFrame,
          each row contains information about an available gifti image one will load here

    Outputs:
    - meshes: list of strings,
              list of all unique meshes encountered during loading
    - subjects: list of strings
                list of all unique subjects encountered during loading
    - tasks_contrasts: list of (task, contrast)
                       list of all unique tuples (task, contrast) encountered during loading
    - sides: list of strings,
             list of all unique sides encountered during loading
    """
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

    return meshes, subjects, tasks_contrasts, sides


@memory.cache
def load_data(df):
    """
    Inputs:
    - df: DataFrame,
          each row contains information about an available gifti image one will load here

    Outputs:
    - data: dictionary d such that d[mesh][subject][task][contrast][side] is
            either a numpy array or None
    """
    meshes, subjects, tasks_contrasts, sides = parse_metadata(df)

    # Group rows before turning the dataframe into a python dict d
    # such that d[mesh][subject][task][contrast][side]
    # is the path to a gifti file describing this data
    df_grouped = df.groupby(["mesh", "subject", "task", "contrast", "side"])[
        "path"
    ].first()
    paths = multiindex_to_nested_dict(df_grouped.to_frame())

    # Load available meshes and store shapes
    for subject in subjects:
        mesh_shape["individual"][subject] = {}
        for hemi in ["left", "right"]:
            with open(
                f"./api/public/meshes/individual/{subject}/pial_{hemi}.gltf",
                "r",
            ) as f:
                individual_mesh_meta = json.load(f)
            mesh_shape["individual"][subject][hemi] = individual_mesh_meta[
                "accessors"
            ][0]["count"]

    # Load gifti files
    # and populate missing (mesh, subject, task, contrast, side) tuples
    # with None
    print(f"Loading {len(tasks_contrasts)} contrasts...")
    data = dict()
    for mesh in tqdm(meshes, file=sys.stdout, position=0):
        dsu = dict()
        for subject in tqdm(subjects, file=sys.stdout, position=1):
            dtc = dict()
            for task, contrast in tasks_contrasts:
                dsi = dict()
                for side in ["lh", "rh"]:
                    hemi = "left" if side == "lh" else "right"
                    try:
                        # Try following absolute path read from db...
                        if os.path.exists(
                            paths[mesh][subject][task][contrast][side]
                        ):
                            dsi[hemi] = (
                                nib.load(
                                    paths[mesh][subject][task][contrast][side]
                                )
                                .darrays[0]
                                .data
                            )
                        # or try relative path from where the db is located
                        elif os.path.exists(
                            os.path.join(
                                os.path.split(AVAILABLE_GIFTI_FILES_DB)[0],
                                paths[mesh][subject][task][contrast][side],
                            )
                        ):
                            dsi[hemi] = (
                                nib.load(
                                    os.path.join(
                                        os.path.split(
                                            AVAILABLE_GIFTI_FILES_DB
                                        )[0],
                                        paths[mesh][subject][task][contrast][
                                            side
                                        ],
                                    )
                                )
                                .darrays[0]
                                .data
                            )
                        else:
                            dsi[hemi] = None
                    except KeyError:
                        dsi[hemi] = None
                if task not in dtc:
                    dtc[task] = dict()
                dtc[task][contrast] = dsi
            dsu[subject] = dtc
        data[mesh] = dsu
    print(f"OK")

    return data


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def load_contrasts():
    df = pd.DataFrame()
    meshes, subjects, tasks_contrasts, sides = [], [], [], []

    if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
        ## Load all available contrasts
        df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)
        meshes, subjects, tasks_contrasts, sides = parse_metadata(df)
        data = load_data(df)

        ## Load individual meshes' dimensions
        for subject in subjects:
            mesh_shape["individual"][subject] = {"left": None, "right": None}

            with open(
                os.path.join(
                    MESH_PATH, "individual", subject, "pial_left.gltf"
                ),
                "r",
            ) as f:
                individual_mesh_meta = json.load(f)
                mesh_shape["individual"][subject][
                    "left"
                ] = individual_mesh_meta["accessors"][0]["count"]

            with open(
                os.path.join(
                    MESH_PATH, "individual", subject, "pial_right.gltf"
                ),
                "r",
            ) as f:
                individual_mesh_meta = json.load(f)
                mesh_shape["individual"][subject][
                    "right"
                ] = individual_mesh_meta["accessors"][0]["count"]

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc

    @app.route("/ibc/subjects", methods=["GET"])
    def get_subjects():
        return jsonify(subjects)

    @app.route("/ibc/contrast_labels", methods=["GET"])
    def get_contrast_labels():
        return jsonify(tasks_contrasts)

    @app.route("/ibc/descriptions", methods=["GET"])
    def get_descriptions():
        with open(DATA_DESCRIPTION_FILE_PATH, "r") as f:
            descriptions = json.load(f)
            return jsonify(descriptions)

    @app.route("/ibc/mesh/<path:path>", methods=["GET"])
    def get_mesh(path):
        return send_from_directory(MESH_PATH, path)

    @app.route("/ibc/voxel_fingerprint", methods=["GET"])
    def get_voxel_fingerprint():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)

        subject = subjects[subject_index]
        # Deduce hemi from voxel index
        n_voxels_left_hemi = (
            mesh_shape[mesh][subject]["left"]
            if mesh == "individual"
            else mesh_shape[mesh]["left"]
        )
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

    @app.route("/ibc/voxel_fingerprint_mean", methods=["GET"])
    def get_voxel_fingerprint_mean():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        voxel_index = request.args.get("voxel_index", type=int)

        # Can't return mean of meshes which are not comparable
        if mesh == "individual":
            return []
        else:
            # Deduce hemi from voxel index
            n_voxels_left_hemi = mesh_shape[mesh]["left"]
            hemi = "left"
            ## If voxel_index is in the right hemisphere,
            ## update values of hemi and voxel_index
            if voxel_index >= n_voxels_left_hemi:
                voxel_index -= n_voxels_left_hemi
                hemi = "right"

            mean = np.nanmean(
                np.vstack(
                    [
                        np.array(
                            [
                                data[mesh][subject][task][contrast][hemi][
                                    voxel_index
                                ]
                                if data[mesh][subject][task][contrast][hemi]
                                is not None
                                else np.nan
                                for task, contrast in tasks_contrasts
                            ]
                        )
                        for subject in subjects
                    ]
                ),
                axis=0,
            )

            return jsonify(mean)

    @app.route("/ibc/contrast", methods=["GET"])
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

    @app.route("/ibc/contrast_mean", methods=["GET"])
    def get_contrast_mean():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        task, contrast = tasks_contrasts[contrast_index]
        if hemi == "left" or hemi == "right":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        # Filter out subjects for whom this contrast map
                        # does not exist
                        list(
                            filter(
                                lambda x: x is not None,
                                [
                                    data[mesh][subject][task][contrast][hemi]
                                    for subject in subjects
                                ],
                            )
                        )
                    ),
                    axis=0,
                )
            )
        elif hemi == "both":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        # Filter out subjects for whom this contrast map
                        # does not exist. Assume that left and right hemispheres
                        # will be missing at the same time
                        list(
                            filter(
                                lambda x: x is not [None, None],
                                [
                                    np.concatenate(
                                        [
                                            data[mesh][subject][task][
                                                contrast
                                            ]["left"],
                                            data[mesh][subject][task][
                                                contrast
                                            ]["right"],
                                        ]
                                    )
                                    for subject in subjects
                                ],
                            )
                        )
                    ),
                    axis=0,
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])
