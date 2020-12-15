import dotenv
import eel
import numpy as np
import os
import pandas as pd

from distutils.util import strtobool
from tqdm import tqdm

from api.surface_contrasts import subjects


# Load environment variables
dotenv.load_dotenv()
if os.path.exists(".env.development"):
    dotenv.load_dotenv(dotenv_path=".env.development", override=True)
if os.path.exists(".env.production"):
    dotenv.load_dotenv(dotenv_path=".env.production", override=True)
if os.path.exists(".env.development.local"):
    dotenv.load_dotenv(dotenv_path=".env.development.local", override=True)
if os.path.exists(".env.production.local"):
    dotenv.load_dotenv(dotenv_path=".env.production.local", override=True)

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
EXPERIMENT_REGRESSION = bool(strtobool(os.getenv("EXPERIMENT_REGRESSION")))

## Load regressed coordinates
regressed_coordinates = None
if (
    EXPERIMENT_REGRESSION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading regressed coordinates...")
    with open(
        os.path.join(
            EXPERIMENT_DATA_PATH,
            "008_position_regression_from_fmri.py/prediction_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
        ),
        "rb",
    ) as f:
        regressed_coordinates = np.load(f)


@eel.expose
def get_regressed_coordinates(voxel_index):
    if DEBUG:
        print(
            f"get_regressed_coordinates for voxel {voxel_index} for subject {subjects[-1]}"
        )
    return (regressed_coordinates[voxel_index, :]).tolist()


## Load regressed coordinates error map
regressed_coordinates_error = None
if (
    EXPERIMENT_REGRESSION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading regression error map...")
    with open(
        os.path.join(
            EXPERIMENT_DATA_PATH,
            "008_position_regression_from_fmri.py/error_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
        ),
        "rb",
    ) as f:
        regressed_coordinates_error = np.load(f)


@eel.expose
def get_regressed_coordinates_error():
    if DEBUG:
        print(f"get_regressed_coordinates_error")
    return regressed_coordinates_error.tolist()
