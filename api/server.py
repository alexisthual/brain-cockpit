import copy

import pandas as pd
from flask import jsonify
from joblib import Memory

import bc_utils.setup as bc_setup
from api import app, datasets_explorer

config = bc_setup.load_config(verbose=True)
memory = Memory(config["cache_folder"], verbose=0)


@memory.cache
def get_json_server_config(config):
    json_config = copy.deepcopy(config)
    del json_config["cache_folder"]

    if "surfaces" in json_config:
        if "datasets" in json_config["surfaces"]:
            for _, d in json_config["surfaces"]["datasets"].items():
                df = pd.read_csv(d["path"])
                (
                    meshes,
                    subjects,
                    _,
                    sides,
                ) = datasets_explorer.parse_metadata(df)
                dataset_info = {
                    "subjects": subjects,
                    "meshes": meshes,
                    "sides": list(map(datasets_explorer.side_to_hemi, sides)),
                    "n_files": len(df),
                }
                d.update(dataset_info)

    if "alignments" in json_config:
        if "datasets" in json_config["alignments"]:
            for _, d in json_config["alignments"]["datasets"].items():
                df = pd.read_csv(d["path"])
                dataset_info = {
                    "n_files": len(df),
                }
                d.update(dataset_info)

    return json_config


def create_all_endpoints():
    @app.route("/config", methods=["GET"])
    def get_config():
        return get_json_server_config(config)
