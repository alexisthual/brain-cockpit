import dotenv
import eel
import nibabel as nib
from nilearn.image import load_img
from nilearn.image import resample_img
from nilearn.image import resample_to_img
import numpy as np
import os

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

# Load nifti image
print("Loading nifti image...")

# The commented nifti path is rotated
# I presume this can be solved with nilearn.image.reorder_img
# anatomical_nifti = "/home/alexis/singbrain/data/debby_t1.nii"
anatomical_nifti = "/home/alexis/singbrain/data/debby141209_gre3d_d004.nii"
anatomical_img = load_img(anatomical_nifti)
m = np.max(anatomical_img.shape)
anatomical_img_resampled = resample_img(
    anatomical_img, target_affine=anatomical_img.affine, target_shape=(m, m, m)
)

contrast_nifti = "/home/alexis/singbrain/data/debby141209_run02_mm1_d007.nii"
contrast_img = load_img(contrast_nifti)

contrast_img_resampled = resample_to_img(
    contrast_img, anatomical_img_resampled
).get_fdata()
anatomical_img_resampled = anatomical_img_resampled.get_fdata()


@eel.expose
def get_contrast_shape():
    if DEBUG:
        print(f"get_contrast_shape")
    return list(contrast_img_resampled.shape)


@eel.expose
def get_voxel_timeseries(x, y, z):
    if DEBUG:
        print(f"get_voxel_timeseries ({x}, {y}, {z})")
    return contrast_img_resampled[x, y, z, :].tolist()


@eel.expose
def get_contrast_sagital(x, t=0):
    if DEBUG:
        print(f"get_contrast_sagital x={x}, t={t}")
    return contrast_img_resampled[x, :, :, t].tolist()


@eel.expose
def get_contrast_coronal(y, t=0):
    if DEBUG:
        print(f"get_contrast_coronal y={y}, t={t}")
    return contrast_img_resampled[:, y, :, t].tolist()


@eel.expose
def get_contrast_horizontal(z, t=0):
    if DEBUG:
        print(f"get_contrast_horizontal z={z}, t={t}")
    return contrast_img_resampled[:, :, z, t].tolist()


@eel.expose
def get_anatomical_shape():
    if DEBUG:
        print(f"get_anatomical_shape")
    return list(anatomical_img_resampled.shape)


@eel.expose
def get_anatomical_sagital(x):
    if DEBUG:
        print(f"get_anatomical_sagital x={x}")
    return anatomical_img_resampled[x, :, :].tolist()


@eel.expose
def get_anatomical_coronal(y):
    if DEBUG:
        print(f"get_anatomical_coronal y={y}")
        return anatomical_img_resampled[:, y, :].tolist()


@eel.expose
def get_anatomical_horizontal(z):
    if DEBUG:
        print(f"get_anatomical_horizontal z={z}")
        return anatomical_img_resampled[:, :, z].tolist()
