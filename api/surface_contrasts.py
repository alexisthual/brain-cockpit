import json
import os
import sys

from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd

from flask import jsonify, request, send_from_directory
from joblib import Memory
from tqdm import tqdm

import bc_utils.setup as bc_setup

from api import app
from bc_utils.gifty_to_gltf import compute_gltf_from_gifti


config = bc_setup.load_config(verbose=True)
memory = Memory(config["cache_folder"], verbose=0)

# UTIL FUNCTIONS
# These functions are useful for loading data


def hemi_to_side(hemi):
    if hemi == "left":
        return "lh"
    elif hemi == "right":
        return "rh"
    return None


def side_to_hemi(hemi):
    if hemi == "lh":
        return "left"
    elif hemi == "rh":
        return "right"
    return None


def multiindex_to_nested_dict(df):
    if isinstance(df.index, pd.core.indexes.multi.MultiIndex):
        return dict(
            (k, multiindex_to_nested_dict(df.loc[k]))
            for k in df.index.remove_unused_levels().levels[0]
        )
    else:
        d = dict()
        for idx in df.index:
            d[idx] = df.loc[idx, "path"]
        return d


def parse_metadata(df):
    """
    Inputs:
    - df: DataFrame,
          each row contains information about an available gifti image one will load here

    Outputs:
    - meshes: list of strings,
              list of all unique meshes encountered during loading
    - subjects: list of strings
                list of all unique subjects encountered during loading
    - tasks_contrasts: list of (task, contrast)
                       list of all unique tuples (task, contrast) encountered during loading
    - sides: list of strings,
             list of all unique sides encountered during loading
    """
    meshes = df["mesh"].unique().tolist()
    subjects = df["subject"].unique().tolist()
    tasks_contrasts = (
        df.groupby(["task", "contrast"])
        .count()
        .reset_index()
        .sort_values(["task", "contrast"])[["task", "contrast"]]
        .values.tolist()
    )
    sides = df["side"].unique().tolist()

    return meshes, subjects, tasks_contrasts, sides


@memory.cache
def load_data(dataset_path):
    """
    Inputs:
    - dataset_path: str,
        path to csv file containing dataset information.
        Each row contains information about an available gifti image one will load here

    Outputs:
    - data: dictionary d such that d[mesh][subject][task][contrast][side] is
            either a numpy array or None
    """
    df = pd.read_csv(dataset_path)
    meshes, subjects, tasks_contrasts, sides = parse_metadata(df)

    # Group rows before turning the dataframe into a python dict d
    # such that d[mesh][subject][task][contrast][side]
    # is the path to a gifti file describing this data
    df_grouped = df.groupby(["mesh", "subject", "task", "contrast", "side"])[
        "path"
    ].first()
    paths = multiindex_to_nested_dict(df_grouped.to_frame())

    # Load gifti files
    # and populate missing (mesh, subject, task, contrast, side) tuples
    # with None
    data = dict()
    for mesh in tqdm(meshes, file=sys.stdout, position=0):
        dsu = dict()
        for subject in tqdm(subjects, file=sys.stdout, position=1):
            dtc = dict()
            for task, contrast in tasks_contrasts:
                dsi = dict()
                for side in ["lh", "rh"]:
                    hemi = "left" if side == "lh" else "right"
                    try:
                        # Try following absolute path read from db...
                        if os.path.exists(
                            paths[mesh][subject][task][contrast][side]
                        ):
                            dsi[hemi] = (
                                nib.load(
                                    paths[mesh][subject][task][contrast][side]
                                )
                                .darrays[0]
                                .data
                            )
                        # or try relative path from where the db is located
                        elif os.path.exists(
                            os.path.join(
                                os.path.split(dataset_path)[0],
                                paths[mesh][subject][task][contrast][side],
                            )
                        ):
                            dsi[hemi] = (
                                nib.load(
                                    os.path.join(
                                        os.path.split(dataset_path)[0],
                                        paths[mesh][subject][task][contrast][
                                            side
                                        ],
                                    )
                                )
                                .darrays[0]
                                .data
                            )
                        else:
                            dsi[hemi] = None
                    except KeyError:
                        dsi[hemi] = None
                if task not in dtc:
                    dtc[task] = dict()
                dtc[task][contrast] = dsi
            dsu[subject] = dtc
        data[mesh] = dsu

    return data


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def create_endpoints_one_surface_dataset(id, dataset):
    ## Load all available contrasts
    df = pd.read_csv(dataset["path"])
    _, subjects, tasks_contrasts, _ = parse_metadata(df)

    print("Loading contrast maps...")
    data = load_data(dataset["path"])
    print("Loaded.")

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc
    subjects_endpoint = f"/datasets/{id}/subjects"
    contrasts_endpoint = f"/datasets/{id}/contrast_labels"
    descriptions_endpoint = f"/datasets/{id}/descriptions"
    surface_map_mesh_url_endpoint = f"/datasets/{id}/mesh_url"
    meshes_endpoint = f"/datasets/{id}/mesh/<path:path>"
    fingerprint_endpoint = f"/datasets/{id}/voxel_fingerprint"
    fingerprint_mean_endpoint = f"/datasets/{id}/voxel_fingerprint_mean"
    contrast_endpoint = f"/datasets/{id}/contrast"
    contrast_mean_endpoint = f"/datasets/{id}/contrast_mean"

    @app.route(subjects_endpoint, endpoint=subjects_endpoint, methods=["GET"])
    def get_subjects():
        return jsonify(subjects)

    @app.route(
        contrasts_endpoint, endpoint=contrasts_endpoint, methods=["GET"]
    )
    def get_contrast_labels():
        return jsonify(tasks_contrasts)

    @app.route(
        descriptions_endpoint, endpoint=descriptions_endpoint, methods=["GET"]
    )
    def get_descriptions():
        if "descriptions" in dataset:
            with open(dataset["descriptions"], "r") as f:
                descriptions = json.load(f)
                return jsonify(descriptions)

    @app.route(
        surface_map_mesh_url_endpoint,
        endpoint=surface_map_mesh_url_endpoint,
        methods=["GET"],
    )
    def get_surface_map_mesh_url():
        subject_id = request.args.get("subject", type=int)
        mesh_support = request.args.get("meshSupport", type=str)
        mesh_type = request.args.get("meshType", type=str)
        hemi = request.args.get("hemi", type=str)

        df_mesh_paths = df[
            (df["subject"] == subjects[subject_id])
            & (df["mesh"] == mesh_support)
            & (df["side"] == hemi_to_side(hemi))
        ]["mesh_path"].unique()
        df_mesh_path = Path(df_mesh_paths[0]).with_suffix(".gltf")

        if "default_mesh" in dataset and "other_meshes" in dataset:
            df_mesh_path = df_mesh_path.parent / str(
                df_mesh_path.name
            ).replace(dataset["default_mesh"], mesh_type)

        return str(df_mesh_path)

    @app.route(meshes_endpoint, endpoint=meshes_endpoint, methods=["GET"])
    def get_mesh(path):
        p = Path(path)
        relative_folder = Path(dataset["path"]).parent / p.parent
        absolute_folder = Path("/") / p.parent
        if (relative_folder / p.name).exists():
            return send_from_directory(relative_folder, p.name)
        elif (absolute_folder / p.name).exists() and config[
            "allow_very_unsafe_file_sharing"
        ]:
            return send_from_directory(absolute_folder, p.name)

    @app.route(
        fingerprint_endpoint, endpoint=fingerprint_endpoint, methods=["GET"]
    )
    def get_voxel_fingerprint():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)
        hemi = request.args.get("hemi", type=str)

        print(mesh, subject_index, voxel_index, hemi)

        subject = subjects[subject_index]

        # Deduce hemi from voxel index when both hemispheres are displayed
        if hemi == "both":
            d_query = df[
                (df["mesh"] == mesh)
                & (df["subject"] == subject)
                & (df["side"] == "lh")
            ]
            if len(d_query) > 0:
                d_row = d_query.iloc[0]
                n_voxels_left_hemi = data[mesh][subject][d_row["task"]][
                    d_row["contrast"]
                ]["left"].shape[0]
                if voxel_index >= n_voxels_left_hemi:
                    voxel_index -= n_voxels_left_hemi
                    hemi = "right"
                else:
                    hemi = "left"
            else:
                return jsonify(None)

        fingerprint = [
            data[mesh][subject][task][contrast][hemi][voxel_index]
            if data[mesh][subject][task][contrast][hemi] is not None
            else None
            for task, contrast in tasks_contrasts
        ]

        return jsonify(fingerprint)

    @app.route(
        fingerprint_mean_endpoint,
        endpoint=fingerprint_mean_endpoint,
        methods=["GET"],
    )
    def get_voxel_fingerprint_mean():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        voxel_index = request.args.get("voxel_index", type=int)
        hemi = request.args.get("hemi", type=str)

        print(mesh, voxel_index, hemi)

        # Can't return mean of meshes which are not comparable
        if mesh == "individual":
            return []
        else:
            # Deduce hemi from voxel index when both hemispheres are displayed
            if hemi == "both":
                d_query = df[(df["mesh"] == mesh) & (df["side"] == "lh")]
                if len(d_query) > 0:
                    d_row = d_query.iloc[0]
                    n_voxels_left_hemi = data[mesh][d_row["subject"]][
                        d_row["task"]
                    ][d_row["contrast"]]["left"].shape[0]
                    if voxel_index >= n_voxels_left_hemi:
                        voxel_index -= n_voxels_left_hemi
                        hemi = "right"
                    else:
                        hemi = "left"
                else:
                    return jsonify(None)

            mean = np.nanmean(
                np.vstack(
                    [
                        np.array(
                            [
                                data[mesh][subject][task][contrast][hemi][
                                    voxel_index
                                ]
                                if data[mesh][subject][task][contrast][hemi]
                                is not None
                                else np.nan
                                for task, contrast in tasks_contrasts
                            ]
                        )
                        for subject in subjects
                    ]
                ),
                axis=0,
            )

            return jsonify(mean)

    @app.route(contrast_endpoint, endpoint=contrast_endpoint, methods=["GET"])
    def get_contrast():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        subject_index = request.args.get("subject_index", type=int)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        subject = subjects[subject_index]
        task, contrast = tasks_contrasts[contrast_index]

        if hemi == "left" or hemi == "right":
            return jsonify(data[mesh][subject][task][contrast][hemi])
        elif hemi == "both":
            return jsonify(
                np.concatenate(
                    [
                        data[mesh][subject][task][contrast]["left"],
                        data[mesh][subject][task][contrast]["right"],
                    ]
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])

    @app.route(
        contrast_mean_endpoint,
        endpoint=contrast_mean_endpoint,
        methods=["GET"],
    )
    def get_contrast_mean():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        task, contrast = tasks_contrasts[contrast_index]
        if hemi == "left" or hemi == "right":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        # Filter out subjects for whom this contrast map
                        # does not exist
                        list(
                            filter(
                                lambda x: x is not None,
                                [
                                    data[mesh][subject][task][contrast][hemi]
                                    for subject in subjects
                                ],
                            )
                        )
                    ),
                    axis=0,
                )
            )
        elif hemi == "both":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        # Filter out subjects for whom this contrast map
                        # does not exist. Assume that left and right hemispheres
                        # will be missing at the same time
                        list(
                            filter(
                                lambda x: x is not [None, None],
                                [
                                    np.concatenate(
                                        [
                                            data[mesh][subject][task][
                                                contrast
                                            ]["left"],
                                            data[mesh][subject][task][
                                                contrast
                                            ]["right"],
                                        ]
                                    )
                                    for subject in subjects
                                ],
                            )
                        )
                    ),
                    axis=0,
                )
            )
        else:
            print(f"Unknown value for hemi: {hemi}")
            return jsonify([])


def create_endpoints_all_surface_datasets():
    """Create endpoints for all available surface datasets."""

    try:
        for dataset_id, dataset in config["surfaces"]["datasets"].items():
            # # Check that dataset gifti meshes exist
            # dataset_folder = Path(dataset["path"]).parent

            # df = pd.read_csv(dataset["path"])

            # df["mesh_path"] = "meshes/" + df[""]

            # mesh_paths = list(
            #     map(
            #         Path,
            #         np.unique(df["mesh_path"])
            #     )
            # )

            # for mesh_path in tqdm(
            #     mesh_paths, desc="Building GLTF mesh", leave=False
            # ):
            #     mesh_stem = mesh_path.stem.split(".")[0]
            #     if mesh_path.is_absolute():
            #         output_folder = mesh_path.parent
            #         output_filename = mesh_stem
            #     else:
            #         output_folder = dataset_folder / mesh_path.parent
            #         output_filename = mesh_stem

            #     if not (output_folder / f"{output_filename}.gltf").exists():
            #         compute_gltf_from_gifti(
            #             str(mesh_path), str(output_folder), output_filename
            #         )

            # Create API endpoints
            create_endpoints_one_surface_dataset(dataset_id, dataset)
    except KeyError:
        print("No surface datasets to load")
