from distutils.util import strtobool
import dotenv
from flask import jsonify, request, send_from_directory
import json
import nibabel as nib
import numpy as np
import os
import pandas as pd
from pathlib import Path
import pickle
import sys
from tqdm import tqdm

from api import app
from api.surface_contrasts import load_data, parse_metadata
import custom_utils.setup as setup

from fugw.fugw import FUGW
from msm.model import MSM

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_ALIGNMENTS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_ALIGNMENTS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")
MESH_PATH = os.getenv("MESH_PATH")
INDIVIDUAL_CLUSTERIZATION_PATH = Path(
    "/home/alexis/singbrain/outputs/" "_078_ibc_individual_clusterization"
)

mesh_support = "individual"
training_dataset = "allbutmathlanghcp"
should_normalize = True
n_clusters = 10000

mesh_shape = {
    "fsaverage5": {"left": 10242, "right": 10242},
    "fsaverage7": {"left": 163_842, "right": 163_842},
    "individual": {},
}

MODEL_CLASSES = ["FUGW", "MSM"]
AVAILABLE_MODELS = {
    "fugw test": {
        "model": "FUGW",
        "mesh_support": "fsaverage5",
        "path": "/home/alexis/singbrain/outputs/_058_test_alignment_classes/sub-07_sub-09_fugw.pkl",
    },
    "msm test": {
        "model": "MSM",
        "mesh_support": "fsaverage5",
        "path": "/home/alexis/singbrain/outputs/_058_test_alignment_classes/sub-07_sub-09_msm.pkl",
    },
    "fugw individual epsilon 1e-4": {
        "model": "fugw",
        "mesh_support": "individual",
        "source_subject": "sub-07",
        "target_subject": "sub-09",
        "path": "/home/alexis/singbrain/outputs/_080_individual_fugw_ibc/models/sub-07_sub-09_individual_left_fugw_alpha-0.1_eps-0.0001_mode-independent_rho-[1, 1, 0, 0]_verbose-False.pkl",
    },
    "fugw individual epsilon 1e-3": {
        "model": "fugw",
        "mesh_support": "individual",
        "source_subject": "sub-07",
        "target_subject": "sub-09",
        "path": "/home/alexis/singbrain/outputs/_080_individual_fugw_ibc/models/sub-07_sub-09_individual_left_fugw_alpha-0.1_eps-0.001_mode-independent_rho-[1, 1, 0, 0]_verbose-False.pkl",
    },
}


# UTIL FUNCTIONS
def project_to_cluster(surface_map, clusters):
    clusterized_func = np.array(
        [
            np.mean(surface_map[np.argwhere(clusters == i).flatten()], axis=0)
            for i in np.unique(clusters)
        ]
    )

    return clusterized_func


def project_to_individual(surface_map, clusters):
    individual_func = surface_map[clusters]

    return individual_func


# %%
def load_subject_clusterization(subject, hemi):
    selected_mesh_name = f"individual_{subject}"
    params_str = (
        f"nclusters-{n_clusters}_{selected_mesh_name}_"
        f"{training_dataset}_{hemi}"
    )

    # Load clusters
    clusters = np.load(
        os.path.join(
            INDIVIDUAL_CLUSTERIZATION_PATH, f"clusters_{params_str}.npy"
        )
    )

    return clusters


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
            # return jsonify(list(AVAILABLE_MODELS.keys()))
            return jsonify(AVAILABLE_MODELS)

        @app.route("/alignments/single_voxel", methods=["GET"])
        def align_single_voxel():
            # source = request.args.get("source", type=int)
            # target = request.args.get("target", type=int)
            hemi = request.args.get("hemi", type=str, default="left")
            mesh = request.args.get("mesh", type=str, default="fsaverage5")
            voxel = request.args.get("voxel", type=int)
            # role = request.args.get("role", type=str, default="source")
            model_name = request.args.get("model")

            print(f"single voxel {model_name}")

            m = None
            if model_name in AVAILABLE_MODELS:
                with open(AVAILABLE_MODELS[model_name]["path"], "rb") as f:
                    model = pickle.load(f)

                if (
                    AVAILABLE_MODELS[model_name]["mesh_support"]
                    == "individual"
                ):
                    # Load clusteizations
                    source_subject = AVAILABLE_MODELS[model_name][
                        "source_subject"
                    ]
                    target_subject = AVAILABLE_MODELS[model_name][
                        "target_subject"
                    ]
                    source_clusters = load_subject_clusterization(
                        source_subject, hemi
                    )
                    target_clusters = load_subject_clusterization(
                        target_subject, hemi
                    )
                    # Project source cluster to target
                    input_map = np.zeros(np.max(source_clusters) + 1)
                    input_map[source_clusters[voxel]] = 1
                    m_clusterized = model.transform(input_map)
                    m = project_to_individual(m_clusterized, target_clusters)
                else:
                    input_map = np.zeros(mesh_shape[mesh][hemi])
                    input_map[voxel] = 1
                    m = model.transform(input_map)

            return jsonify(m)

        @app.route("/alignments/contrast", methods=["GET"])
        def align_contrast():
            source = request.args.get("source", type=int)
            # target = request.args.get("target", type=int)
            hemi = request.args.get("hemi", type=str, default="left")
            # mesh = request.args.get("mesh", type=str, default="fsaverage5")
            contrast_index = request.args.get("contrast", type=int)
            role = request.args.get("role", type=str, default="source")
            model_name = request.args.get("model")

            m = None
            if model_name in AVAILABLE_MODELS:
                with open(AVAILABLE_MODELS[model_name]["path"], "rb") as f:
                    model = pickle.load(f)
                mesh_support = AVAILABLE_MODELS[model_name]["mesh_support"]

                if role == "source":
                    # TODO
                    # task, contrast = tasks_contrasts[contrast_index]
                    # input_map = data[mesh][subjects[target]][task][contrast][hemi]
                    # m = model.inverse_transform(input_map)
                    m = None
                elif role == "target":
                    task, contrast = tasks_contrasts[contrast_index]
                    input_map = data[mesh_support][subjects[source]][task][
                        contrast
                    ][hemi]
                    if mesh_support == "individual":
                        source_subject = AVAILABLE_MODELS[model_name][
                            "source_subject"
                        ]
                        target_subject = AVAILABLE_MODELS[model_name][
                            "target_subject"
                        ]
                        source_clusters = load_subject_clusterization(
                            source_subject, hemi
                        )
                        target_clusters = load_subject_clusterization(
                            target_subject, hemi
                        )
                        input_map_clusterized = project_to_cluster(
                            input_map, source_clusters
                        )
                        m_clusterized = model.transform(input_map_clusterized)
                        m = project_to_individual(
                            m_clusterized, target_clusters
                        )
                    else:
                        m = model.transform(input_map)

            return jsonify(m)
