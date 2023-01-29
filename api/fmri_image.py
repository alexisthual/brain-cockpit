from api import app
from collections import defaultdict
from datetime import datetime
from distutils.util import strtobool
import dotenv
from flask import jsonify, request
import nibabel as nib
from nilearn.image import load_img
import numpy as np
import os
from tqdm import tqdm

import bc_utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
REACT_APP_SLICE_VIEW = bool(strtobool(os.getenv("REACT_APP_SLICE_VIEW")))
SLICE_DATA_PATH = os.getenv("SLICE_DATA_PATH")
if os.path.exists(os.path.join(SLICE_DATA_PATH, "resampled")):
    SLICE_DATA_PATH = os.path.join(SLICE_DATA_PATH, "resampled")

subjects = ["debby", "aliami"]

anatomical_images = {}
functional_images = defaultdict(list)
functional_image_names = defaultdict(list)

# Load nifti image
if REACT_APP_SLICE_VIEW:
    print("Loading nifti image...")
    if SLICE_DATA_PATH and os.path.exists(SLICE_DATA_PATH):
        for subject in tqdm(subjects, desc="subject"):
            # The commented nifti path is rotated
            # I presume this can be solved with nilearn.image.reorder_img
            # anatomical_nifti = os.path.join(SLICE_DATA_PATH, "anatomical/debby_t1.nii")
            subject_data_path = os.path.join(SLICE_DATA_PATH, subject)
            anatomical_nifti = os.listdir(
                os.path.join(subject_data_path, "anatomical")
            )
            if len(anatomical_nifti):
                anatomical_nifti = os.path.join(
                    subject_data_path, "anatomical", anatomical_nifti[0]
                )
            else:
                print(f"Missing anatomical files for subject {subject}")

            anatomical_img = load_img(anatomical_nifti)
            anatomical_images[subject] = anatomical_img.get_fdata()

            for functional_image_name in tqdm(
                os.listdir(os.path.join(subject_data_path, "functional")),
                desc=f"functional image {subject}",
            ):
                functional_nifti = os.path.join(
                    subject_data_path, "functional", functional_image_name
                )

                functional_image_names[subject].append(functional_image_name)
                functional_images[subject].append(
                    load_img(functional_nifti).get_fdata()
                )
    else:
        print(
            "\tPath is undefined or points to a folder which does not exist."
        )


@app.route("/subject_list", methods=["GET"])
def get_subject_list():
    if DEBUG:
        print(f"[{datetime.now()}] get_subject_list")

    return jsonify(subjects)


@app.route("/functional_image_names", methods=["GET"])
def get_functional_image_names():
    subject = request.args.get("subject", type=str)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_images_names for subject {subject}"
        )

    return jsonify(functional_image_names[subject])


@app.route("/functional_range", methods=["GET"])
def get_functional_range():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_range for subject {subject}, image {image}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(
        [
            np.min(functional_images[subject][index]),
            np.max(functional_images[subject][index]),
        ]
    )


@app.route("/functional_shape", methods=["GET"])
def get_functional_shape():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_shape for subject {subject}, image {image}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(list(functional_images[subject][index].shape))


@app.route("/voxel_timeseries", methods=["GET"])
def get_voxel_timeseries():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)
    x = request.args.get("x", type=int)
    y = request.args.get("y", type=int)
    z = request.args.get("z", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_voxel_timeseries ({x}, {y}, {z}) for subject {subject}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(functional_images[subject][index][x, y, z, :])


@app.route("/functional_sagital", methods=["GET"])
def get_functional_sagital():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)
    x = request.args.get("x", type=int)
    t = request.args.get("t", default=0, type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_sagital x={x}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(functional_images[subject][index][x, :, :, t])


@app.route("/functional_coronal", methods=["GET"])
def get_functional_coronal():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)
    y = request.args.get("y", type=int)
    t = request.args.get("t", default=0, type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_coronal y={y}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(functional_images[subject][index][:, y, :, t])


@app.route("/functional_horizontal", methods=["GET"])
def get_functional_horizontal():
    subject = request.args.get("subject", type=str)
    image = request.args.get("image", type=int)
    z = request.args.get("z", type=int)
    t = request.args.get("t", default=0, type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_horizontal z={z}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)

    return jsonify(functional_images[subject][index][:, :, z, t])


@app.route("/anatomical_shape", methods=["GET"])
def get_anatomical_shape():
    subject = request.args.get("subject", type=str)

    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_shape for subject {subject}")

    return jsonify(list(anatomical_images[subject].shape))


@app.route("/anatomical_sagital", methods=["GET"])
def get_anatomical_sagital():
    subject = request.args.get("subject", type=str)
    x = request.args.get("x", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_sagital x={x} for subject {subject}"
        )

    return jsonify(anatomical_images[subject][x, :, :])


@app.route("/get_anatomical_coronal", methods=["GET"])
def get_anatomical_coronal():
    subject = request.args.get("subject", type=str)
    y = request.args.get("y", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_coronal y={y} for subject {subject}"
        )

    return jsonify(anatomical_images[subject][:, y, :])


@app.route("/anatomical_horizontal", methods=["GET"])
def get_anatomical_horizontal():
    subject = request.args.get("subject", type=str)
    z = request.args.get("z", type=int)

    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_horizontal z={z} for subject {subject}"
        )

    return jsonify(anatomical_images[subject][:, :, z])
