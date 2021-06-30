from api import app
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import nibabel as nib
import numpy as np
import os
import pandas as pd
from scipy.sparse import coo_matrix, triu
from tqdm import tqdm

import custom_utils.setup as setup
from api.surface_contrasts import parse_conditions_db

# Load environment variables
env = setup.load_env()

DEBUG = os.getenv("DEBUG")

# Load global variables
REACT_APP_CONDITIONS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_CONDITIONS_VIEW"))
)
AVAILABLE_GIFTI_FILES_DB = os.getenv("AVAILABLE_GIFTI_FILES_DB")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
GRADIENTS_DATA_PATH = os.getenv("GRADIENTS_DATA_PATH")


## Util functions
def load_gradients(df, subjects):
    gradients_per_subject = list()
    gradients_averaged_per_subject = list()
    gradients_norm_per_subject = list()

    for subject in subjects:
        gradient = np.load(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                GRADIENTS_DATA_PATH,
                f"gradient_left_{subject}.npy",
            ),
            allow_pickle=True,
        )
        gradients_per_subject.append(gradient)

        gradients_averaged = np.load(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                GRADIENTS_DATA_PATH,
                f"gradient_averaged_left_{subject}.npy",
            ),
            allow_pickle=True,
        )
        gradients_averaged_per_subject.append(gradients_averaged)

        gradients_norm = np.load(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                GRADIENTS_DATA_PATH,
                f"gradient_averaged_norm_left_{subject}.npy",
            ),
            allow_pickle=True,
        )
        gradients_norm_per_subject.append(gradients_norm)

    return (
        gradients_per_subject,
        gradients_averaged_per_subject,
        gradients_norm_per_subject,
    )


# Load gradients
## Init variables and load data if possible
df = pd.DataFrame()
subjects, contrasts = [], []
n_subjects, n_contrasts = 0, 0
n_voxels = 0

if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
    ## Load selected subjects and contrasts
    df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)

    subjects, contrasts = parse_conditions_db(df)
    n_subjects, n_contrasts = len(subjects), len(contrasts)

    ## Load functional data for all subjects
    print(f"Loading {n_contrasts} contrast gradients...", end=" ")
    (
        gradients_per_subject,
        gradients_averaged_per_subject,
        gradients_norm_per_subject,
    ) = load_gradients(
        df,
        # Load gradients for all subjects only in production
        subjects if env == "production" else ["sub-01"],
    )
    print("OK")


@app.route("/contrast_gradient", methods=["GET"])
def get_contrast_gradient():
    """
    Return gradient intensity along edges of the fsaverage mesh.
    Edges are deduplicated. Order of appearence is determined by
    the upper triangular portion of the connectivity matrix.
    """
    subject_index = request.args.get("subject_index", type=int)
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    gradient = gradients_per_subject[subject_index][contrast_index]
    edges = triu(gradient).tocsr()
    edges.sort_indices()

    return jsonify(edges.data)


@app.route("/contrast_gradient_averaged", methods=["GET"])
def get_contrast_gradient_averaged():
    """
    Returns an array of size (n_voxels, 3) which associates each fsaverage voxel i
    with a vector representing the mean of all gradient vectors along edges i -> j.
    """
    subject_index = request.args.get("subject_index", type=int)
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient_averaged {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    gradient = gradients_averaged_per_subject[subject_index][contrast_index]

    return jsonify(gradient)


@app.route("/contrast_gradient_norm", methods=["GET"])
def get_contrast_gradient_norm():
    """
    Returns an array of size (n_voxels) which associates each fsaverage voxel i
    with the norm of the mean of all gradient vectors along edges i -> j.
    """
    subject_index = request.args.get("subject_index", type=int)
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient_norm {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    gradient = gradients_norm_per_subject[subject_index][contrast_index]

    return jsonify(gradient)


@app.route("/contrast_gradient_norm_mean", methods=["GET"])
def get_contrast_gradient_norm_mean():
    contrast_index = request.args.get("contrast_index", type=int)
    hemi = request.args.get("hemi", default="left", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient_norm_mean {contrasts[contrast_index]}, {hemi} hemi"
        )

    gradient = np.nanmean(
        np.vstack(
            [
                gradients_norm_per_subject[subject_index][contrast_index]
                for subject_index in range(n_subjects)
            ]
        ),
        axis=0,
    )

    return jsonify(gradient)
