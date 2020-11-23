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


# %%
fsaverage = datasets.fetch_surf_fsaverage()
for dataset in ["infl_left", "infl_right", "pial_left", "pial_right"]:
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
