import gzip
import nibabel as nib
import numpy as np
import operator
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
    GLBResource,
    FileResource,
)
from nilearn import datasets
from nilearn import image
from nilearn import surface
from scipy.linalg import norm
from scipy.sparse import coo_matrix, csr_matrix, triu
from sklearn.preprocessing import normalize


# %%
def read_gii(gii_file):
    """ Read Gifti File"""

    with gzip.open(gii_file) as f:
        file_as_bytes = f.read()
        parser = nib.gifti.GiftiImage.parser()
        parser.parse(file_as_bytes)
        gifti_img = parser.img
        arrays = np.asarray(
            [arr.data for arr in gifti_img.darrays], dtype=object
        ).T.squeeze()
        f.close()

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
fsaverage = datasets.fetch_surf_fsaverage()
for dataset in [
    "infl_left",
    "infl_right",
    "pial_left",
    "pial_right",
    "white_left",
    "white_right",
]:
    vertices, triangles = read_gii(fsaverage[dataset])
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
            triangles_bytearray.extend(struct.pack("H", vertex_index))

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
                byteLength=len(vertex_bytearray), uri=f"vertices_{dataset}.bin"
            ),
            Buffer(
                byteLength=len(triangles_bytearray),
                uri=f"triangles_{dataset}.bin",
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
                componentType=ComponentType.UNSIGNED_SHORT.value,
                count=3 * len(triangles),
                type=AccessorType.SCALAR.value,
            ),
        ],
    )

    vertices_resource = FileResource(
        f"vertices_{dataset}.bin", data=vertex_bytearray
    )
    triangles_resource = FileResource(
        f"triangles_{dataset}.bin", data=triangles_bytearray
    )
    gltf = GLTF(model=model, resources=[vertices_resource, triangles_resource])
    gltf.export(f"public/assets/fsaverage_{dataset}.gltf")

    # Compute edges related information
    dataset = "pial_left"
    coordinates, _ = mesh_to_coordinates(fsaverage[dataset])
    connectivity = mesh_to_graph(fsaverage[dataset])
    # Keep only upper triangular portion of connectivity matrix
    # to deduplicate edges
    col_indices = triu(connectivity).tocoo().col
    row_indices = triu(connectivity).tocoo().row

    edges_center = (coordinates[col_indices] + coordinates[row_indices]) / 2
    edges_orientation = coordinates[col_indices] - coordinates[row_indices]
    edges_orientation = normalize(edges_orientation)

    assert len(col_indices) == len(row_indices)
    assert edges_center.shape[0] == len(col_indices)
    assert edges_orientation.shape[0] == len(col_indices)

    # Build byte array containing coordinates
    # of center of edges
    edges_center_bytearray = bytearray()
    for center in edges_center:
        for value in center:
            edges_center_bytearray.extend(struct.pack("f", value))

    # Build byte array containing normalized vector
    # orientation of edge
    edges_orientation_bytearray = bytearray()
    for orientation in edges_orientation:
        for value in orientation:
            edges_orientation_bytearray.extend(struct.pack("f", value))

    edges_model = GLTFModel(
        asset=Asset(version="2.0"),
        scenes=[Scene(nodes=[0])],
        nodes=[Node(mesh=0)],
        meshes=[
            Mesh(
                primitives=[
                    Primitive(
                        attributes=Attributes(POSITION=0, TANGENT=1), indices=1
                    )
                ]
            )
        ],
        buffers=[
            Buffer(
                byteLength=len(edges_center_bytearray),
                uri=f"edges_center_{dataset}.bin",
            ),
            Buffer(
                byteLength=len(edges_orientation_bytearray),
                uri=f"edges_orientation_{dataset}.bin",
            ),
        ],
        bufferViews=[
            BufferView(
                buffer=0,
                byteOffset=0,
                byteLength=len(edges_center_bytearray),
                target=BufferTarget.ARRAY_BUFFER.value,
            ),
            BufferView(
                buffer=1,
                byteOffset=0,
                byteLength=len(edges_orientation_bytearray),
                target=BufferTarget.ARRAY_BUFFER.value,
            ),
        ],
        accessors=[
            Accessor(
                bufferView=0,
                byteOffset=0,
                componentType=ComponentType.FLOAT.value,
                count=len(col_indices),
                type=AccessorType.VEC3.value,
                min=mins,
                max=maxs,
            ),
            Accessor(
                bufferView=1,
                byteOffset=0,
                componentType=ComponentType.FLOAT.value,
                count=len(col_indices),
                type=AccessorType.VEC3.value,
            ),
        ],
    )

    edges_center_resource = FileResource(
        f"edges_center_{dataset}.bin", data=edges_center_bytearray
    )
    edges_orientation_resource = FileResource(
        f"edges_orientation_{dataset}.bin", data=edges_orientation_bytearray
    )

    edges_gltf = GLTF(
        model=edges_model,
        resources=[edges_center_resource, edges_orientation_resource],
    )
    edges_gltf.export(f"public/assets/edges_fsaverage_{dataset}.gltf")
