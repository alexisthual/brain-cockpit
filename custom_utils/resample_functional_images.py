import dotenv
from joblib import Parallel, delayed
import nibabel as nib
from nilearn.image import load_img
from nilearn.image import resample_img
from nilearn.image import resample_to_img
import numpy as np
import os
from tqdm import tqdm

import custom_utils.setup as setup

# Load environment variables
setup.load_env()

N_JOBS = int(os.getenv("N_JOBS"))
SLICE_DATA_PATH = os.getenv("SLICE_DATA_PATH")
SLICE_DATA_HUMAN_SUBJECTS = os.getenv("SLICE_DATA_HUMAN_SUBJECTS")
SLICE_DATA_MONKEY_SUBJECTS = os.getenv("SLICE_DATA_MONKEY_SUBJECTS")
print(SLICE_DATA_HUMAN_SUBJECTS)
print(SLICE_DATA_MONKEY_SUBJECTS)

subjects = list(
    zip(
        ["data_human"] * len(SLICE_DATA_HUMAN_SUBJECTS),
        SLICE_DATA_HUMAN_SUBJECTS,
    )
) + list(
    zip(
        ["data_monkey"] * len(SLICE_DATA_MONKEY_SUBJECTS),
        SLICE_DATA_MONKEY_SUBJECTS,
    )
)


def resample_subject(folder, subject):
    # The commented nifti path is rotated
    # I presume this can be solved with nilearn.image.reorder_img
    # anatomical_nifti = os.path.join(SLICE_DATA_PATH, "anatomical/debby_t1.nii")
    subject_data_path = os.path.join(SLICE_DATA_PATH, folder, subject)
    anatomical_nifti_list = os.listdir(
        os.path.join(subject_data_path, "anatomical")
    )
    if len(anatomical_nifti_list):
        anatomical_image_name = anatomical_nifti_list[0]
        anatomical_nifti = os.path.join(
            subject_data_path, "anatomical", anatomical_image_name
        )
    else:
        print(f"Missing anatomical files for subject {subject}")

    anatomical_img = load_img(anatomical_nifti)
    m = np.max(anatomical_img.shape)
    anatomical_img_resampled = resample_img(
        anatomical_img,
        target_affine=anatomical_img.affine,
        target_shape=(m, m, m),
    )

    for functional_image_name in tqdm(
        os.listdir(os.path.join(subject_data_path, "functional")),
        desc=f"functional image {subject}",
    ):
        functional_nifti = os.path.join(
            subject_data_path, "functional", functional_image_name
        )
        functional_img = load_img(functional_nifti)

        functional_img_resampled = resample_to_img(
            functional_img, anatomical_img_resampled
        )

        nib.save(
            functional_img_resampled,
            os.path.join(
                subject_data_path,
                "resampled",
                f"{os.path.splitext(functional_image_name)[0]}_resampled_to_{os.path.splitext(anatomical_image_name)[0]}.nii",
            ),
        )


if SLICE_DATA_PATH and os.path.exists(SLICE_DATA_PATH):
    Parallel(n_jobs=N_JOBS)(
        delayed(resample_subject)(folder, subject)
        for folder, subject in tqdm(subjects, desc="subject")
    )
else:
    print(
        f"SLICE_DATA_PATH ({SLICE_DATA_PATH}) is not defined or does not exist."
    )
