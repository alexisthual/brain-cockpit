import os

from pathlib import Path

import pandas as pd
import yaml

from joblib import Memory
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

# `rich` console used throughout the codebase
console = Console()


# `rich` progress bar used throughout the codebase
def get_progress(**kwargs):
    return Progress(
        SpinnerColumn(),
        TaskProgressColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        "<",
        TimeRemainingColumn(),
        **kwargs,
    )


def get_memory(bc):
    return Memory(bc.config["cache_folder"], verbose=0)


def load_config(config_path=None, verbose=False):
    config = None

    if config_path is not None and os.path.exists(config_path):
        if verbose:
            console.log(f"Loading config file {config_path}")

        with open(config_path, "r") as f:
            try:
                config = yaml.safe_load(f)
            except yaml.YAMLError as exc:
                console.log(exc, style="yellow")
    else:
        console.log("Missing config file", style="yellow")

    return config


def load_dataset_description(config_path=None, dataset_path=None):
    # Successively try
    # 1. absolute dataset path
    # 2. relative path from config folder
    if Path(dataset_path).is_absolute():
        df = pd.read_csv(dataset_path)
    else:
        df = pd.read_csv(Path(config_path).parent / dataset_path)

    return df
