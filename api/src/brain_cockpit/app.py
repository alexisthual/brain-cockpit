from pathlib import Path

import numpy as np

from brain_cockpit.endpoints import (
    alignments_explorer,
    datasets_explorer,
    server,
)
from brain_cockpit.utils import load_config
from flask import Flask
from flask_cors import CORS
from simplejson import JSONEncoder


class StrictEncoder(JSONEncoder):
    def __init__(self, *args, **kwargs):
        # convert np.nan to null
        super().__init__(*args, **kwargs, ignore_nan=True)

    def default(self, obj):
        # convert numpy arrays to python lists
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return JSONEncoder.default(self, obj)


class BrainCockpit:
    def __init__(self, config_path=None):
        self.app = Flask(__name__)
        self.app.json_encoder = StrictEncoder

        # Setup config
        self.config_path = Path(config_path)
        self.config = load_config(config_path=config_path)

        _ = CORS(self.app)

        server.create_all_endpoints(self)
        datasets_explorer.create_all_endpoints(self)
        alignments_explorer.create_all_endpoints(self)
