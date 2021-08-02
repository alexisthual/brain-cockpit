from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import nibabel as nib
import numpy as np
import os
import pandas as pd
from scipy.sparse import coo_matrix, triu
import sys
from tqdm import tqdm

from api import app
from api.surface_contrasts import parse_metadata
import custom_utils.setup as setup

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


# UTIL FUNCTIONS


def load_data(meshes, subjects, tasks_contrasts, sides):
    print(f"Loading {len(tasks_contrasts)} gradients...")
    data = dict()
    for mesh in tqdm(meshes, file=sys.stdout, position=1):
        gsu = dict()  # gradients per subject
        for subject in tqdm(subjects, file=sys.stdout, position=0):
            gtc = dict()  # gradients per task, contrast
            for task, contrast in tasks_contrasts:
                gsi = dict()  # gradients per side
                for side in sides:
                    hemi = "left" if side == "lh" else "right"
                    gradient_path = os.path.join(
                        EXPERIMENT_DATA_PATH,
                        GRADIENTS_DATA_PATH,
                        f"{mesh}_{subject}_{task}_{contrast}_{hemi}.npy",
                    )
                    if os.path.exists(gradient_path):
                        gsi[hemi] = np.load(gradient_path)
                    else:
                        gsi[hemi] = None
                if task not in gtc:
                    gtc[task] = dict()
                gtc[task][contrast] = gsi
            gsu[subject] = gtc
        data[mesh] = gsu
    print(f"OK")

    return data


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri previously computed contrasts'gradients
# and exposes flask endpoints.


def load_gradients():
    df = pd.DataFrame()
    meshes, subjects, tasks_contrasts, sides = [], [], [], []

    if REACT_APP_CONDITIONS_VIEW and os.path.exists(AVAILABLE_GIFTI_FILES_DB):
        # Load all available contrasts
        df = pd.read_csv(AVAILABLE_GIFTI_FILES_DB)
        meshes, subjects, tasks_contrasts, sides = parse_metadata(df)
        data = load_data(meshes, subjects, tasks_contrasts, sides)
        print(GRADIENTS_DATA_PATH)

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc

    @app.route("/contrast_gradient", methods=["GET"])
    def get_contrast_gradient():
        """
        Return (n, 3) gradient map computed in each vertex of a given mesh.
        """
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        subject_index = request.args.get("subject_index", type=int)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        subject = subjects[subject_index]
        task, contrast = tasks_contrasts[contrast_index]

        if hemi == "left" or hemi == "right":
            return jsonify(data[mesh][subject][task][contrast][hemi])
        elif hemi == "both":
            return jsonify(
                np.concatenate(
                    [
                        data[mesh][subject][task][contrast]["left"],
                        data[mesh][subject][task][contrast]["right"],
                    ]
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])

    @app.route("/contrast_gradient_norm", methods=["GET"])
    def get_contrast_gradient_norm():
        """
        Returns norm of gradient.
        Returns an array of size (n_voxels) which associates each fsaverage voxel i
        with the norm of the mean of all gradient vectors along edges i -> j.
        """
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        subject_index = request.args.get("subject_index", type=int)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        subject = subjects[subject_index]
        task, contrast = tasks_contrasts[contrast_index]

        if hemi == "left" or hemi == "right":
            print("here")
            print(mesh, subject, task, contrast, hemi)
            print(data[mesh][subject][task][contrast][hemi] is None)
            gradient = data[mesh][subject][task][contrast][hemi]
            if gradient is not None:
                print(np.linalg.norm(gradient, axis=1).shape)
                return jsonify(np.linalg.norm(gradient, axis=1))
            else:
                return jsonify([])
        elif hemi == "both":
            return jsonify(
                np.linalg.norm(
                    np.concatenate(
                        [
                            data[mesh][subject][task][contrast]["left"],
                            data[mesh][subject][task][contrast]["right"],
                        ]
                    ),
                    axis=1,
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])

    # @app.route("/contrast_gradient_norm_mean", methods=["GET"])
    # def get_contrast_gradient_norm_mean():
    #     contrast_index = request.args.get("contrast_index", type=int)
    #     hemi = request.args.get("hemi", default="left", type=str)
    #
    #     if DEBUG:
    #         print(
    #             f"[{datetime.now()}] get_contrast_gradient_norm_mean {contrasts[contrast_index]}, {hemi} hemi"
    #         )
    #
    #     gradient = np.nanmean(
    #         np.vstack(
    #             [
    #                 gradients_norm_per_subject[subject_index][contrast_index]
    #                 for subject_index in range(n_subjects)
    #             ]
    #         ),
    #         axis=0,
    #     )
    #
    #     return jsonify(gradient)
