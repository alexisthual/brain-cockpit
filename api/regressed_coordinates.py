from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
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
EXPERIMENT_REGRESSION = bool(strtobool(os.getenv("EXPERIMENT_REGRESSION")))
EXPERIMENT_REGRESSION_FOLDER = os.getenv("EXPERIMENT_REGRESSION_FOLDER")

MODELS = [
    "linear_svr",
    "nystroem_n_components_500",
    "nystroem_n_components_5000",
]


@eel.expose
def get_regression_models():
    if DEBUG:
        print(f"[{datetime.now()}] get_regression_models")
    return MODELS


## Load regressed coordinates
regressed_coordinates = {}
if (
    EXPERIMENT_REGRESSION
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


@eel.expose
def get_regressed_coordinates(model, subject, voxel_index):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_regressed_coordinates for model {model}, subject {subject}, voxel {voxel_index}"
        )
    return (regressed_coordinates[model][subject][voxel_index, :]).tolist()


## Load regressed coordinates error map
regressed_coordinates_error = {}
if (
    EXPERIMENT_REGRESSION
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


@eel.expose
def get_regressed_coordinates_error(model, subject):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_regressed_coordinates_error for model {model}, subject {subject}"
        )
    return regressed_coordinates_error[model][subject].tolist()
