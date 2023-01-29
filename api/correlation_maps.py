from api import app
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import numpy as np
import os
import pandas as pd
from tqdm import tqdm

import bc_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
EXPERIMENT_CORRELATION_FOLDER = os.getenv("EXPERIMENT_CORRELATION_FOLDER")
REACT_APP_EXPERIMENT_CORRELATION_VIEW = bool(
    strtobool(os.getenv("REACT_APP_EXPERIMENT_CORRELATION_VIEW"))
)

# Functional distance vs topographical distance experiment
metric = "cosine"
d_max = 40

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


def load_correlations():
    # Load correlation maps
    distance_maps = []
    if REACT_APP_EXPERIMENT_CORRELATION_VIEW and os.path.exists(
        os.path.join(EXPERIMENT_DATA_PATH, EXPERIMENT_CORRELATION_FOLDER)
    ):
        print("Loading correlation maps...")
        for subject in tqdm(subjects):
            with open(
                os.path.join(
                    EXPERIMENT_DATA_PATH,
                    EXPERIMENT_CORRELATION_FOLDER,
                    f"pairwise_{metric}_{subject}.npy",
                ),
                "rb",
            ) as f:
                distance_maps.append(np.load(f))

        distance_maps = np.stack(distance_maps)
        mean_distance_map = np.mean(distance_maps, axis=0)

    # ROUTES
    # Define a series of enpoiints to expose correlation maps

    @app.route("/distance_map", methods=["GET"])
    def get_distance_map():
        """Exports array of shape n_voxels * n_voxels"""
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_distance_map for voxel {voxel_index} for {subjects[subject_index]}"
            )

        return jsonify(distance_maps[subject_index][voxel_index, :])

    @app.route("/get_mean_distance_map", methods=["GET"])
    def get_mean_distance_map():
        """Exports array of shape n_voxels * n_voxels"""
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_mean_distance_map for voxel {voxel_index}"
            )

        return jsonify(mean_distance_map[voxel_index, :])

    @app.route(
        "/topographic_distance_to_m_functional_distance", methods=["GET"]
    )
    def get_topographic_distance_to_m_functional_distance():
        """Exports array of shape n_voxels"""
        subject_index = request.args.get("subject_index", type=int)
        m = request.args.get("m", type=int)

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

        return jsonify(surface_map)

    @app.route(
        "/mean_topographic_distance_to_m_functional_distance", methods=["GET"]
    )
    def get_mean_topographic_distance_to_m_functional_distance():
        """Exports array of shape n_voxels"""
        m = request.args.get("m", type=int)

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

        return jsonify(mean)

    ## Load functional distance means
    mean_functional_distances = []
    if REACT_APP_EXPERIMENT_CORRELATION_VIEW and os.path.exists(
        os.path.join(EXPERIMENT_DATA_PATH, EXPERIMENT_CORRELATION_FOLDER)
    ):
        print("Loading mean functional distances...")
        for subject in tqdm(subjects):
            with open(
                os.path.join(
                    EXPERIMENT_DATA_PATH,
                    EXPERIMENT_CORRELATION_FOLDER,
                    f"mean_functional_distance_{metric}_{subject}.npy",
                ),
                "rb",
            ) as f:
                mean_functional_distances.append(np.load(f))

        mean_functional_distances = np.stack(mean_functional_distances)
        mean_across_subjects_mean_function_distances = np.mean(
            mean_functional_distances, axis=0
        )

    @app.route("/mean_functional_distance", methods=["GET"])
    def get_mean_functional_distance():
        """Exports array of shape d_max"""
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_mean_functional_distance for voxel {voxel_index} for {subjects[subject_index]}"
            )

        return jsonify(
            mean_functional_distances[subject_index][voxel_index, :]
        )

    @app.route(
        "/mean_across_subjects_mean_functional_distance", methods=["GET"]
    )
    def get_mean_across_subjects_mean_functional_distance():
        """Exports array of shape d_max"""
        voxel_index = request.args.get("voxel_index", type=int)

        if DEBUG:
            print(
                f"[{datetime.now()}] get_mean_across_subjects_mean_functional_distance for voxel {voxel_index}"
            )

        return jsonify(
            mean_across_subjects_mean_function_distances[voxel_index, :]
        )
