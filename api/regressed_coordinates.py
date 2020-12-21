from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

from api.surface_contrasts import subjects
import utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
EXPERIMENT_REGRESSION = bool(strtobool(os.getenv("EXPERIMENT_REGRESSION")))
EXPERIMENT_REGRESSION_FOLDER = os.getenv("EXPERIMENT_REGRESSION_FOLDER")
EXPERIMENT_REGRESSION_MODEL = os.getenv("EXPERIMENT_REGRESSION_MODEL")

## Load regressed coordinates
regressed_coordinates = {}
if (
    EXPERIMENT_REGRESSION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading regressed coordinates...")
    for subject in subjects:
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                EXPERIMENT_REGRESSION_FOLDER,
                f"prediction_{EXPERIMENT_REGRESSION_MODEL}_subject_{subject}.npy",
            ),
            "rb",
        ) as f:
            regressed_coordinates[subject] = np.load(f)


@eel.expose
def get_regressed_coordinates(subject, voxel_index):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_regressed_coordinates for voxel {voxel_index} for subject {subject}"
        )
    return (regressed_coordinates[subject][voxel_index, :]).tolist()


## Load regressed coordinates error map
regressed_coordinates_error = {}
if (
    EXPERIMENT_REGRESSION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading regression error map...")
    for subject in subjects:
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                EXPERIMENT_REGRESSION_FOLDER,
                f"error_{EXPERIMENT_REGRESSION_MODEL}_subject_{subject}.npy",
            ),
            "rb",
        ) as f:
            regressed_coordinates_error[subject] = np.load(f)


@eel.expose
def get_regressed_coordinates_error(subject):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_regressed_coordinates_error for subject {subject}"
        )
    return regressed_coordinates_error[subject].tolist()
