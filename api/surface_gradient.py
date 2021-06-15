from datetime import datetime
from distutils.util import strtobool
import dotenv
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd
from scipy.sparse import coo_matrix, triu
from tqdm import tqdm

import custom_utils.setup as setup
from api.surface_contrasts import select_subjects_and_contrasts

# Load environment variables
setup.load_env()

DEBUG = os.getenv("DEBUG")

# Load global variables
REACT_APP_CONDITIONS_VIEW = bool(
    strtobool(os.getenv("REACT_APP_CONDITIONS_VIEW"))
)
CONDITIONS_DATA_PATH = os.getenv("CONDITIONS_DATA_PATH")
AVAILABLE_CONTRASTS_PATH = os.getenv("AVAILABLE_CONTRASTS_PATH")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
GRADIENTS_DATA_PATH = os.getenv("GRADIENTS_DATA_PATH")


## Util functions
def load_gradients(df, subjects, unique_contrasts):
    gradient_norms_per_subject = list()
    gradients_averaged_per_subject = list()

    for subject in subjects:
        gradient = np.load(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                GRADIENTS_DATA_PATH,
                f"gradient_left_{subject}.npy",
            ),
            allow_pickle=True,
        )
        gradient_norms_per_subject.append(gradient)

        gradient_averaged = np.load(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                GRADIENTS_DATA_PATH,
                f"gradient_averaged_left_{subject}.npy",
            ),
            allow_pickle=True,
        )
        gradients_averaged_per_subject.append(gradient_averaged)

    return gradient_norms_per_subject, gradients_averaged_per_subject


# Load gradients
## Init variables and load data if possible
df = pd.DataFrame()
subjects, contrasts, n_contrasts_by_task = [], [], []
n_subjects, n_contrasts = 0, 0
n_voxels = 0

if REACT_APP_CONDITIONS_VIEW and os.path.exists(CONDITIONS_DATA_PATH):
    ## Load selected subjects and contrasts
    df = pd.read_csv(AVAILABLE_CONTRASTS_PATH)
    subjects, contrasts, n_contrasts_by_task = select_subjects_and_contrasts(
        df, available_contrasts_path=AVAILABLE_CONTRASTS_PATH
    )
    n_subjects, n_contrasts = len(subjects), len(contrasts)

    ## Load functional data for all subjects
    print("Loading contrast gradients...")
    (
        gradient_norms_per_subject,
        gradients_averaged_per_subject,
    ) = load_gradients(df, subjects, contrasts)


@eel.expose
def get_contrast_gradient_norms(subject_index, contrast_index, hemi="left"):
    """
    Return gradient intensity along edges of the fsaverage mesh.
    Edges are deduplicated. Order of appearence is determined by
    the upper triangular portion of the connectivity matrix.
    """
    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient_norms {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    gradient = gradient_norms_per_subject[subject_index][contrast_index]
    edges = triu(gradient).tocsr()
    edges.sort_indices()

    return edges.data.tolist()


@eel.expose
def get_contrast_gradient_averaged(subject_index, contrast_index, hemi="left"):
    """
    Returns an array of size (n_voxels, 3) which associates each fsaverage voxel i
    with a vector representing the mean of all gradient vectors along edges i -> j.
    """
    if DEBUG:
        print(
            f"[{datetime.now()}] get_contrast_gradient_averaged {contrasts[contrast_index]} for {subjects[subject_index]}, {hemi} hemi"
        )

    gradient = gradients_averaged_per_subject[subject_index][contrast_index]

    return gradient.data.tolist()
