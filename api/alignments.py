from distutils.util import strtobool
import dotenv
from flask import jsonify, request, send_from_directory
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
REACT_APP_ALIGNMENTS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_ALIGNMENTS_VIEW"))
)
MESH_PATH = os.getenv("MESH_PATH")

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


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def load_alignments():
    # df = pd.DataFrame()
    # meshes, subjects, tasks_contrasts, sides = [], [], [], []

    if REACT_APP_ALIGNMENTS_VIEW:
        ## Load all available contrasts
        # df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)
        # meshes, subjects, tasks_contrasts, sides = parse_metadata(df)
        # data = load_data(df)
        pass

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc

    models = ["FUGW", "MSM"]

    @app.route("/alignments/models", methods=["GET"])
    def get_models():
        return jsonify(models)

    @app.route("/alignments/alignment", methods=["GET"])
    def get_alignment():
        # source = request.args.get("source", type=int)
        # target = request.args.get("target", type=int)
        hemi = request.args.get("hemi", type=str, default="left")
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        # voxel = request.args.get("voxel", type=int)
        # role = request.args.get("role", type=str, default="source")

        m = np.random.rand(mesh_shape[mesh][hemi])

        return jsonify(m)
