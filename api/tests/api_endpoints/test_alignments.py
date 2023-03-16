from pathlib import Path


def test_alignment_models(client):
    models = client.get("/alignments/dummy_alignment/models").get_json()

    assert models == [0]


def test_alignment_model_info(client):
    info = client.get("/alignments/dummy_alignment/0/info").get_json()

    assert info["name"] == "alignment1"
    assert info["source_subject"] == "sub-01"
    assert info["target_subject"] == "sub-02"
    assert Path(info["source_mesh"]) == Path("./meshes/pial_left.gltf")
    assert Path(info["target_mesh"]) == Path("./meshes/pial_left.gltf")
    assert Path(info["alignment"]) == Path("./mapping.pkl")


# TODO: to be added with fugw is released on PyPI
# def test_alignment_single_point(client):
#     m = client.get(
#         "/alignments/dummy_alignment/single_voxel",
#         query_string={
#             "model_id": 0,
#             "voxel": 0,
#             "role": "source",
#         },
#     ).get_json()

#     assert len(m) == 642


# def test_alignment_mesh(client):
#     info = client.get(
#         "/alignments/dummy_alignment/0/mesh/./meshes/pial_left.gltf"
#     )
#     print(info)
#     print(dir(info))
#     print(info.get_data())
#     assert False
