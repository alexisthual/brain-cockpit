import copy

from brain_cockpit.endpoints import features_explorer
from brain_cockpit.utils import load_dataset_description


def create_all_endpoints(bc):
    def get_json_server_config(config):
        json_config = copy.deepcopy(config)
        del json_config["cache_folder"]

        if "features" in json_config:
            if "datasets" in json_config["features"]:
                for _, d in json_config["features"]["datasets"].items():
                    df, _ = load_dataset_description(
                        config_path=bc.config_path, dataset_path=d["path"]
                    )

                    (
                        meshes,
                        subjects,
                        _,
                        sides,
                    ) = features_explorer.parse_metadata(df)
                    dataset_info = {
                        "subjects": subjects,
                        "meshes": meshes,
                        "sides": list(
                            map(features_explorer.side_to_hemi, sides)
                        ),
                        "n_files": len(df),
                    }
                    d.update(dataset_info)

        if "alignments" in json_config:
            if "datasets" in json_config["alignments"]:
                for _, d in json_config["alignments"]["datasets"].items():
                    df, _ = load_dataset_description(
                        config_path=bc.config_path, dataset_path=d["path"]
                    )

                    dataset_info = {
                        "n_files": len(df),
                    }
                    d.update(dataset_info)

        return json_config

    @bc.app.route("/config", methods=["GET"])
    def get_config():
        return get_json_server_config(bc.config)
