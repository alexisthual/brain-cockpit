from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import numpy as np
import os
import pandas as pd
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
EXPERIMENT_CORRELATION = bool(strtobool(os.getenv("EXPERIMENT_CORRELATION")))

# Functional distance vs topographical distance experiment
metric = "cosine"
d_max = 40

## Load correlation maps
distance_maps = []
if (
    EXPERIMENT_CORRELATION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading correlation maps...")
    for subject in tqdm(subjects):
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                f"011_mean_m_distance_correlation_map.py/pairwise_{metric}_{subject}.npy",
            ),
            "rb",
        ) as f:
            distance_maps.append(np.load(f))

    distance_maps = np.stack(distance_maps)
    mean_distance_map = np.mean(distance_maps, axis=0)


@eel.expose
def get_distance_map(subject_index, voxel_index):
    """Exports array of shape n_voxels * n_voxels"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_distance_map for voxel {voxel_index} for {subjects[subject_index]}"
        )

    return distance_maps[subject_index][voxel_index, :].tolist()


@eel.expose
def get_mean_distance_map(voxel_index):
    """Exports array of shape n_voxels * n_voxels"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_mean_distance_map for voxel {voxel_index}"
        )

    return mean_distance_map[voxel_index, :].tolist()


@eel.expose
def get_topographic_distance_to_m_functional_distance(subject_index, m):
    """Exports array of shape n_voxels"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_topographic_distance_to_m_functional_distance at distance {m} for {subjects[subject_index]}"
        )
    surface_map = np.min(
        np.where(
            mean_functional_distances[subject_index] >= m,
            np.arange(d_max),
            np.inf,
        ),
        axis=1,
    )

    return surface_map.tolist()


@eel.expose
def get_mean_topographic_distance_to_m_functional_distance(m):
    """Exports array of shape n_voxels"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_mean_topographic_distance_to_m_functional_distance at distance {m}"
        )
    surface_maps = [
        np.min(
            np.where(
                mean_functional_distances[subject_index] >= m,
                np.arange(d_max),
                np.inf,
            ),
            axis=1,
        )
        for subject_index in range(len(subjects))
    ]
    mean = np.mean(np.stack(surface_maps), axis=0)

    return mean.tolist()


## Load functional distance means
mean_functional_distances = []
if (
    EXPERIMENT_CORRELATION
    and EXPERIMENT_DATA_PATH is not None
    and os.path.exists(EXPERIMENT_DATA_PATH)
):
    print("Loading mean functional distances...")
    for subject in tqdm(subjects):
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                f"011_mean_m_distance_correlation_map.py/mean_functional_distance_{metric}_{subject}.npy",
            ),
            "rb",
        ) as f:
            mean_functional_distances.append(np.load(f))

    mean_functional_distances = np.stack(mean_functional_distances)
    mean_across_subjects_mean_function_distances = np.mean(
        mean_functional_distances, axis=0
    )


@eel.expose
def get_mean_functional_distance(subject_index, voxel_index):
    """Exports array of shape d_max"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_mean_functional_distance for voxel {voxel_index} for {subjects[subject_index]}"
        )

    return mean_functional_distances[subject_index][voxel_index, :].tolist()


@eel.expose
def get_mean_across_subjects_mean_functional_distance(voxel_index):
    """Exports array of shape d_max"""

    if DEBUG:
        print(
            f"[{datetime.now()}] get_mean_across_subjects_mean_functional_distance for voxel {voxel_index}"
        )

    return mean_across_subjects_mean_function_distances[
        voxel_index, :
    ].tolist()
