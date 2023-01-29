from api import app
import bc_utils.setup as setup
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
REACT_APP_EXPERIMENT_KNN_VIEW = bool(
    strtobool(os.getenv("REACT_APP_EXPERIMENT_KNN_VIEW"))
)
EXPERIMENT_KNN_FOLDER = os.getenv("EXPERIMENT_KNN_FOLDER")

subjects = [
    "sub-01",
    "sub-04",
    "sub-05",
    "sub-06",
    "sub-07",
    "sub-09",
    "sub-11",
    "sub-12",
    "sub-13",
    "sub-14",
    "sub-15",
]

# fsaverage5 number of voxels (counting both hemispheres)
n_voxels = 20484


def load_knn():
    # Load knn results
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

    # ROUTES
    # Define a series of enpoiints to expose correlation maps

    @app.route("/knn", methods=["GET"])
    def get_knn():
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_knn for subject {subjects[subject_index]}, voxel {voxel_index}"
            )

        return jsonify((knn[subjects[subject_index]][voxel_index, :]))

    @app.route("/knn_all_subjects", methods=["GET"])
    def get_knn_all_subjects():
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_knn_all_subjects for voxel {voxel_index}"
            )

        return jsonify([knn[subject][voxel_index, 0] for subject in subjects])

    @app.route("/knn_distance", methods=["GET"])
    def get_knn_distance():
        subject_index = request.args.get("subject_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_knn_distance for subject {subjects[subject_index]}"
            )

        return jsonify((distances[subject_index, : n_voxels // 2, 0]))

    @app.route("/knn_distance_mean", methods=["GET"])
    def get_knn_distance_mean():
        if DEBUG:
            print(f"[{datetime.now()}] get_knn_distance_mean")

        return jsonify(np.mean(distances[:, : n_voxels // 2, 0], axis=0))
