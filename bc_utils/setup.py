import argparse
import dotenv
import os

import yaml


def load_arguments():
    parser = argparse.ArgumentParser(description="Brain-cockpit backend")
    parser.add_argument(
        "--env",
        default="development",
        choices=["production", "development"],
        required=False,
    )

    return parser.parse_args()


def load_env(verbose=False):
    args = load_arguments()

    dotenv.load_dotenv()
    if args.env == "production":
        if os.path.exists(".env.production"):
            dotenv.load_dotenv(dotenv_path=".env.production", override=True)
            if verbose:
                print("Loaded .env.production")
        if os.path.exists(".env.production.local"):
            dotenv.load_dotenv(
                dotenv_path=".env.production.local", override=True
            )
            if verbose:
                print("Loaded .env.production.local")
    else:
        if os.path.exists(".env.development"):
            dotenv.load_dotenv(dotenv_path=".env.development", override=True)
            if verbose:
                print("Loaded .env.development.local")
        if os.path.exists(".env.development.local"):
            dotenv.load_dotenv(
                dotenv_path=".env.development.local", override=True
            )
            if verbose:
                print("Loaded .env.development.local")

    return args.env


def load_config(verbose=False):
    args = load_arguments()
    config = None

    if args.env == "production":
        if os.path.exists("./config.production.yaml"):
            config_path = "./config.production.yaml"
    else:
        if os.path.exists("./config.development.yaml"):
            config_path = "./config.development.yaml"
        elif os.path.exists("./config.yaml"):
            config_path = "./config.yaml"

    if verbose:
        print(f"Loaded config file {config_path}")

    with open(config_path, "r") as f:
        try:
            config = yaml.safe_load(f)
        except yaml.YAMLError as exc:
            print(exc)

    return config
