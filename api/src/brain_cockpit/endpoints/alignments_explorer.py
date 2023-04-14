import os
import pickle

from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd

from brain_cockpit.scripts.gifti_to_gltf import create_dataset_glft_files
from brain_cockpit.utils import console, load_dataset_description
from flask import jsonify, request, send_from_directory


def create_endpoints_one_alignment_dataset(bc, id, dataset):
    """
    For a given alignment dataset, generate endpoints
    serving dataset meshes and alignment transforms.
    """

    df, dataset_path = load_dataset_description(
        config_path=bc.config_path, dataset_path=dataset["path"]
    )

    # ROUTES
    # Define endpoints
    alignment_models_endpoint = f"/alignments/{id}/models"
    alignment_model_info_endpoint = f"/alignments/{id}/<int:model_id>/info"
    alignment_mesh_endpoint = (
        f"/alignments/{id}/<int:model_id>/mesh/<path:path>"
    )
    align_single_voxel_endpoint = f"/alignments/{id}/single_voxel"

    @bc.app.route(
        alignment_models_endpoint,
        endpoint=alignment_models_endpoint,
        methods=["GET"],
    )
    def get_alignment_models():
        return jsonify(df.index.to_list())

    @bc.app.route(
        alignment_model_info_endpoint,
        endpoint=alignment_model_info_endpoint,
        methods=["GET"],
    )
    def get_alignment_model_info(model_id):
        df_row = df.iloc[model_id].copy()
        df_row["source_mesh"] = str(
            Path(os.path.splitext(df_row["source_mesh"])[0]).with_suffix(
                ".gltf"
            )
        )
        df_row["target_mesh"] = str(
            Path(os.path.splitext(df_row["target_mesh"])[0]).with_suffix(
                ".gltf"
            )
        )
        # return jsonify(df_row.to_json())
        return jsonify(df_row.to_dict())

    @bc.app.route(
        alignment_mesh_endpoint,
        endpoint=alignment_mesh_endpoint,
        methods=["GET"],
    )
    def get_alignment_mesh(model_id, path):
        mesh_path = Path(path)
        relative_folder = (
            # Path(bc.config_path).parent
            # / Path(dataset["path"]).parent
            dataset_path.parent
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
        align_single_voxel_endpoint,
        endpoint=align_single_voxel_endpoint,
        methods=["GET"],
    )
    def align_single_voxel():
        model_id = request.args.get("model_id", type=int)
        voxel = request.args.get("voxel", type=int)
        role = request.args.get("role", type=str)

        model_path = Path(df.iloc[model_id]["alignment"])
        if not model_path.is_absolute():
            model_path = dataset_path.parent / df.iloc[model_id]["alignment"]
        with open(model_path, "rb") as f:
            model = pickle.load(f)

        m = None
        if role == "target":
            n_voxels = (
                nib.load(
                    dataset_path.parent / df.iloc[model_id]["source_mesh"]
                )
                .darrays[0]
                .data.shape[0]
            )
            input_map = np.zeros(n_voxels)
            input_map[voxel] = 1

            m = model.transform(input_map)
        elif role == "source":
            n_voxels = (
                nib.load(
                    dataset_path.parent / df.iloc[model_id]["target_mesh"]
                )
                .darrays[0]
                .data.shape[0]
            )
            input_map = np.zeros(n_voxels)
            input_map[voxel] = 1

            m = model.inverse_transform(input_map)

        return jsonify(m.tolist() if m is not None else None)


def create_all_endpoints(bc):
    """Create endpoints for all available alignments datasets."""

    if "alignments" in bc.config and "datasets" in bc.config["alignments"]:
        # Iterate through each alignment dataset
        for dataset_id, dataset in bc.config["alignments"]["datasets"].items():
            df, _ = load_dataset_description(
                config_path=bc.config_path, dataset_path=dataset["path"]
            )
            # 1. Create GLTF files for all referenced meshes of the dataset
            mesh_paths = list(
                map(
                    Path,
                    np.unique(
                        pd.concat([df["source_mesh"], df["target_mesh"]])
                    ),
                )
            )
            create_dataset_glft_files(bc, dataset, mesh_paths)
            # 2. Create API endpoints
            create_endpoints_one_alignment_dataset(bc, dataset_id, dataset)
    else:
        console.log("No alignment datasets to load", style="yellow")
