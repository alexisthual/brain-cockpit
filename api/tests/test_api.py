import pytest

from brain_cockpit import BrainCockpit


TEST_CONFIG_PATH = "./api/tests/dummy_data/config.yaml"


@pytest.fixture
def client():
    bc = BrainCockpit(config_path=TEST_CONFIG_PATH)

    with bc.app.test_client() as client:
        yield client


def test_server_config(client):
    config = client.get("/config").get_json()

    da = config["alignments"]["datasets"]["dummy_alignment"]
    assert da["n_files"] == 1

    ds = config["surfaces"]["datasets"]["dummy_surface"]
    assert ds["n_files"] == 2
    assert len(ds["subjects"]) == 2
