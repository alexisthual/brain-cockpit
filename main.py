import dotenv
import eel
import nibabel as nib
import numpy as np
import os

from nilearn.datasets import fetch_spm_auditory
from nilearn.image import concat_imgs, mean_img
from nilearn.glm.first_level import FirstLevelModel
import brainsprite_wrapper
import pandas as pd

# Load contrasts
dotenv.load_dotenv()
DATA_PATH = os.getenv("DATA_PATH")
AVAILABLE_CONTRASTS_PATH = os.getenv("AVAILABLE_CONTRASTS_PATH")
DEBUG = os.getenv("DEBUG")


def select_subjects_and_contrasts(
    df, available_contrasts_path=AVAILABLE_CONTRASTS_PATH
):
    """
    Preselects subjects having enough contrasts
    before filtering out contrasts which exists for all these subjects
    and returns all these as python lists.
    """

    df = pd.read_csv(available_contrasts_path)

    grouped_by_subject = df.groupby(["subject"])["contrast"].nunique()
    selected_subjects = grouped_by_subject[
        grouped_by_subject > 100
    ].index.values

    grouped_by_contrast = df.groupby(["contrast", "task"])["subject"].unique()
    grouped_by_contrast = grouped_by_contrast.sort_index(
        level=["task", "contrast"]
    )
    grouped_by_contrast = grouped_by_contrast.reset_index()

    mask = [
        np.array_equal(
            np.intersect1d(subjects, selected_subjects), selected_subjects
        )
        for subjects in grouped_by_contrast.subject
    ]
    selected_contrasts = grouped_by_contrast[mask]
    selected_contrasts = selected_contrasts.reset_index()

    selected_tasks = (
        selected_contrasts.groupby(["task"])["contrast"]
        .nunique()
        .reset_index()
    )

    return (
        selected_subjects,
        selected_contrasts.contrast.values,
        selected_tasks.values,
    )


# Load FMRI data
def load_subject_fmri(df, subject, unique_contrasts):
    """
    Read functional data corresponding to contrast list and provided subject

    Inputs:
    df: Pandas DataFrame,
        Database descriptor
    subject: string,
             subject identifier
    unique_contrasts: list of strings,
                      Contrasts wanted

    Outputs:
    Xl: array of shape (n_vertices, n_contrasts),
        functional data read from left-hemisphere textures
    Xr: array of shape (n_vertices, n_contrasts),
        functional data read from right-hemisphere textures
    """

    paths_lh = []
    paths_rh = []

    for contrast in unique_contrasts:
        mask = (df.contrast == contrast).values * (
            df.subject == subject
        ).values
        paths_lh.append(
            os.path.join(
                DATA_PATH, df.loc[mask].loc[df.side == "lh"].path.values[-1]
            )
        )
        paths_rh.append(
            os.path.join(
                DATA_PATH, df.loc[mask].loc[df.side == "rh"].path.values[-1]
            )
        )

    Xr = np.array(
        [nib.load(texture).darrays[0].data for texture in list(paths_rh)]
    )
    Xl = np.array(
        [nib.load(texture).darrays[0].data for texture in list(paths_lh)]
    )
    # impute Nans by 0
    Xl[np.isnan(Xl)] = 0
    Xr[np.isnan(Xr)] = 0

    return Xl, Xr


def load_fmri(df, subjects, unique_contrasts):
    """
    Load data for a given list of subjects and contrasts.

    Outputs:
    X: array of size (2*n_voxels_hemi * n_subjects, n_contrasts)
    """

    X = np.empty((0, len(unique_contrasts)))

    for subject in subjects:
        X_left, X_right = load_subject_fmri(df, subject, unique_contrasts)
        X = np.append(X, np.concatenate([X_left.T, X_right.T]), axis=0)

    return X


## Load selected subjects and contrasts
df = pd.read_csv(AVAILABLE_CONTRASTS_PATH)
subjects, contrasts, n_contrasts_by_task = select_subjects_and_contrasts(
    df, available_contrasts_path=AVAILABLE_CONTRASTS_PATH
)
n_subjects, n_contrasts = len(subjects), len(contrasts)

## Load functional data for all subjects
print("Loading contrasts...")
X = load_fmri(df, subjects, contrasts)
n_voxels = X.shape[0] // n_subjects

# Util function for exploring contrasts
@eel.expose
def get_subjects():
    return subjects.tolist()


@eel.expose
def get_contrast_labels():
    return contrasts.tolist()


@eel.expose
def get_tasks():
    return n_contrasts_by_task.tolist()


@eel.expose
def get_voxel_fingerprint(subject_index, voxel_index):
    if DEBUG:
        print(
            f"get_voxel_fingerprint {voxel_index} for {subjects[subject_index]} ({subject_index})"
        )
    return X[n_voxels * subject_index + voxel_index, :].tolist()


@eel.expose
def get_voxel_fingerprint_mean(voxel_index):
    if DEBUG:
        print(f"get_voxel_mean_fingerprint {voxel_index}")
    mean = np.mean(
        X[
            [
                n_voxels * subject_index + voxel_index
                for subject_index in range(n_subjects)
            ],
            :,
        ],
        axis=0,
    )
    return mean.tolist()


@eel.expose
def get_left_contrast(subject_index, contrast_index):
    if DEBUG:
        print(
            f"get_left_contrast {contrasts[contrast_index]} ({contrast_index}) for {subjects[subject_index]} ({subject_index})"
        )
    start_index = n_voxels * subject_index
    return X[
        start_index : start_index + n_voxels // 2, contrast_index
    ].tolist()


@eel.expose
def get_left_contrast_mean(contrast_index):
    if DEBUG:
        print(
            f"get_left_contrast_mean {contrasts[contrast_index]} ({contrast_index})"
        )
    mean = np.mean(
        np.vstack(
            [
                X[
                    n_voxels * subject_index : n_voxels * subject_index
                    + n_voxels // 2,
                    contrast_index,
                ]
                for subject_index in range(n_subjects)
            ]
        ),
        axis=0,
    )
    return mean.tolist()


## Load regressed coordinates
print("Loading regressed coordinates...")
regressed_coordinates = None
with open(
    "/home/alexis/singbrain/outputs/008_position_regression_from_fmri.py/prediction_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
    "rb",
) as f:
    regressed_coordinates = np.load(f)


@eel.expose
def get_regressed_coordinates(voxel_index):
    if DEBUG:
        print(
            f"get_regressed_coordinates for voxel {voxel_index} for subject {subjects[-1]}"
        )
    return (regressed_coordinates[voxel_index, :]).tolist()


## Load regressed coordinates error map
print("Loading regression error map...")
regressed_coordinates_error = None
with open(
    "/home/alexis/singbrain/outputs/008_position_regression_from_fmri.py/error_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
    "rb",
) as f:
    regressed_coordinates_error = np.load(f)


@eel.expose
def get_regressed_coordinates_error():
    if DEBUG:
        print(f"get_regressed_coordinates_error")
    return regressed_coordinates_error.tolist()


@eel.expose
def server_log(message):
    print(message)


print("Loading fMRI SPM data...")
subject_data = fetch_spm_auditory()
fmri_img = concat_imgs(subject_data.func)
events = pd.read_table(subject_data["events"])
fmri_glm = FirstLevelModel(t_r=7, minimize_memory=False).fit(fmri_img, events)
mean_img = mean_img(fmri_img)
img = fmri_glm.compute_contrast("active - rest")


@eel.expose
def gimme_bs_json():
    return brainsprite_wrapper.generate_bs(img, mean_img, 3)


@eel.expose
def get_t_at_coordinate(coord):
    return img.dataobj[63 - coord[0], coord[1], coord[2]]


print("Serving...")
eel.init("src", [".tsx", ".ts", ".jsx", ".js", ".html"])
eel.start({"port": 3000}, app=None, mode=None, host="localhost", port=9442)
