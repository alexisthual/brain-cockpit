# Brain cockpit

![GitHub license](https://img.shields.io/badge/VERSION-0.1.0-black.svg?style=for-the-badge)
![Python version](https://img.shields.io/badge/PYTHON-3.7-black.svg?style=for-the-badge)

`brain-cockpit` is a Typescript and Python application meant to help explore fMRI datasets.
It comes as a React application making calls to Python functions through an [`eel`](https://github.com/samuelhwilliams/Eel) server.

For now, it consists of a sole view to help looking at IBC contrasts projected on `fsaverage`. Key features include selecting subject, selecting contrast, and clicking on voxel to display its functional fingerprint.
Keys `J`, `L` allow one to switch between contrasts, `I`, `K` between subjects.

![Screenshot](https://mybox.inria.fr/thumbnail/192bdcc47f8c4decbac7/1024/Screenshot%20from%202020-12-07%2012-23-45.png)

## Install

### Dependencies

```
yarn install
conda env create -f environment.yml
```

Once the `conda` environment is created, activate it with

```
conda activate brain-cockpit
```

#### Updating dependencies after installation

Dependencies in `package.json` and `environment.yml` might evolve quickly. In order to update your local environment, run the following commands:

```
yarn install
conda env update --file environment.yml
```

### Generate assets (3D meshes)

This command generates `fsaverage` meshes from `nilearn` and stores them in `./public/assets`

```
python custom_utils/gifty_to_gltf.py
```

### Download IBC contrasts

Projected contrasts are available at `/storage/store2/work/athual/data/ibc_surface_conditions_db.zip`. You most likely want to download and unzip this archive locally:

```
scp username@drago2:/storage/store2/work/athual/data/ibc_surface_conditions_db.zip /path/to/archive
unzip /path/to/ibc_surface_conditions_db.zip
```

### Overwrite default environment varaibles

Default environment variables are initiated in `.env`.
You can overwrite these by creating a `.env.local` file suited to your needs.
In particular, you most likely want to set `DATA_PATH` to point to downloaded IBC contrasts.

If you need a more custom `.env` files setup, check out [all other possibilities](https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used) allowed by `create-react-app`.

## Run

### Dev mode

In separate prompts:

- start the frontend with `yarn start`
- start the backend with `python main.py` (using your `brain-cockpit` conda env)

## Contributing

Commits must validate a pre-commit routine launched by a git hook.
To enable this hook locally, run

```
pre-commit install
```
