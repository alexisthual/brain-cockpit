import pytest

from brain_cockpit import BrainCockpit
from pathlib import Path


TEST_CONFIG_PATH = "./api/tests/dummy_data/config.yaml"


@pytest.fixture
def client():
    bc = BrainCockpit(config_path=TEST_CONFIG_PATH)

    with bc.app.test_client() as client:
        yield client


def test_server_config(client):
    config = client.get("/config").get_json()

    assert config["allow_very_unsafe_file_sharing"] is True

    da = config["alignments"]["datasets"]["dummy_alignment"]
    assert da["n_files"] == 1
    assert da["name"] == "Dummy alignment"
    assert da["path"] == "alignment_dataset/dataset.csv"

    ds = config["surfaces"]["datasets"]["dummy_surface"]
    assert ds["n_files"] == 2
    assert ds["subjects"] == ["sub-01", "sub-02"]
    assert ds["sides"] == ["left"]
    assert ds["mesh_types"]["default"] == "pial"
    assert ds["mesh_types"]["other"] == ["infl"]
    assert ds["meshes"] == ["fsaverage3"]
    assert ds["name"] == "Dummy surface data"
    assert ds["path"] == "surface_dataset/dataset.csv"
    assert ds["unit"] == "z-score"


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


def test_alignment_single_point(client):
    m = client.get(
        "/alignments/dummy_alignment/single_voxel",
        query_string={
            "model_id": 0,
            "voxel": 0,
            "role": "source",
        },
    ).get_json()

    assert len(m) == 642


# def test_alignment_mesh(client):
#     info = client.get(
#         "/alignments/dummy_alignment/0/mesh/./meshes/pial_left.gltf"
#     )
#     print(info)
#     print(dir(info))
#     print(info.get_data())
#     assert False
