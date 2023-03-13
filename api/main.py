import argparse

from brain_cockpit import BrainCockpit
from waitress import serve

PORT = 5000
THREADS = 2

parser = argparse.ArgumentParser(description="Brain-cockpit backend")

parser.add_argument(
    "--env",
    type=str,
    default="dev",
    choices=["prod", "dev"],
    required=False,
    help="Deployment env type",
)

parser.add_argument(
    "--config",
    type=str,
    default=None,
    required=False,
    help="Path to brain-cockpit server config file",
)

parser.add_argument(
    "--port",
    type=int,
    default=None,
    required=False,
    help="Port",
)

parser.add_argument(
    "--threads",
    type=int,
    default=None,
    required=False,
    help="Number of threads",
)

if __name__ == "__main__":
    args = parser.parse_args()

    bc = BrainCockpit(config_path=args.config)

    if args.env == "prod":
        # In production, serve flask app through waitress
        serve(
            bc.app,
            host="0.0.0.0",
            port=args.port or PORT,
            threads=args.threads or THREADS,
        )
    else:
        # Otherwise, serve app with hot reloader
        bc.app.run(debug=True, port=args.port or PORT, use_reloader=True)
