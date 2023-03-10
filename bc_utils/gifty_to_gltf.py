import gzip
import nibabel as nib
import numpy as np
import operator
import os
import struct

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
from nilearn import datasets, surface
from scipy.sparse import coo_matrix
from tqdm import tqdm

OUTPUT_PATH = "/home/alexis/singbrain/repo/brain-cockpit/public/meshes"

if not os.path.exists(OUTPUT_PATH):
    os.mkdir(OUTPUT_PATH)


# %%
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


# %%
def compute_gltf_from_gifti(mesh_path, output_folder, output_filename):
    """
    Build GLTF files optimized for webGL from a given gifti file:
    - one GLTF file representing the given mesh itself (same vertices and triangles)
    - one GLTF file containing 2 buffers representing the edges centers and orientations

    Inputs:
    - mesh_path: string, path to input gifti file
    - original_mesh_name: string
    - mesh_type: string, among ["pial", "white", etc]
    - side: string, ["left", "right"]
    """
    # Create output folder for mesh
    mesh_output_folder = os.path.join(OUTPUT_PATH, output_folder)
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


# %%
if __name__ == "__main__":
    # %% Export all fsaverage resolutions
    for mesh in tqdm(["fsaverage5", "fsaverage6", "fsaverage7"]):
        fsaverage = datasets.fetch_surf_fsaverage(mesh=mesh)
        for mesh_type in ["infl", "pial", "white"]:
            for side in ["left", "right"]:
                compute_gltf_from_gifti(
                    fsaverage[f"{mesh_type}_{side}"],
                    mesh,
                    f"{mesh_type}_{side}",
                )

    # %% Export all individual meshes from IBC
    # Originally in the freesurfer format
    subjects = [
        "sub-01",
        "sub-02",
        "sub-04",
        "sub-05",
        "sub-06",
        "sub-07",
        "sub-08",
        "sub-09",
        "sub-11",
        "sub-12",
        "sub-13",
        "sub-14",
        "sub-15",
    ]

    mesh_folder = "/home/alexis/singbrain/data/ibc_meshes"

    for subject in tqdm(subjects):
        for mesh_type in ["inflated", "pial", "white"]:
            for side in ["lh", "rh"]:
                side_corrected = "left" if side == "lh" else "right"
                mesh_type_corrected = (
                    "infl" if mesh_type == "inflated" else mesh_type
                )

                # Load gifti file if available, else load freesurfer file.
                # This is useful since pial surfaces have been modified
                # (new pial surfaces are average between freesurfer's pial and white)
                fs_path = os.path.join(
                    mesh_folder, subject, f"{side}.{mesh_type}"
                )
                gii_path = os.path.join(
                    mesh_folder,
                    subject,
                    f"{mesh_type_corrected}_{side_corrected}.gii",
                )
                mesh_path = gii_path if os.path.exists(gii_path) else fs_path

                compute_gltf_from_gifti(
                    mesh_path,
                    os.path.join(OUTPUT_PATH, "individual", subject),
                    f"{mesh_type_corrected}_{side_corrected}",
                )
