from pathlib import Path

import numpy as np
import orjson

from brain_cockpit.endpoints import (
    alignments_explorer,
    datasets_explorer,
    server,
)
from brain_cockpit.utils import load_config
from flask import Flask
from flask.json.provider import JSONProvider
from flask_cors import CORS


class OrJSONProvider(JSONProvider):
    def dumps(self, obj, *, option=None, **kwargs):
        if option is None:
            option = orjson.OPT_APPEND_NEWLINE | orjson.OPT_NAIVE_UTC

        # convert numpy arrays to python lists
        if isinstance(obj, np.ndarray):
            obj = obj.tolist()

        return orjson.dumps(obj, option=option).decode()

    def loads(self, s, **kwargs):
        return orjson.loads(s)


class BrainCockpit:
    def __init__(self, config_path=None):
        self.app = Flask(__name__)
        self.app.json = OrJSONProvider(self.app)

        # Setup config
        self.config_path = Path(config_path)
        self.config = load_config(config_path=config_path)

        _ = CORS(self.app)

        server.create_all_endpoints(self)
        datasets_explorer.create_all_endpoints(self)
        alignments_explorer.create_all_endpoints(self)
