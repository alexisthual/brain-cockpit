import eel, os, random
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd

eel.init("src", [".tsx", ".ts", ".jsx", ".js", ".html"])

# Load contrasts
DATA_PATH = "/home/alexis/singbrain/data/ibc_surface_conditions_db"
AVAILABLE_CONTRASTS_PATH = os.path.join(DATA_PATH, "result_db.csv")

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

    grouped_by_contrast = df.groupby(["contrast"])["subject"].unique()
    mask = [
        np.array_equal(
            np.intersect1d(subjects, selected_subjects), selected_subjects
        )
        for subjects in grouped_by_contrast
    ]
    selected_contrasts = grouped_by_contrast[mask].index.values

    return selected_subjects, selected_contrasts


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
subjects, contrasts = select_subjects_and_contrasts(
    df, available_contrasts_path=AVAILABLE_CONTRASTS_PATH
)
n_subjects, n_contrasts = len(subjects), len(contrasts)

## Load functional data for all subjects
X = load_fmri(df, subjects, contrasts)
