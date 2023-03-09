import gzip
import nibabel as nib
import numpy as np
import operator
import os
import struct

from pathlib import Path
from gltflib import (
    GLTF,
    GLTFModel,
    Asset,
    Scene,
    Node,
    Mesh,
    Primitive,
    Attributes,
    Buffer,
    BufferView,
    Accessor,
    AccessorType,
    BufferTarget,
    ComponentType,
    FileResource,
)
from nilearn import surface
from scipy.sparse import coo_matrix
from tqdm import tqdm


def read_freesurfer(freesurfer_file):
    """Read freesurfer file"""
    vertices, triangles = nib.freesurfer.read_geometry(freesurfer_file)

    return vertices, triangles


def read_gii(gii_file):
    """Read Gifti File"""

    if gii_file[-6:] == "gii.gz":
        with gzip.open(gii_file) as f:
            file_as_bytes = f.read()
            parser = nib.gifti.GiftiImage.parser()
            parser.parse(file_as_bytes)
            gifti_img = parser.img
            arrays = np.asarray(
                [arr.data for arr in gifti_img.darrays], dtype=object
            ).T.squeeze()
            f.close()
    elif gii_file[-3:] == "gii":
        arrays = surface.load_surf_mesh(gii_file)

    return list(arrays)


def mesh_to_coordinates(mesh):
    try:
        coordinates, triangles = nib.freesurfer.read_geometry(mesh)
    except ValueError:
        arr = read_gii(mesh)
        coordinates = arr[0]
        triangles = arr[1]

    return coordinates, triangles


def mesh_to_graph(mesh):
    coordinates, triangles = mesh_to_coordinates(mesh)
    n_points = coordinates.shape[0]
    edges = np.hstack(
        (
            np.vstack((triangles[:, 0], triangles[:, 1])),
            np.vstack((triangles[:, 0], triangles[:, 2])),
            np.vstack((triangles[:, 1], triangles[:, 0])),
            np.vstack((triangles[:, 1], triangles[:, 2])),
            np.vstack((triangles[:, 2], triangles[:, 0])),
            np.vstack((triangles[:, 2], triangles[:, 1])),
        )
    )
    weights = np.ones(edges.shape[1])

    connectivity = coo_matrix((weights, edges), (n_points, n_points)).tocsr()

    # Making it symmetrical
    connectivity = (connectivity + connectivity.T) / 2

    return connectivity


def compute_gltf_from_gifti(mesh_path, output_folder, output_filename):
    """
    Builds GLTF files optimized for webGL from a given gifti file.
    For each mesh, builds (a) one GLTF file representing the given mesh itself
    (same vertices and triangles) and (b) one GLTF file containing 2 buffers
    representing the edges centers and orientations.

    Parameters
    ----------
    mesh_path: string
        Path to input gifti file
    original_mesh_name: string
    mesh_type: string in ["pial", "white", etc]
    side: string in ["left", "right"]
    """
    # Create output folder for mesh
    mesh_output_folder = Path(output_folder)
    if not os.path.exists(mesh_output_folder):
        os.mkdir(mesh_output_folder)

    vertices, triangles = [], []
    if mesh_path[-3:] == "gii" or mesh_path[-6:] == "gii.gz":
        vertices, triangles = read_gii(mesh_path)
    else:
        vertices, triangles = read_freesurfer(mesh_path)

    vertices = vertices.tolist()
    triangles = triangles.tolist()

    vertex_bytearray = bytearray()
    for vertex in vertices:
        for value in vertex:
            vertex_bytearray.extend(struct.pack("f", value))

    mins = [
        min([operator.itemgetter(i)(vertex) for vertex in vertices])
        for i in range(3)
    ]
    maxs = [
        max([operator.itemgetter(i)(vertex) for vertex in vertices])
        for i in range(3)
    ]

    triangles_bytearray = bytearray()
    for triangle in triangles:
        for vertex_index in triangle:
            triangles_bytearray.extend(struct.pack("I", vertex_index))

    model = GLTFModel(
        asset=Asset(version="2.0"),
        scenes=[Scene(nodes=[0])],
        nodes=[Node(mesh=0)],
        meshes=[
            Mesh(
                primitives=[
                    Primitive(attributes=Attributes(POSITION=0), indices=1)
                ]
            )
        ],
        buffers=[
            Buffer(
                byteLength=len(vertex_bytearray),
                uri=f"vertices_{output_filename}.bin",
            ),
            Buffer(
                byteLength=len(triangles_bytearray),
                uri=f"triangles_{output_filename}.bin",
            ),
        ],
        bufferViews=[
            BufferView(
                buffer=0,
                byteOffset=0,
                byteLength=len(vertex_bytearray),
                target=BufferTarget.ARRAY_BUFFER.value,
            ),
            BufferView(
                buffer=1,
                byteOffset=0,
                byteLength=len(triangles_bytearray),
                target=BufferTarget.ELEMENT_ARRAY_BUFFER.value,
            ),
        ],
        accessors=[
            Accessor(
                bufferView=0,
                byteOffset=0,
                componentType=ComponentType.FLOAT.value,
                count=len(vertices),
                type=AccessorType.VEC3.value,
                min=mins,
                max=maxs,
            ),
            Accessor(
                bufferView=1,
                byteOffset=0,
                componentType=ComponentType.UNSIGNED_INT.value,
                count=3 * len(triangles),
                type=AccessorType.SCALAR.value,
            ),
        ],
    )

    vertices_resource = FileResource(
        f"vertices_{output_filename}.bin", data=vertex_bytearray
    )
    triangles_resource = FileResource(
        f"triangles_{output_filename}.bin", data=triangles_bytearray
    )
    gltf = GLTF(model=model, resources=[vertices_resource, triangles_resource])
    gltf.export(os.path.join(mesh_output_folder, f"{output_filename}.gltf"))


def create_dataset_glft_files(bc, df, dataset):
    dataset_folder = Path(dataset["path"]).parent

    mesh_paths = list(map(Path, np.unique(df["mesh_path"])))

    for mesh_path in tqdm(mesh_paths, desc="Building GLTF mesh", leave=False):
        mesh_stem = mesh_path.stem.split(".")[0]
        if mesh_path.is_absolute():
            mesh_absolute_path = mesh_path
            output_folder = mesh_path.parent
        elif dataset_folder.is_absolute():
            mesh_absolute_path = dataset_folder / mesh_path
            output_folder = dataset_folder / mesh_path.parent
        else:
            mesh_absolute_path = (
                Path(bc.config_path).parent / dataset_folder / mesh_path
            )
            output_folder = (
                Path(bc.config_path).parent / dataset_folder / mesh_path.parent
            )
        output_filename = mesh_stem

        if not (output_folder / f"{output_filename}.gltf").exists():
            compute_gltf_from_gifti(
                str(mesh_absolute_path),
                str(output_folder),
                output_filename,
            )

        if "mesh_types" in dataset:
            if (
                "default" in dataset["mesh_types"]
                and "other" in dataset["mesh_types"]
            ):
                mesh_absolute_path = Path(mesh_absolute_path)
                default_mesh_type = dataset["mesh_types"]["default"]
                other_mesh_types = dataset["mesh_types"]["other"]

                for other_mesh_type in other_mesh_types:
                    other_mesh_stem = mesh_stem.replace(
                        default_mesh_type, other_mesh_type
                    )
                    other_mesh_absolute_path = (
                        mesh_absolute_path.parent
                        / mesh_absolute_path.name.replace(
                            default_mesh_type, other_mesh_type
                        )
                    )

                    if not (
                        output_folder / f"{other_mesh_stem}.gltf"
                    ).exists():
                        compute_gltf_from_gifti(
                            str(other_mesh_absolute_path),
                            str(output_folder),
                            other_mesh_stem,
                        )
