from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd
import pickle
import torch
import yaml

from flask import jsonify, request, send_from_directory
from fugw import FUGW
from msm.model import MSM

from api import app

with open("./config.yaml", "r") as f:
    try:
        config = yaml.safe_load(f)
    except yaml.YAMLError as exc:
        print(exc)


def crow_indices_to_row_indices(crow_indices):
    """
    Computes a row indices tensor
    from a CSR indptr tensor (ie crow indices tensor)
    """
    n_elements_per_row = crow_indices[1:] - crow_indices[:-1]
    arange = torch.arange(crow_indices.shape[0] - 1)
    row_indices = torch.repeat_interleave(arange, n_elements_per_row)
    return row_indices


def csr_dim_sum(inputs, group_indices, n_groups):
    """In a given tensor, computes sum of elements belonging to the same group.
    Taken from https://discuss.pytorch.org/t/sum-over-various-subsets-of-a-tensor/31881/8

    Args:
        inputs: torch.Tensor of size (n, ) whose values will be summed
        group_indices: torch.Tensor of size (n, )
        n_groups: int, total number of groups

    Returns:
        sums: torch.Tensor of size (n_groups)
    """
    n_inputs = inputs.size(0)
    indices = torch.stack(
        (
            group_indices,
            torch.arange(n_inputs, device=group_indices.device),
        )
    )
    values = torch.ones_like(group_indices, dtype=torch.float)
    one_hot = torch.sparse_coo_tensor(
        indices, values, size=(n_groups, n_inputs)
    )
    return torch.sparse.mm(one_hot, inputs.reshape(-1, 1)).to_dense().flatten()


def csr_sum(csr_matrix, dim=None):
    """Computes sum of a CSR torch matrix along a given dimension."""
    if dim is None:
        return csr_matrix.values().sum()
    elif dim == 0:
        return csr_dim_sum(
            csr_matrix.values(), csr_matrix.col_indices(), csr_matrix.shape[1]
        )
    elif dim == 1:
        row_indices = crow_indices_to_row_indices(csr_matrix.crow_indices())
        return csr_dim_sum(
            csr_matrix.values(), row_indices, csr_matrix.shape[0]
        )
    else:
        raise ValueError(f"Wrong dim: {dim}")


# MAIN FUNCTION
# This function is meant to be called from other files.
# It loads fmri contrasts and exposes flask endpoints.


def create_alignents_dataset_endpoints(id, dataset):
    """
    For a given alignment dataset, generate endpoints
    serving dataset meshes and alignment transforms.
    """

    df = pd.read_csv(dataset["path"])
    dataset_path = Path(dataset["path"]).parent

    @app.route(f"/alignments/{id}/models", methods=["GET"])
    def get_models():
        return jsonify(df.index.to_list())

    @app.route(f"/alignments/{id}/<int:model_id>/info", methods=["GET"])
    def get_model_info(model_id):
        df_row = df.iloc[model_id].copy()
        df_row["source_mesh"] = str(
            Path(df_row["source_mesh"]).with_suffix(".gltf")
        )
        df_row["target_mesh"] = str(
            Path(df_row["target_mesh"]).with_suffix(".gltf")
        )
        return df_row.to_json()

    @app.route(
        f"/alignments/{id}/<int:model_id>/mesh/<path:path>", methods=["GET"]
    )
    def get_alignment_mesh(model_id, path):
        return send_from_directory(Path(dataset["path"]).parent, path)

    @app.route(f"/alignments/{id}/single_voxel", methods=["GET"])
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


def create_alignments_endpoints():
    """Create endpoints for all available alignments datasets."""

    try:
        for dataset_id, dataset in config["alignments"]["datasets"].items():
            create_alignents_dataset_endpoints(dataset_id, dataset)
    except KeyError:
        print("Missing alignment datasets")
