from datetime import datetime
import dotenv
import eel
import nibabel as nib
from nilearn.image import load_img
from nilearn.image import resample_img
from nilearn.image import resample_to_img
import numpy as np
import os

import utils.setup as setup

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")
SLICE_DATA_PATH = os.getenv("SLICE_DATA_PATH")

anatomical_img_resampled = np.empty((0))
contrast_img_resampled = np.empty((0))

# Load nifti image
print("Loading nifti image...")

if SLICE_DATA_PATH and os.path.exists(SLICE_DATA_PATH):
    # The commented nifti path is rotated
    # I presume this can be solved with nilearn.image.reorder_img
    # anatomical_nifti = os.path.join(SLICE_DATA_PATH, "anatomical/debby_t1.nii")
    anatomical_nifti = os.path.join(
        SLICE_DATA_PATH, "anatomical/debby141209_gre3d_d004.nii"
    )
    anatomical_img = load_img(anatomical_nifti)
    m = np.max(anatomical_img.shape)
    anatomical_img_resampled = resample_img(
        anatomical_img,
        target_affine=anatomical_img.affine,
        target_shape=(m, m, m),
    )

    contrast_nifti = os.path.join(
        SLICE_DATA_PATH, "functional/debby141209_run02_mm1_d007.nii"
    )
    contrast_img = load_img(contrast_nifti)

    contrast_img_resampled = resample_to_img(
        contrast_img, anatomical_img_resampled
    ).get_fdata()
    anatomical_img_resampled = anatomical_img_resampled.get_fdata()
else:
    print("\tEmpty.")


@eel.expose
def get_contrast_range():
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_shape")
    return [np.min(contrast_img_resampled), np.max(contrast_img_resampled)]


@eel.expose
def get_contrast_shape():
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_shape")
    return list(contrast_img_resampled.shape)


@eel.expose
def get_voxel_timeseries(x, y, z):
    if DEBUG:
        print(f"[{datetime.now()}] get_voxel_timeseries ({x}, {y}, {z})")
    return contrast_img_resampled[x, y, z, :].tolist()


@eel.expose
def get_contrast_sagital(x, t=0):
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_sagital x={x}, t={t}")
    return contrast_img_resampled[x, :, :, t].tolist()


@eel.expose
def get_contrast_coronal(y, t=0):
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_coronal y={y}, t={t}")
    return contrast_img_resampled[:, y, :, t].tolist()


@eel.expose
def get_contrast_horizontal(z, t=0):
    if DEBUG:
        print(f"[{datetime.now()}] get_contrast_horizontal z={z}, t={t}")
    return contrast_img_resampled[:, :, z, t].tolist()


@eel.expose
def get_anatomical_shape():
    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_shape")
    return list(anatomical_img_resampled.shape)


@eel.expose
def get_anatomical_sagital(x):
    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_sagital x={x}")
    return anatomical_img_resampled[x, :, :].tolist()


@eel.expose
def get_anatomical_coronal(y):
    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_coronal y={y}")
        return anatomical_img_resampled[:, y, :].tolist()


@eel.expose
def get_anatomical_horizontal(z):
    if DEBUG:
        print(f"[{datetime.now()}] get_anatomical_horizontal z={z}")
        return anatomical_img_resampled[:, :, z].tolist()
