import pytest

from brain_cockpit import BrainCockpit

TEST_CONFIG_PATH = "./api/tests/dummy_data/config.yaml"


@pytest.fixture
def client(scope="session", autouse=True):
    bc = BrainCockpit(config_path=TEST_CONFIG_PATH)

    with bc.app.test_client() as client:
        yield client
