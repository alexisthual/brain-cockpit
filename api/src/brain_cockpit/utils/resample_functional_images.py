from joblib import Parallel, delayed
import nibabel as nib
from nilearn.image import load_img
from nilearn.image import resample_img
from nilearn.image import resample_to_img
import numpy as np
import os
from tqdm import tqdm

import setup as setup

# Load environment variables
setup.load_env()

N_JOBS = int(os.getenv("N_JOBS"))
SLICE_DATA_PATH = os.getenv("SLICE_DATA_PATH")
SLICE_DATA_HUMAN_SUBJECTS = os.getenv("SLICE_DATA_HUMAN_SUBJECTS").split(",")
SLICE_DATA_MONKEY_SUBJECTS = os.getenv("SLICE_DATA_MONKEY_SUBJECTS").split(",")
print(SLICE_DATA_HUMAN_SUBJECTS)
print(SLICE_DATA_MONKEY_SUBJECTS)
MAX_DIM = 128

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

OUTPUT_FOLDER = os.path.join(SLICE_DATA_PATH, "resampled")

if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)


def resample_subject(folder, subject):
    output_subject = os.path.join(OUTPUT_FOLDER, subject)
    if not os.path.exists(output_subject):
        os.makedirs(output_subject)
        os.makedirs(os.path.join(output_subject, "anatomical"))
        os.makedirs(os.path.join(output_subject, "functional"))

    # The commented nifti path is rotated
    # I presume this can be solved with nilearn.image.reorder_img
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

    anatomical_image = load_img(anatomical_nifti, dtype=np.float32)
    m = min(np.max(anatomical_image.shape), MAX_DIM)
    anatomical_image_resampled = resample_img(
        anatomical_image,
        target_affine=anatomical_image.affine,
        target_shape=(m, m, m),
    )

    nib.save(
        anatomical_image_resampled,
        os.path.join(
            output_subject,
            "anatomical",
            f"{os.path.splitext(anatomical_image_name)[0]}_resampled.nii",
        ),
    )

    for functional_image_name in tqdm(
        os.listdir(os.path.join(subject_data_path, "functional")),
        desc=f"functional image {subject}",
    ):
        functional_nifti = os.path.join(
            subject_data_path, "functional", functional_image_name
        )
        functional_image = load_img(functional_nifti, dtype=np.float32)

        functional_image_resampled = resample_to_img(
            functional_image, anatomical_image_resampled
        )

        if not os.path.exists(os.path.join(subject_data_path, "resampled")):
            os.mkdir(os.path.join(subject_data_path, "resampled"))

        nib.save(
            functional_image_resampled,
            os.path.join(
                output_subject,
                "functional",
                (
                    f"{os.path.splitext(functional_image_name)[0]}_resampled"
                    f"_to_{os.path.splitext(anatomical_image_name)[0]}"
                    ".nii"
                ),
            ),
        )


if SLICE_DATA_PATH and os.path.exists(SLICE_DATA_PATH):
    Parallel(n_jobs=N_JOBS)(
        delayed(resample_subject)(folder, subject)
        for folder, subject in tqdm(subjects, desc="subject")
    )
else:
    print(
        f"SLICE_DATA_PATH ({SLICE_DATA_PATH}) is not defined or does not"
        " exist."
    )
