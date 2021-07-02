import os

# API logic is implemented in /api
# We here load these files as independent pieces of logic
from api import app

from api.surface_contrasts import load_contrasts

# import api.surface_gradient
import api.fmri_image

# These functions are exposed for specific experiments
# whose data might not be publicly available
# import api.regressed_coordinates
# import api.correlation_maps
# import api.knn_maps

# Custom utils
import custom_utils.setup as setup

setup.load_env(verbose=True)
REACT_APP_API_PORT = os.getenv("REACT_APP_API_PORT")

if __name__ == "__main__":
    load_contrasts()
    app.run(debug=True, port=REACT_APP_API_PORT, use_reloader=True)
