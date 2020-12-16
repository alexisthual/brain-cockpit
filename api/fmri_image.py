import dotenv
import eel
import nibabel as nib
import os

# Load environment variables
dotenv.load_dotenv()
if os.path.exists(".env.development"):
    dotenv.load_dotenv(dotenv_path=".env.development", override=True)
if os.path.exists(".env.production"):
    dotenv.load_dotenv(dotenv_path=".env.production", override=True)
if os.path.exists(".env.development.local"):
    dotenv.load_dotenv(dotenv_path=".env.development.local", override=True)
if os.path.exists(".env.production.local"):
    dotenv.load_dotenv(dotenv_path=".env.production.local", override=True)

DEBUG = os.getenv("DEBUG")

# Load nifti image
print("Loading nifti image...")
nii_file = "/home/alexis/singbrain/data/debby_t1.nii"
img = nib.load(nii_file).get_fdata()


@eel.expose
def get_sagital(x):
    if DEBUG:
        print(f"get_sagital x: {x}")
    return img[x, :, :].tolist()


@eel.expose
def get_coronal(y):
    if DEBUG:
        print(f"get_coronal y: {y}")
    return img[:, :, y].tolist()


@eel.expose
def get_horizontal(z):
    if DEBUG:
        print(f"get_horizontal z: {z}")
    return img[:, z, :].tolist()
