from distutils.util import strtobool
import dotenv
from flask import jsonify, request, send_from_directory
import json
import nibabel as nib
import numpy as np
import os
import pandas as pd
import pickle
import sys
from tqdm import tqdm

from api import app
from api.surface_contrasts import load_data, parse_metadata
import custom_utils.setup as setup

from fugw import FUGW
from msm.model import MSM

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_ALIGNMENTS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_ALIGNMENTS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")
MESH_PATH = os.getenv("MESH_PATH")

mesh_shape = {
    "fsaverage5": {"left": 10242, "right": 10242},
    "fsaverage7": {"left": 163_842, "right": 163_842},
    "individual": {},
}

MODEL_CLASSES = ["FUGW", "MSM"]
AVAILABLE_MODELS = {
    "fugw test": {
        "model": "FUGW",
        "path": "/home/alexis/singbrain/outputs/_058_test_alignment_classes/sub-07_sub-09_fugw.pkl",
    },
    "msm test": {
        "model": "MSM",
        "path": "/home/alexis/singbrain/outputs/_058_test_alignment_classes/sub-07_sub-09_msm.pkl",
    },
}


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def load_alignments():
    df = pd.DataFrame()
    meshes, subjects, tasks_contrasts, sides = [], [], [], []

    if REACT_APP_ALIGNMENTS_VIEW:
        ## Load all available contrasts
        df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)
        meshes, subjects, tasks_contrasts, sides = parse_metadata(df)
        data = load_data(df)

        # ROUTES
        # Define a series of enpoints to expose contrasts, meshes, etc

        @app.route("/alignments/models", methods=["GET"])
        def get_models():
            return jsonify(list(AVAILABLE_MODELS.keys()))

        @app.route("/alignments/single_voxel", methods=["GET"])
        def align_single_voxel():
            # source = request.args.get("source", type=int)
            # target = request.args.get("target", type=int)
            hemi = request.args.get("hemi", type=str, default="left")
            mesh = request.args.get("mesh", type=str, default="fsaverage5")
            voxel = request.args.get("voxel", type=int)
            # role = request.args.get("role", type=str, default="source")
            model_name = request.args.get("model")

            if model_name in AVAILABLE_MODELS:
                with open(AVAILABLE_MODELS[model_name]["path"], "rb") as f:
                    model = pickle.load(f)

            input_map = np.zeros(mesh_shape[mesh][hemi])
            input_map[voxel] = 1
            m = model.transform(input_map)

            return jsonify(m)

        @app.route("/alignments/contrast", methods=["GET"])
        def align_contrast():
            source = request.args.get("source", type=int)
            # target = request.args.get("target", type=int)
            hemi = request.args.get("hemi", type=str, default="left")
            mesh = request.args.get("mesh", type=str, default="fsaverage5")
            contrast_index = request.args.get("contrast", type=int)
            role = request.args.get("role", type=str, default="source")
            model_name = request.args.get("model")

            if model_name in AVAILABLE_MODELS:
                with open(AVAILABLE_MODELS[model_name]["path"], "rb") as f:
                    model = pickle.load(f)

            if role == "source":
                # TODO
                # task, contrast = tasks_contrasts[contrast_index]
                # input_map = data[mesh][subjects[target]][task][contrast][hemi]
                # m = model.inverse_transform(input_map)
                m = None
            elif role == "target":
                task, contrast = tasks_contrasts[contrast_index]
                input_map = data[mesh][subjects[source]][task][contrast][hemi]
                m = model.transform(input_map)

            return jsonify(m)
