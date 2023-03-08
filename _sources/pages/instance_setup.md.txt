# Setup an instance

## Install

### Dependencies

```bash
yarn install
conda env create -f environment.yml
```

Once the `conda` environment is created, activate it with

```bash
conda activate brain-cockpit
```

#### Updating dependencies after installation

Dependencies in `package.json` and `environment.yml` might evolve quickly. In order to update your local environment, run the following commands:

```bash
yarn install
conda env update --file environment.yml
```

### Generate assets (3D meshes)

This command generates `fsaverage` meshes from `nilearn` and stores them in `./public/assets`

```bash
python bc_utils/gifty_to_gltf.py
```

### Download IBC contrasts

Projected contrasts are available at `/storage/store2/work/athual/data/ibc_surface_conditions_db.zip`. You most likely want to download and unzip this archive locally:

```bash
scp username@drago2:/storage/store2/work/athual/data/ibc_surface_conditions_db.zip /path/to/archive
unzip /path/to/ibc_surface_conditions_db.zip
```

### Overwrite default environment variables

Default environment variables are initiated in `.env`.
You can overwrite these by creating a `.env.development.local` file suited to your needs.
In particular, you most likely want to set `DATA_PATH` to point to downloaded IBC contrasts.

If you need a more custom `.env` files setup, check out [all other possibilities](https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used) allowed by `create-react-app`.

## Run

### Application in dev mode

In separate prompts:

- start the frontend with `yarn start`
- start the backend with `python main.py` (using your `brain-cockpit` conda env)

### Application in production mode

In separate prompts:

- build the frontend with `yarn build`
- start the backend with `python main.py --env production` (using your `brain-cockpit` conda env)

### Custom utilitaries

#### Functional images resampling

This will resample functional images contained in `SLICE_DATA_PATH`, to later be displayed in `brain-cockpit`.

```bash
python bc_utils/resample_functional_images.py --env {development, production}
```