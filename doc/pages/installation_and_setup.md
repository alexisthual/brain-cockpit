# Installation and Setup

This page contains instructions as to how to install `brain-cockpit` on your local or distant machine.

## Installation

### Copy the code

Clone the `brain-cockpit` repo on your machine:

```bash
git clone https://github.com/alexisthual/brain-cockpit.git
cd brain-cockpit
```

### Setup the server

Install server dependencies in a python environment.
For instance, using `conda`, you can run

```bash
conda env create -n brain-cockpit python=3.10 -y
```

Activate it with

```bash
conda activate brain-cockpit
```

Finally install all dependencies with

```bash
pip install -e .
```

### Setup the client

`yarn` needs to be installed on your machine.
Check [their documentation](https://classic.yarnpkg.com/en/docs/install) for instructions on how to install it.

In the `web` folder, install client dependencies with:

```bash
cd web
yarn install
```

#### Overwrite default environment variables

Default environment variables for the front-end are initiated in `.env`.
They contain the backend address, which should be default be correct if you plan
on using brainc-cockpit on your local machine

You can overwrite these by creating other environment files suited to your needs.
Check out [all other possibilities](https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used) allowed by `create-react-app`.

## Dataset setup

`brain-cockpit` (`bc`) allows you to browse multiple datasets.
A dataset is a collection of gifti files.
These files need to be listed in a CSV file.

For a given dataset, we recommend that you organize your folder structure as follows:

```text
.
└── your-dataset/
    ├── data.csv
    ├── feature_maps/
    │   ├── map1.gii.gz
    │   ├── map2.gii.gz
    │   └── ...
    └── meshes/
        ├── fsaverage5_pial_left.gii.gz
        ├── fsaverage5_pial_right.gii.gz
        ├── fsaverage5_infl_left.gii.gz
        ├── fsaverage5_infl_right.gii.gz
        └── ...
```

where `feature_maps` are a collection of gifti surface maps and `meshes`
are the meshes on which these surface maps should be plotted.

This CSV file (`data.csv` in our example) listing these feature maps
is expected to have the following format:

- it should contain a header listing available columns
- available columns should include `subject`, `side`, `task`, `contrast`, `mesh`, `path` and `mesh_path`
- in every row, each column should have a non-null value

| Column name | Description and requirements                                               |
| ----------- | -------------------------------------------------------------------------- |
| `subject`   | Subject's label displayed in `bc`                                          |
| `side`      | Either `lh` or `rh` (left or right hemisphere)                             |
| `task`      | A label describing the task this map belongs to                            |
| `contrast`  | A label describing the contrast this map represents                        |
| `mesh`      | A label describing the mesh the features lies on                           |
| `path`      | A path (relative or absolute) to the feature map                           |
| `mesh_path` | A path (relative or absolute) to the mesh on which to plot the feature map |

Here is an example of a correct `data.csv` file adapted to the previous folder structure:

```text
subject,side,task,contrast,mesh,path,mesh_path
sub-01,lh,funcloc,face,fsaverage5,feature_maps/map1.gii.gz,meshes/fsaverage_pial_left.gii
sub-01,rh,funcloc,face,fsaverage5,feature_maps/map2.gii.gz,meshes/fsaverage_pial_right.gii
sub-02,lh,funcloc,face,fsaverage5,feature_maps/map3.gii.gz,meshes/fsaverage_pial_left.gii
sub-02,rh,funcloc,face,fsaverage5,feature_maps/map4.gii.gz,meshes/fsaverage_pial_right.gii
```

This dataset contains 2 subjects, each of whom has 2 surface maps available
(one for the left hemisphere, the other for the right hemisphere).

## Brain-cockpit configuration

Your `brain-cockpit` instance needs to be configured to know which dataset it should display.

```yaml
allow_very_unsafe_file_sharing: true
cache_folder: /tmp/brain-cockpit
alignments:
  datasets:
    dataset-name-which-will-appear-in-url:
      name: Dataset name
      path: /path/to/alignment/data.csv
features:
  datasets:
    dataset-name-which-will-appear-in-url:
      name: Dataset name
      path: /path/to/features/data.csv
      unit: Label displayed on colorbar
      mesh_types:
        default: pial
        other:
          - infl
          - sphere
          - white
```

## Run

### Application in dev mode

In separate prompts:

- in `./api`, start the backend with `python main.py --env dev --config path/to/bc_config.yaml` (using your `brain-cockpit` conda env)
- in `./web`, start the client with run `yarn start`

### Application in production mode

In separate prompts:

- in `./api`, start the backend with `python main.py --env production --config path/to/bc_config.yaml` (using your `brain-cockpit` conda env)
- build the frontend with `yarn build`
