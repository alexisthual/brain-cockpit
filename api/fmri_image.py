from collections import defaultdict
from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import nibabel as nib
from nilearn.image import load_img
import numpy as np
import os
from tqdm import tqdm

import custom_utils.setup as setup

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


@eel.expose
def get_subject_list():
    if DEBUG:
        print(f"[{datetime.now()}] get_subject_list")
    return subjects


@eel.expose
def get_functional_image_names(subject):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_images_names for subject {subject}"
        )
    return functional_image_names[subject]


@eel.expose
def get_functional_range(subject, image):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_range for subject {subject}, image {image}"
        )
    index = functional_image_names[subject].index(image)
    return [
        np.min(functional_images[subject][index]),
        np.max(functional_images[subject][index]),
    ]


@eel.expose
def get_functional_shape(subject, image):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_shape for subject {subject}, image {image}"
        )
    index = functional_image_names[subject].index(image)
    return list(functional_images[subject][index].shape)


@eel.expose
def get_voxel_timeseries(subject, image, x, y, z):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_voxel_timeseries ({x}, {y}, {z}) for subject {subject}"
        )
    index = functional_image_names[subject].index(image)
    return functional_images[subject][index][x, y, z, :].tolist()


@eel.expose
def get_functional_sagital(subject, image, x, t=0):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_sagital x={x}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)
    return functional_images[subject][index][x, :, :, t].tolist()


@eel.expose
def get_functional_coronal(subject, image, y, t=0):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_coronal y={y}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)
    return functional_images[subject][index][:, y, :, t].tolist()


@eel.expose
def get_functional_horizontal(subject, image, z, t=0):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_functional_horizontal z={z}, t={t} for subject {subject}"
        )
    index = functional_image_names[subject].index(image)
    return functional_images[subject][index][:, :, z, t].tolist()


@eel.expose
def get_anatomical_shape(subject):
    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_shape for subject {subject}")
    return list(anatomical_images[subject].shape)


@eel.expose
def get_anatomical_sagital(subject, x):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_sagital x={x} for subject {subject}"
        )
    return anatomical_images[subject][x, :, :].tolist()


@eel.expose
def get_anatomical_coronal(subject, y):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_coronal y={y} for subject {subject}"
        )
        return anatomical_images[subject][:, y, :].tolist()


@eel.expose
def get_anatomical_horizontal(subject, z):
    if DEBUG:
        print(
            f"[{datetime.now()}] get_anatomical_horizontal z={z} for subject {subject}"
        )
        return anatomical_images[subject][:, :, z].tolist()
