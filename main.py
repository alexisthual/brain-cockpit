import dotenv
import eel
import os

# API logic is implemented in /api
# We here load these files as independent pieces of logic
import api.surface_contrasts
import api.cuts

# These functions are exposed for specific experiments
# whose data might not be publicly available
import api.regressed_coordinates
import api.correlation_maps

dotenv.load_dotenv()
if os.path.exists(".env.development"):
    dotenv.load_dotenv(dotenv_path=".env.development", override=True)
if os.path.exists(".env.production"):
    dotenv.load_dotenv(dotenv_path=".env.production", override=True)
if os.path.exists(".env.development.local"):
    dotenv.load_dotenv(dotenv_path=".env.development.local", override=True)
if os.path.exists(".env.production.local"):
    dotenv.load_dotenv(dotenv_path=".env.production.local", override=True)

REACT_APP_API_PORT = os.getenv("REACT_APP_API_PORT")


@eel.expose
def server_log(message):
    print(message)


# When all websockets are closed, the eel server shuts down.
# One can prevent it from doing so (useful for development purposes).
def no_stop(page, sockets):
    pass


print("Serving...")
eel.init("src", [".tsx", ".ts", ".jsx", ".js", ".html"])
eel.start(
    {"port": 3000},
    app=None,
    mode=None,
    close_callback=no_stop,
    host="localhost",
    port=REACT_APP_API_PORT,
)
