import numpy as np
from flask import Flask
from flask_cors import CORS
from simplejson import JSONEncoder

# Common variable which will be shared
# across files of the api folder/module
app = Flask(__name__)
cors = CORS(app)


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


app.json_encoder = StrictEncoder
