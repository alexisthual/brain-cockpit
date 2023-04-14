import numpy as np


def test_dataset_info(client):
    res = client.get("/datasets/dummy_surface/info").get_json()

    assert res["n_files"] == 6
    assert res["hemis"] == ["left", "right"]
    assert res["mesh_supports"] == ["fsaverage3"]
    assert res["mesh_types"] == ["pial", "infl"]
    assert res["subjects"] == ["sub-01", "sub-02"]
    assert res["tasks_contrasts"] == [
        ["localizer", "dummy"],
        ["localizer", "sentence-checkboard"],
    ]
    assert res["unit"] == "z-score"


def test_dataset_mesh_url(client):
    res = client.get(
        "/datasets/dummy_surface/mesh_url",
        query_string={
            "subject": 0,
            "meshSupport": "fsaverage3",
            "meshType": "pial",
            "hemi": "left",
        },
    ).get_json()

    assert res == "meshes/pial_left.gltf"


def test_dataset_fingerprint(client):
    res = client.get(
        "/datasets/dummy_surface/voxel_fingerprint",
        query_string={
            "mesh": "fsaverage3",
            "subject_index": 0,
            "voxel_index": 10,
            "hemi": "left",
        },
    ).get_json()

    assert len(res) == 2
    assert np.all(list(map(lambda x: x is None or isinstance(x, float), res)))


def test_dataset_fingerprint_mean(client):
    res = client.get(
        "/datasets/dummy_surface/voxel_fingerprint_mean",
        query_string={
            "mesh": "fsaverage3",
            "voxel_index": 10,
            "hemi": "left",
        },
    ).get_json()

    assert len(res) == 2
    assert np.all(list(map(lambda x: x is None or isinstance(x, float), res)))


def test_dataset_contrast(client):
    # Get left hemisphere
    res = client.get(
        "/datasets/dummy_surface/contrast",
        query_string={
            "mesh": "fsaverage3",
            "subject_index": 0,
            "contrast_index": 0,
            "hemi": "left",
        },
    ).get_json()

    assert len(res) == 642
    assert np.all(list(map(lambda x: x is None or isinstance(x, float), res)))

    # Get right hemisphere
    res = client.get(
        "/datasets/dummy_surface/contrast",
        query_string={
            "mesh": "fsaverage3",
            "subject_index": 0,
            "contrast_index": 0,
            "hemi": "right",
        },
    ).get_json()

    assert len(res) == 642
    assert np.all(list(map(lambda x: x is None or isinstance(x, float), res)))

    # Fetch missing map
    res = client.get(
        "/datasets/dummy_surface/contrast",
        query_string={
            "mesh": "fsaverage3",
            "subject_index": 1,
            "contrast_index": 0,
            "hemi": "right",
        },
    ).get_json()

    assert res is None

    # TODO: fix
    # API should probably take multiple hemispheres instead of "both"
    # res = client.get(
    #     "/datasets/dummy_surface/contrast",
    #     query_string={
    #         "mesh": "fsaverage3",
    #         "subject_index": 0,
    #         "contrast_index": 0,
    #         "hemi": "both",
    #     },
    # ).get_json()

    # assert len(res) == 2 * 642
    # assert np.all(list(map(lambda x: x is None or isinstance(x, float), res))


def test_dataset_contrast_mean(client):
    res = client.get(
        "/datasets/dummy_surface/contrast_mean",
        query_string={
            "mesh": "fsaverage3",
            "contrast_index": 0,
            "hemi": "left",
        },
    ).get_json()

    assert len(res) == 642
    assert np.all(list(map(lambda x: x is None or isinstance(x, float), res)))
