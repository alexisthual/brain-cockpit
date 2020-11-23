# Brain cockpit

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

### Generate assets (3D meshes)

This command generates `fsaverage` meshes from `nilearn` and stores them in `./public/assets`

```
python3 gifty_to_gltf.py
```

### Contributions

Commits must validate a pre-commit routine launched by a git hook.
To enable this hook locally, run

```
pre-commit install
```

## Run

### Dev mode

Run in separate prompts:

```
yarn start
```

```
python3 main.py
```
