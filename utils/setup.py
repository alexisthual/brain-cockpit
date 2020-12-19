import argparse
import dotenv
import os


def load_arguments():
    parser = argparse.ArgumentParser(
        description="Brain-cockpit backend (eel server)"
    )
    parser.add_argument(
        "--env",
        default="development",
        choices=["production", "development"],
        required=False,
    )

    return parser.parse_args()


def load_env():
    args = load_arguments()

    dotenv.load_dotenv()
    if args.env == "production":
        if os.path.exists(".env.production"):
            dotenv.load_dotenv(dotenv_path=".env.production", override=True)
        if os.path.exists(".env.production.local"):
            dotenv.load_dotenv(
                dotenv_path=".env.production.local", override=True
            )
    else:
        if os.path.exists(".env.development"):
            dotenv.load_dotenv(dotenv_path=".env.development", override=True)
        if os.path.exists(".env.development.local"):
            dotenv.load_dotenv(
                dotenv_path=".env.development.local", override=True
            )
