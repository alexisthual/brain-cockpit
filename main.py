import dotenv
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd

import pandas as pd
from tqdm import tqdm

# Load contrasts
dotenv.load_dotenv()
DATA_PATH = os.getenv("DATA_PATH")
AVAILABLE_CONTRASTS_PATH = os.getenv("AVAILABLE_CONTRASTS_PATH")
DEBUG = os.getenv("DEBUG")
EXPERIMENT_DATA_PATH = os.getenv("EXPERIMENT_DATA_PATH")
SERVE_CUTS = os.getenv("SERVE_CUTS")


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


if SERVE_CUTS:
    from nilearn.datasets import fetch_spm_auditory
    from nilearn.image import concat_imgs, mean_img
    from nilearn.image.resampling import coord_transform
    from nilearn.glm.first_level import FirstLevelModel
    import brainsprite_wrapper
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.io import to_json
    from scipy.stats import zscore

    import matplotlib
    matplotlib.use('Agg') # Make it headless
    import matplotlib.pyplot as plt
    import mpld3

    print("Loading fMRI SPM data...")
    subject_data = fetch_spm_auditory()
    fmri_img = concat_imgs(subject_data.func)
    events = pd.read_table(subject_data["events"])
    fmri_glm = FirstLevelModel(t_r=7, minimize_memory=False).fit(fmri_img, events)
    mean_img = mean_img(fmri_img)
    img = fmri_glm.compute_contrast("active - rest")
    affine = np.linalg.inv(img.affine)

    @eel.expose
    def get_brainsprite(contrast, threshold):
        print(f"Serving images for `{contrast}` at t-threshold {threshold}")
        img = fmri_glm.compute_contrast(contrast)
        return brainsprite_wrapper.generate_bs(img, mean_img, threshold)


    @eel.expose
    def get_t_at_coordinate(coord):
        if coord[0] is not None:
            return img.dataobj[63 - coord[0], coord[1], coord[2]]
        else:
            return img.dataobj[63 - 32, 32, 32]

    # Prepares the structure for the beta plot
    effect = np.zeros(
        (len(fmri_glm.design_matrices_[0].columns), fmri_glm.labels_[0].size)
    )
    for label_ in fmri_glm.results_[0]:
        label_mask = fmri_glm.labels_[0] == label_
        resl = fmri_glm.results_[0][label_].theta
        effect[:, label_mask] = resl

    effect = fmri_glm.masker_.inverse_transform(effect).get_fdata()
    labels = fmri_glm.design_matrices_[0].columns

    n_elem = len(fmri_img.dataobj[0, 0, 0])
    df_events = pd.DataFrame({"x": [], "trial_type": []})
    base_df = pd.DataFrame({"x": list(np.arange(0, fmri_glm.t_r * n_elem, 0.1))})

    for trial_type in list(set(events["trial_type"])):
        this_df = base_df.copy()
        this_df["trial_type"] = trial_type
        this_df["value"] = None
        df_events = df_events.append(this_df)

    for idx, row in events.iterrows():
        l1 = df_events["trial_type"] == row["trial_type"]
        l2 = df_events["x"] >= row["onset"]
        l3 = df_events["x"] < row["onset"] + row["duration"]
        df_events.loc[l1 & l2 & l3, "value"] = 0

    base_fig = go.Figure()
    for trial_type in list(set(events["trial_type"])):
        base_fig.add_trace(
            go.Scatter(
                x=list(np.arange(0, fmri_glm.t_r * n_elem, 0.1)),
                y=df_events.loc[df_events["trial_type"] == trial_type, "value"],
                mode="lines",
                name=trial_type,
                line=dict(width=250),
            )
        )

    def plot_activation(mni):
        if (mni[0] is None):
            return None
        x, y, z = coord_transform(mni[0], mni[1], mni[2], affine)
        x, y, z = round(x) + 1, round(y) - 1, round(z) - 1
        d1 = zscore(fmri_img.dataobj[x, y, z])
        d2 = zscore(fmri_glm.predicted[0].dataobj[x, y, z])
        fig = go.Figure(base_fig)
        fig.add_trace(
            go.Scatter(
                x=list(range(0, fmri_glm.t_r * len(d1), fmri_glm.t_r)),
                y=d1,
                mode="lines",
                name="raw",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=list(range(0, fmri_glm.t_r * len(d2), fmri_glm.t_r)),
                y=d2,
                mode="lines",
                name="predicted",
            )
        )
        return {"engine": "plotly", "content_raw": to_json(fig)}

    def plot_beta(mni):
        if (mni[0] is None):
            return None
        x, y, z = coord_transform(mni[0], mni[1], mni[2], affine)
        x, y, z = round(x) + 1, round(y) - 1, round(z) - 1
        filtered_effect = effect[x, y, z]
        df = pd.DataFrame({"value": filtered_effect, "name": labels})
        df = df[~df.name.str.contains("trans|rot|drift|constant", regex=True)]

        fig = plt.figure()
        plt.rcParams['axes.facecolor'] = 'black'
        values = list(df['value'])
        names = list(df['name'])
        plt.bar(range(len(values)), values, figure=fig)
        plt.xticks(range(len(values)), names, figure=fig)
        fig_json = mpld3.fig_to_dict(fig)
        plt.close('all')

        return {"engine": "mpld3", "content_raw": fig_json}


    @eel.expose
    def get_callbacks(mni):
        return [plot_activation(mni), plot_beta(mni)]

# These functions are exposed for specific experiments
# whose data might not be publicly available

## Load regressed coordinates
regressed_coordinates = None
if EXPERIMENT_DATA_PATH is not None and os.path.exists(EXPERIMENT_DATA_PATH):
    print("Loading regressed coordinates...")
    with open(
        os.path.join(
            EXPERIMENT_DATA_PATH,
            "008_position_regression_from_fmri.py/prediction_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
        ),
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
regressed_coordinates_error = None
if EXPERIMENT_DATA_PATH is not None and os.path.exists(EXPERIMENT_DATA_PATH):
    print("Loading regression error map...")
    with open(
        os.path.join(
            EXPERIMENT_DATA_PATH,
            "008_position_regression_from_fmri.py/error_rbfsvr_epsilon_0.1_gamma_auto_C_1.0.npy",
        ),
        "rb",
    ) as f:
        regressed_coordinates_error = np.load(f)


@eel.expose
def get_regressed_coordinates_error():
    if DEBUG:
        print(f"get_regressed_coordinates_error")
    return regressed_coordinates_error.tolist()


# Functional distance vs topographical distance experiment
metric = "cosine"
d_max = 40

## Load correlation maps
distance_maps = []
if EXPERIMENT_DATA_PATH is not None and os.path.exists(EXPERIMENT_DATA_PATH):
    print("Loading correlation maps...")
    for subject in tqdm(subjects):
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                f"011_mean_m_distance_correlation_map.py/pairwise_{metric}_{subject}.npy",
            ),
            "rb",
        ) as f:
            distance_maps.append(np.load(f))

    distance_maps = np.stack(distance_maps)
    mean_distance_map = np.mean(distance_maps, axis=0)


@eel.expose
def get_distance_map(subject_index, voxel_index):
    """Exports array of shape n_voxels * n_voxels"""

    if DEBUG:
        print(
            f"get_distance_map for voxel {voxel_index} for {subjects[subject_index]}"
        )

    return distance_maps[subject_index][voxel_index, :].tolist()


@eel.expose
def get_mean_distance_map(voxel_index):
    """Exports array of shape n_voxels * n_voxels"""

    if DEBUG:
        print(f"get_mean_distance_map for voxel {voxel_index}")

    return mean_distance_map[voxel_index, :].tolist()


@eel.expose
def get_topographic_distance_to_m_functional_distance(subject_index, m):
    """Exports array of shape n_voxels"""

    if DEBUG:
        print(
            f"get_topographic_distance_to_m_functional_distance at distance {m} for {subjects[subject_index]}"
        )
    surface_map = np.min(
        np.where(
            mean_functional_distances[subject_index] >= m,
            np.arange(d_max),
            np.inf,
        ),
        axis=1,
    )

    return surface_map.tolist()


@eel.expose
def get_mean_topographic_distance_to_m_functional_distance(m):
    """Exports array of shape n_voxels"""

    if DEBUG:
        print(
            f"get_mean_topographic_distance_to_m_functional_distance at distance {m}"
        )
    surface_maps = [
        np.min(
            np.where(
                mean_functional_distances[subject_index] >= m,
                np.arange(d_max),
                np.inf,
            ),
            axis=1,
        )
        for subject_index in range(len(subjects))
    ]
    mean = np.mean(np.stack(surface_maps), axis=0)

    return mean.tolist()


## Load functional distance means
mean_functional_distances = []
if EXPERIMENT_DATA_PATH is not None and os.path.exists(EXPERIMENT_DATA_PATH):
    print("Loading mean functional distances...")
    for subject in tqdm(subjects):
        with open(
            os.path.join(
                EXPERIMENT_DATA_PATH,
                f"011_mean_m_distance_correlation_map.py/mean_functional_distance_{metric}_{subject}.npy",
            ),
            "rb",
        ) as f:
            mean_functional_distances.append(np.load(f))

    mean_functional_distances = np.stack(mean_functional_distances)
    mean_across_subjects_mean_function_distances = np.mean(
        mean_functional_distances, axis=0
    )


@eel.expose
def get_mean_functional_distance(subject_index, voxel_index):
    """Exports array of shape d_max"""

    if DEBUG:
        print(
            f"get_mean_functional_distance for voxel {voxel_index} for {subjects[subject_index]}"
        )

    return mean_functional_distances[subject_index][voxel_index, :].tolist()


@eel.expose
def get_mean_across_subjects_mean_functional_distance(voxel_index):
    """Exports array of shape d_max"""

    if DEBUG:
        print(
            f"get_mean_across_subjects_mean_functional_distance for voxel {voxel_index}"
        )

    return mean_across_subjects_mean_function_distances[
        voxel_index, :
    ].tolist()


@eel.expose
def server_log(message):
    print(message)


# When all websockets are closed, the eel server shuts down.
# One can prevent it from doing so (useful for development purposes).
def no_stop(page, sockets):
    pass


print("Serving...")
eel.init("src", [".tsx", ".ts", ".jsx", ".js", ".html"])
eel.start(
    {"port": 3000},
    app=None,
    mode=None,
    close_callback=no_stop,
    host="localhost",
    port=9442,
)
