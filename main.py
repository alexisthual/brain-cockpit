import os
from waitress import serve

# API logic is implemented in /api
# We here load these files as independent pieces of logic
from api import app

from api import datasets_explorer, alignments_explorer

# Custom utils
import bc_utils.setup as setup

env = setup.load_env(verbose=True)
N_JOBS = os.getenv("N_JOBS")
REACT_APP_API_PORT = os.getenv("REACT_APP_API_PORT")


# Define util function to load all data
def create_app():
    datasets_explorer.create_all_endpoints()
    alignments_explorer.create_all_endpoints()

    return app


if __name__ == "__main__":
    flask_app = create_app()

    if env == "production":
        # In production, serve flask app through waitress
        serve(
            flask_app, host="0.0.0.0", port=REACT_APP_API_PORT, threads=N_JOBS
        )
    else:
        # Otherwise, serve app with hot reloader
        flask_app.run(debug=True, port=REACT_APP_API_PORT, use_reloader=True)
