import json
import os

from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd

from brain_cockpit import utils
from brain_cockpit.scripts.gifti_to_gltf import create_dataset_glft_files
from brain_cockpit.utils import console, load_dataset_description
from flask import jsonify, request, send_from_directory

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
    Parameters
    ----------
    df: pandas DataFrame
        Each row contains information about
        an available gifti image one will load here

    Returns
    -------
    meshes: list of strings
        List of all unique meshes encountered during loading
    subjects: list of strings
        List of all unique subjects encountered during loading
    tasks_contrasts: list of (task, contrast)
        List of all unique tuples (task, contrast) encountered during loading
    sides: list of strings
        List of all unique sides encountered during loading
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


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def create_endpoints_one_features_dataset(bc, id, dataset):
    memory = utils.get_memory(bc)

    @memory.cache
    def load_data(df, config_path=None, dataset_path=None):
        """
        Parameters
        ----------
        dataset_path: str
            Path to csv file containing dataset information.
            Each row contains information about
            an available gifti image one will load here

        Returns
        -------
        data: dict
            Dictionary d such that
            ``d[mesh][subject][task][contrast][side]`` is
            either a numpy array or None
        """
        meshes, subjects, tasks_contrasts, _ = parse_metadata(df)

        # Group rows before turning the dataframe into a python dict d
        # such that d[mesh][subject][task][contrast][side]
        # is the path to a gifti file describing this data
        df_grouped = df.groupby(
            ["mesh", "subject", "task", "contrast", "side"]
        )["path"].first()
        paths = multiindex_to_nested_dict(df_grouped.to_frame())

        config_dir = Path(config_path).parent
        dataset_dir = Path(dataset_path).parent

        # Load gifti files
        # and populate missing (mesh, subject, task, contrast, side) tuples
        # with None
        data = dict()
        with utils.get_progress(console=console) as progress:
            task_mesh = progress.add_task(
                "Load maps for each mesh support", total=len(meshes)
            )
            for mesh in meshes:
                dsu = dict()
                task_subject = progress.add_task(
                    f"Load maps for each subject ({mesh})", total=len(subjects)
                )
                for subject in subjects:
                    dtc = dict()
                    for task, contrast in tasks_contrasts:
                        dsi = dict()
                        for side in ["lh", "rh"]:
                            hemi = "left" if side == "lh" else "right"
                            try:
                                file_path = None

                                # Successively try
                                # 1. absolute path to file
                                # 2. relative path from dataset folder
                                # 3. relative path from config folder
                                p = Path(
                                    paths[mesh][subject][task][contrast][side]
                                )
                                if p.is_absolute():
                                    file_path = p
                                elif dataset_dir.is_absolute():
                                    file_path = dataset_dir / p
                                else:
                                    file_path = config_dir / dataset_dir / p

                                if (
                                    file_path is not None
                                    and file_path.exists()
                                ):
                                    dsi[hemi] = (
                                        # nib.load(file_path).darrays[0].data
                                        nib.load(file_path)
                                    )
                                else:
                                    dsi[hemi] = None
                            except KeyError:
                                dsi[hemi] = None
                        if task not in dtc:
                            dtc[task] = dict()
                        dtc[task][contrast] = dsi
                    dsu[subject] = dtc
                    progress.update(task_subject, advance=1)

                data[mesh] = dsu
                progress.update(task_mesh, advance=1)

        return data

    df, _ = load_dataset_description(
        config_path=bc.config_path, dataset_path=dataset["path"]
    )
    data = load_data(
        df, config_path=bc.config_path, dataset_path=dataset["path"]
    )
    meshes, subjects, tasks_contrasts, sides = parse_metadata(df)

    # ROUTES
    # Define a series of enpoints to expose contrasts, meshes, etc
    info_endpoint = f"/datasets/{id}/info"
    subjects_endpoint = f"/datasets/{id}/subjects"
    contrasts_endpoint = f"/datasets/{id}/contrast_labels"
    descriptions_endpoint = f"/datasets/{id}/descriptions"
    surface_map_mesh_url_endpoint = f"/datasets/{id}/mesh_url"
    meshes_endpoint = f"/datasets/{id}/mesh/<path:path>"
    fingerprint_endpoint = f"/datasets/{id}/voxel_fingerprint"
    fingerprint_mean_endpoint = f"/datasets/{id}/voxel_fingerprint_mean"
    contrast_endpoint = f"/datasets/{id}/contrast"
    contrast_mean_endpoint = f"/datasets/{id}/contrast_mean"

    @bc.app.route(info_endpoint, endpoint=info_endpoint, methods=["GET"])
    def get_info():
        dataset_info = {
            "subjects": subjects,
            "mesh_supports": meshes,
            "hemis": list(map(side_to_hemi, sides)),
            "tasks_contrasts": tasks_contrasts,
            "n_files": len(df),
            "unit": dataset["unit"] if "unit" in dataset else None,
        }

        try:
            mesh_types = bc.config["features"]["datasets"][id]["mesh_types"]
            available_mesh_types = [
                mesh_types["default"],
                *mesh_types["other"],
            ]
            dataset_info["mesh_types"] = available_mesh_types
        except KeyError:
            mesh_types = None

        return jsonify(dataset_info)

    @bc.app.route(
        subjects_endpoint, endpoint=subjects_endpoint, methods=["GET"]
    )
    def get_subjects():
        return jsonify(subjects)

    @bc.app.route(
        contrasts_endpoint, endpoint=contrasts_endpoint, methods=["GET"]
    )
    def get_contrast_labels():
        return jsonify(tasks_contrasts)

    @bc.app.route(
        descriptions_endpoint, endpoint=descriptions_endpoint, methods=["GET"]
    )
    def get_descriptions():
        if "descriptions" in dataset:
            with open(dataset["descriptions"], "r") as f:
                descriptions = json.load(f)
                return jsonify(descriptions)

    @bc.app.route(
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
        df_mesh_path_original = Path(df_mesh_paths[0])
        df_mesh_basename = os.path.splitext(df_mesh_path_original.name)[0]
        df_mesh_path = df_mesh_path_original.parent / Path(
            df_mesh_basename
        ).with_suffix(".gltf")

        if "mesh_types" in dataset:
            mesh_types = dataset["mesh_types"]
            if "default" in mesh_types and "other" in mesh_types:
                df_mesh_path = df_mesh_path.parent / str(
                    df_mesh_path.name
                ).replace(mesh_types["default"], mesh_type)

        return jsonify(str(df_mesh_path))

    @bc.app.route(meshes_endpoint, endpoint=meshes_endpoint, methods=["GET"])
    def get_mesh(path):
        mesh_path = Path(path)
        relative_folder = (
            Path(bc.config_path).parent
            / Path(dataset["path"]).parent
            / mesh_path.parent
        )
        absolute_folder = Path("/") / mesh_path.parent
        if (relative_folder / mesh_path.name).exists():
            return send_from_directory(relative_folder, mesh_path.name)
        elif (absolute_folder / mesh_path.name).exists() and bc.config[
            "allow_very_unsafe_file_sharing"
        ]:
            return send_from_directory(absolute_folder, mesh_path.name)

    @bc.app.route(
        fingerprint_endpoint, endpoint=fingerprint_endpoint, methods=["GET"]
    )
    def get_voxel_fingerprint():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        subject_index = request.args.get("subject_index", type=int)
        voxel_index = request.args.get("voxel_index", type=int)
        hemi = request.args.get("hemi", type=str)

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

        # Convert fingerprint to np array
        # so that it can easily be jsonified
        fingerprint = np.array(
            [
                (
                    data[mesh][subject][task][contrast][hemi]
                    .darrays[0]
                    .data[voxel_index]
                    if data[mesh][subject][task][contrast][hemi] is not None
                    else None
                )
                for task, contrast in tasks_contrasts
            ],
            # Force float32 to avoid json serialization error
            dtype=np.float32,
        )

        return jsonify(fingerprint)

    @bc.app.route(
        fingerprint_mean_endpoint,
        endpoint=fingerprint_mean_endpoint,
        methods=["GET"],
    )
    def get_voxel_fingerprint_mean():
        mesh = request.args.get("mesh", type=str, default="fsaverage5")
        voxel_index = request.args.get("voxel_index", type=int)
        hemi = request.args.get("hemi", type=str)

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
                                (
                                    data[mesh][subject][task][contrast][hemi]
                                    .darrays[0]
                                    .data[voxel_index]
                                    if data[mesh][subject][task][contrast][
                                        hemi
                                    ]
                                    is not None
                                    else np.nan
                                )
                                for task, contrast in tasks_contrasts
                            ]
                        )
                        for subject in subjects
                    ]
                ),
                axis=0,
                # Force float32 to avoid json serialization error
                dtype=np.float32,
            )

            return jsonify(mean)

    @bc.app.route(
        contrast_endpoint, endpoint=contrast_endpoint, methods=["GET"]
    )
    def get_contrast():
        mesh = request.args.get("mesh", default="fsaverage5", type=str)
        subject_index = request.args.get("subject_index", type=int)
        contrast_index = request.args.get("contrast_index", type=int)
        hemi = request.args.get("hemi", default="left", type=str)

        subject = subjects[subject_index]
        task, contrast = tasks_contrasts[contrast_index]

        if hemi == "left" or hemi == "right":
            c = data[mesh][subject][task][contrast][hemi]
            return jsonify(c.darrays[0].data if c is not None else None)
        elif hemi == "both":
            cl = data[mesh][subject][task][contrast]["left"]
            cr = data[mesh][subject][task][contrast]["right"]
            return jsonify(
                np.concatenate(
                    [
                        cl.darrays[0].data if cl is not None else None,
                        cr.darrays[0].data if cr is not None else None,
                    ]
                )
            )
        else:
            console.log(f"Unknown value for hemi: {hemi}", style="yellow")
            return jsonify([])

    @bc.app.route(
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
                            map(
                                lambda x: x.darrays[0].data,
                                filter(
                                    lambda x: x is not None,
                                    [
                                        data[mesh][subject][task][contrast][
                                            hemi
                                        ]
                                        for subject in subjects
                                    ],
                                ),
                            )
                        )
                    ),
                    axis=0,
                    # Force float32 to avoid json serialization error
                    dtype=np.float32,
                )
            )
        elif hemi == "both":
            return jsonify(
                np.nanmean(
                    np.vstack(
                        # Filter out subjects for whom this contrast map
                        # does not exist.
                        # Assume that left and right hemispheres
                        # will be missing at the same time.
                        list(
                            map(
                                lambda x: [
                                    x[0].darrays[0].data,
                                    x[1].darrays[0].data,
                                ],
                                filter(
                                    lambda x: x[0] is not None
                                    and x[1] is not None,
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
                                ),
                            )
                        )
                    ),
                    axis=0,
                    # Force float32 to avoid json serialization error
                    dtype=np.float32,
                )
            )
        else:
            console.log(f"Unknown value for hemi: {hemi}", style="red")
            return jsonify([])


def create_all_endpoints(bc):
    """Create endpoints for all available surface datasets."""

    if "features" in bc.config and "datasets" in bc.config["features"]:
        # Iterate through each surface dataset
        for dataset_id, dataset in bc.config["features"]["datasets"].items():
            df, _ = load_dataset_description(
                config_path=bc.config_path, dataset_path=dataset["path"]
            )
            # 1. Create GLTF files for all referenced meshes of the dataset
            mesh_paths = list(map(Path, np.unique(df["mesh_path"])))
            create_dataset_glft_files(bc, dataset, mesh_paths)
            # 2. Create API endpoints
            create_endpoints_one_features_dataset(bc, dataset_id, dataset)
    else:
        console.log("No features datasets to load", style="yellow")
