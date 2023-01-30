import os

from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd
import pickle
import torch

from flask import jsonify, request, send_from_directory
from tqdm import tqdm

import bc_utils.setup as bc_setup

from api import app
from bc_utils.gifty_to_gltf import compute_gltf_from_gifti

config = bc_setup.load_config()


def create_endpoints_one_alignment_dataset(id, dataset):
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

    @app.route(
        alignment_models_endpoint,
        endpoint=alignment_models_endpoint,
        methods=["GET"],
    )
    def get_alignment_models():
        return jsonify(df.index.to_list())

    @app.route(
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

    @app.route(
        alignment_mesh_endpoint,
        endpoint=alignment_mesh_endpoint,
        methods=["GET"],
    )
    def get_alignment_mesh(model_id, path):
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


def create_all_endpoints():
    """Create endpoints for all available alignments datasets."""

    try:
        for dataset_id, dataset in config["alignments"]["datasets"].items():
            # Check that dataset gifti meshes exist
            dataset_folder = Path(dataset["path"]).parent

            df = pd.read_csv(dataset["path"])
            mesh_paths = list(
                map(
                    Path,
                    np.unique(
                        pd.concat([df["source_mesh"], df["target_mesh"]])
                    ),
                )
            )

            for mesh_path in tqdm(
                mesh_paths, desc="Building GLTF mesh", leave=False
            ):
                mesh_stem = mesh_path.stem.split(".")[0]
                if mesh_path.is_absolute():
                    output_folder = mesh_path.parent
                    output_filename = mesh_stem
                else:
                    output_folder = dataset_folder / mesh_path.parent
                    output_filename = mesh_stem

                if not (output_folder / f"{output_filename}.gltf").exists():
                    compute_gltf_from_gifti(
                        str(mesh_path), str(output_folder), output_filename
                    )

            # Create API endpoints
            create_endpoints_one_alignment_dataset(dataset_id, dataset)
    except KeyError:
        print("No alignment datasets to load")
