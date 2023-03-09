import os

from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd
import pickle
import torch

from brain_cockpit.scripts.gifti_to_gltf import create_dataset_glft_files
from brain_cockpit.utils import console, load_dataset_description
from flask import jsonify, request, send_from_directory


def create_endpoints_one_alignment_dataset(bc, id, dataset):
    """
    For a given alignment dataset, generate endpoints
    serving dataset meshes and alignment transforms.
    """

    df = pd.read_csv(dataset["path"])
    dataset_path = Path(dataset["path"]).parent

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
        return df_row.to_json()

    @bc.app.route(
        alignment_mesh_endpoint,
        endpoint=alignment_mesh_endpoint,
        methods=["GET"],
    )
    def get_alignment_mesh(model_id, path):
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
        align_single_voxel_endpoint,
        endpoint=align_single_voxel_endpoint,
        methods=["GET"],
    )
    def align_single_voxel():
        model_id = request.args.get("model_id", type=int)
        voxel = request.args.get("voxel", type=int)
        role = request.args.get("role", type=str)

        with open(df.iloc[model_id]["alignment"], "rb") as f:
            model = pickle.load(f)

        if role == "target":
            n_voxels = (
                nib.load(dataset_path / df.iloc[model_id]["source_mesh"])
                .darrays[0]
                .data.shape[0]
            )
            input_map = np.zeros(n_voxels)
            input_map[voxel] = 1

            m = (
                (
                    torch.sparse.mm(
                        model.pi.transpose(0, 1),
                        torch.from_numpy(input_map)
                        .reshape(-1, 1)
                        .type(torch.FloatTensor),
                    ).to_dense()
                    / torch.sparse.sum(model.pi, dim=0)
                    .to_dense()
                    .reshape(-1, 1)
                )
                .T.flatten()
                .detach()
                .cpu()
                .numpy()
            )
        elif role == "source":
            n_voxels = (
                nib.load(dataset_path / df.iloc[model_id]["target_mesh"])
                .darrays[0]
                .data.shape[0]
            )
            input_map = np.zeros(n_voxels)
            input_map[voxel] = 1

            m = (
                (
                    torch.sparse.mm(
                        model.pi,
                        torch.from_numpy(input_map)
                        .reshape(-1, 1)
                        .type(torch.FloatTensor),
                    ).to_dense()
                    / torch.sparse.sum(model.pi, dim=1)
                    .to_dense()
                    .reshape(-1, 1)
                )
                .T.flatten()
                .detach()
                .cpu()
                .numpy()
            )

        return jsonify(m)


def create_all_endpoints(bc):
    """Create endpoints for all available alignments datasets."""

    try:
        # Iterate through each alignment dataset
        for dataset_id, dataset in bc.config["alignments"]["datasets"].items():
            df = load_dataset_description(
                config_path=bc.config_path, dataset_path=dataset["path"]
            )
            # 1. Create GLTF files for all referenced meshes of the dataset
            create_dataset_glft_files(bc, df, dataset)
            # 2. Create API endpoints
            create_endpoints_one_alignment_dataset(bc, dataset_id, dataset)
    except KeyError:
        console.log("No alignment datasets to load", style="red")
