import dotenv
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd

from tqdm import tqdm


# Load environment dat
dotenv.load_dotenv()
DATA_PATH = os.getenv("DATA_PATH")
AVAILABLE_CONTRASTS_PATH = os.getenv("AVAILABLE_CONTRASTS_PATH")
DEBUG = os.getenv("DEBUG")

# IBC contrasts exploration


## Util functions


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


## Init variables and load data if possible
df = pd.DataFrame()
subjects, contrasts, n_contrasts_by_task = [], [], 0
n_subjects, n_contrasts = 0, 0
X = np.empty((0, 0))
n_voxels = 0

if DATA_PATH is not None:
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

# Expose functions for exploring contrasts
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
def get_contrast(subject_index, contrast_index, hemi="both"):
    if DEBUG:
        print(
            f"get_contrast {contrasts[contrast_index]} ({contrast_index}) for {subjects[subject_index]} ({subject_index})"
        )

    start_index = n_voxels * subject_index

    if hemi == "left":
        return X[
            start_index : start_index + n_voxels // 2, contrast_index
        ].tolist()
    elif hemi == "right":
        return X[
            start_index + n_voxels // 2 : start_index + n_voxels,
            contrast_index,
        ].tolist()
    elif hemi == "both":
        return X[start_index : start_index + n_voxels, contrast_index].tolist()
    else:
        print(f"Unknown value for hemi: ${hemi}")
        return []


@eel.expose
def get_contrast_mean(contrast_index, hemi="both"):
    if DEBUG:
        print(
            f"get_contrast_mean {contrasts[contrast_index]} ({contrast_index})"
        )

    mean = []

    if hemi == "left":
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
    elif hemi == "right":
        mean = np.mean(
            np.vstack(
                [
                    X[
                        n_voxels * subject_index
                        + n_voxels // 2 : n_voxels * subject_index
                        + n_voxels,
                        contrast_index,
                    ]
                    for subject_index in range(n_subjects)
                ]
            ),
            axis=0,
        )
    elif hemi == "both":
        mean = np.mean(
            np.vstack(
                [
                    X[
                        n_voxels * subject_index : n_voxels * subject_index
                        + n_voxels,
                        contrast_index,
                    ]
                    for subject_index in range(n_subjects)
                ]
            ),
            axis=0,
        )
    else:
        print(f"Unknown value for hemi: ${hemi}")

    return mean.tolist()
