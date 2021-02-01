from api.surface_contrasts import n_voxels
import custom_utils.setup as setup
from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

# Load or set subjects depending on being in dev or prod
if setup.load_arguments().env == "development":
    subjects = ["sub-01"]
else:
    from api.surface_contrasts import subjects

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
REACT_APP_EXPERIMENT_KNN_VIEW = bool(
    strtobool(os.getenv("REACT_APP_EXPERIMENT_KNN_VIEW"))
)
EXPERIMENT_KNN_FOLDER = os.getenv("EXPERIMENT_KNN_FOLDER")

## Load knn results
knn = {}
distances = None
if (
    REACT_APP_EXPERIMENT_KNN_VIEW
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading knn results...")
    distances_list = []

    for subject in subjects:
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                EXPERIMENT_KNN_FOLDER,
                f"neighbors_n_neighbors_10_from_{subject}.npy",
            ),
            "rb",
        ) as f:
            knn[subject] = np.load(f)

        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                EXPERIMENT_KNN_FOLDER,
                f"distances_n_neighbors_10_from_{subject}.npy",
            ),
            "rb",
        ) as f:
            distances_list.append(np.load(f))

    distances = np.stack(distances_list, axis=0)


@eel.expose
def get_knn(subject, voxel_index):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_knn for subject {subjects[subject]}, voxel {voxel_index}"
        )
    return (knn[subjects[subject]][voxel_index, :]).tolist()


@eel.expose
def get_knn_distance(subject):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_knn_distance for subject {subjects[subject]}"
        )
    return (distances[subject, : n_voxels // 2, 0]).tolist()


@eel.expose
def get_knn_distance_mean():
    if DEBUG:
        print(f"[{datetime.now()}] get_knn_distance_mean")
    return (np.mean(distances[:, : n_voxels // 2, 0], axis=0)).tolist()
