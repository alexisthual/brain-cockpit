def test_server_config(client):
    config = client.get("/config").get_json()

    assert config["allow_very_unsafe_file_sharing"] is True

    da = config["alignments"]["datasets"]["dummy_alignment"]
    assert da["n_files"] == 1
    assert da["name"] == "Dummy alignment"
    assert da["path"] == "alignments_dataset/dataset.csv"

    ds = config["features"]["datasets"]["dummy_surface"]
    assert ds["n_files"] == 6
    assert ds["subjects"] == ["sub-01", "sub-02"]
    assert ds["sides"] == ["left", "right"]
    assert ds["mesh_types"]["default"] == "pial"
    assert ds["mesh_types"]["other"] == ["infl"]
    assert ds["meshes"] == ["fsaverage3"]
    assert ds["name"] == "Dummy surface data"
    assert ds["path"] == "features_dataset/dataset.csv"
    assert ds["unit"] == "z-score"
