from api import app
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

from api.surface_contrasts import subjects
import custom_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
REACT_APP_EXPERIMENT_REGRESSION_VIEW = bool(
    strtobool(os.getenv("REACT_APP_EXPERIMENT_REGRESSION_VIEW"))
)
EXPERIMENT_REGRESSION_FOLDER = os.getenv("EXPERIMENT_REGRESSION_FOLDER")

MODELS = [
    "linear_svr",
    "nystroem_n_components_500",
    "nystroem_n_components_5000",
]


def load_regressed_coordinates():
    ## Load regressed coordinates
    regressed_coordinates = {}
    if (
        REACT_APP_EXPERIMENT_REGRESSION_VIEW
        and EXPERIMENT_DATA_PATH is not None
        and os.path.exists(EXPERIMENT_DATA_PATH)
    ):
        print("Loading regressed coordinates...")
        for model in MODELS:
            coordinates = {}
            for subject in subjects:
                with open(
                    os.path.join(
                        EXPERIMENT_DATA_PATH,
                        EXPERIMENT_REGRESSION_FOLDER,
                        f"prediction_{model}_subject_{subject}.npy",
                    ),
                    "rb",
                ) as f:
                    coordinates[subject] = np.load(f)
            regressed_coordinates[model] = coordinates

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc

    @app.route("/regression_models", methods=["GET"])
    def get_regression_models():
        if DEBUG:
            print(f"[{datetime.now()}] get_regression_models")

        return jsonify(MODELS)

    @app.route("/regressed_coordinates", methods=["GET"])
    def get_regressed_coordinates():
        model = request.args.get("model", type=str)
        subject = request.args.get("subject", type=str)
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_regressed_coordinates for model {model}, subject {subject}, voxel {voxel_index}"
            )

        return jsonify(regressed_coordinates[model][subject][voxel_index, :])

    ## Load regressed coordinates error map
    regressed_coordinates_error = {}
    if (
        REACT_APP_EXPERIMENT_REGRESSION_VIEW
        and EXPERIMENT_DATA_PATH is not None
        and os.path.exists(EXPERIMENT_DATA_PATH)
    ):
        print("Loading regression error map...")
        for model in MODELS:
            error = {}
            for subject in subjects:
                with open(
                    os.path.join(
                        EXPERIMENT_DATA_PATH,
                        EXPERIMENT_REGRESSION_FOLDER,
                        f"error_{model}_subject_{subject}.npy",
                    ),
                    "rb",
                ) as f:
                    error[subject] = np.load(f)
            regressed_coordinates_error[model] = error

    @app.route("/regressed_coordinates_error", methods=["GET"])
    def get_regressed_coordinates_error():
        model = request.args.get("model", type=str)
        subject = request.args.get("subject", type=str)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_regressed_coordinates_error for model {model}, subject {subject}"
            )
        return jsonify(regressed_coordinates_error[model][subject])
