"""Util functions used throughout brain-cockpit."""

import functools
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
    """Return rich progress bar."""
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
    """Return joblib memory."""
    return Memory(bc.config["cache_folder"], verbose=0)


def bc_cache(bc):
    """Cache functions with brain-cockpit cache."""

    def _inner_decorator(func):
        @functools.wraps(func)
        def wrapped(*args, **kwargs):
            # Use joblib cache if and only if cache_folder is defined
            if (
                bc.config["cache_folder"] is not None
                and bc.config["cache_folder"] != ""
            ):
                console.log(f"Using cache {bc.config['cache_folder']}")
                mem = get_memory(bc)
                return mem.cache(func)(*args, **kwargs)
            else:
                console.log("Not using cache for dataset")
                return func(*args, **kwargs)

        return wrapped

    return _inner_decorator


def load_config(config_path=None, verbose=False):
    """Load brain-cockpit yaml config from path."""
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
    """Load dataset CSV file.

    Returns
    -------
    df: pandas Dataframe
        Dataset metadata from CSV file
    path: pathlib.Path
        Path to dataset CSV file
    """
    # Successively try
    # 1. absolute dataset path
    # 2. relative path from config folder
    if Path(dataset_path).is_absolute():
        path = Path(dataset_path)
    else:
        path = Path(config_path).parent / dataset_path

    df = pd.read_csv(path)

    return df, path
