import copy

from brain_cockpit.endpoints import datasets_explorer
from brain_cockpit.utils import get_memory, load_dataset_description


def create_all_endpoints(bc):
    memory = get_memory(bc)

    @memory.cache
    def get_json_server_config(config):
        json_config = copy.deepcopy(config)
        del json_config["cache_folder"]

        if "surfaces" in json_config:
            if "datasets" in json_config["surfaces"]:
                for _, d in json_config["surfaces"]["datasets"].items():
                    df, _ = load_dataset_description(
                        config_path=bc.config_path, dataset_path=d["path"]
                    )

                    (
                        meshes,
                        subjects,
                        _,
                        sides,
                    ) = datasets_explorer.parse_metadata(df)
                    dataset_info = {
                        "subjects": subjects,
                        "meshes": meshes,
                        "sides": list(
                            map(datasets_explorer.side_to_hemi, sides)
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
