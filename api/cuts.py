import dotenv
import eel
import nibabel as nib
import numpy as np
import os
import pandas as pd

# import flatbuffers
# import api.BrainCockpit.Volume

# Load contrasts
dotenv.load_dotenv()
DEBUG = os.getenv("DEBUG")
MOCK_CUTS = os.getenv("MOCK_CUTS")
CUTS_DATA_PATH = os.getenv("CUTS_DATA_PATH")

ANY_DATA = (CUTS_DATA_PATH is not None) or (MOCK_CUTS is not None)

if ANY_DATA:  # noqa: C901 <- it's absurd that I have to write this
    import nilearn.image
    from nilearn.image.resampling import coord_transform
    from nilearn.datasets import fetch_spm_auditory
    from nilearn.image import concat_imgs, mean_img
    from nilearn.glm.first_level import FirstLevelModel
    from nilearn._utils.niimg import _safe_get_data
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.io import to_json
    from scipy.stats import zscore
    import pickle
    import json

    # import asyncio
    # import websockets

    # builder = flatbuffers.Builder(1024)

    import matplotlib

    matplotlib.use("Agg")  # Make it headless
    import matplotlib.pyplot as plt
    import mpld3

    print("Loading fMRI SPM data...")

    class LoadedSubject:
        subject = None
        task = None
        anat = None
        fmri_glm = None
        contrast = None
        bs_json = None
        img = None
        threshold = None

        def __init__(self):
            return None

    currentSub = LoadedSubject()

    @eel.expose
    def get_available_subject_tasks():
        print("Sending tasklist")
        # This should read directly from the BIDS format
        if MOCK_CUTS is None or not MOCK_CUTS:
            subjects = [f"sub-100{i+1}" for i in range(5)]
            tasks = ["geomloc", "passivestatic", "passiveseq"]
            return {
                "subList": subjects,
                "taskList": tasks,
                "contrastList": ["press_right"],
            }
        else:
            return {
                "subList": ["NA"],
                "taskList": ["NA"],
                "contrastList": ["active - rest"],
            }

    @eel.expose
    def update_glm(sub, task):
        if sub == "" or task == "":
            print(f"Not loading glm for subject='{sub}' and task='{task}'")
            return "Won't load"
        if currentSub.subject == sub and currentSub.task == task:
            print(f"Already loaded glm for subject='{sub}' and task='{task}'")
            return "Loaded"
        print(f"Loading glm for subject='{sub}' and task='{task}'")
        currentSub.subject = sub
        currentSub.task = task
        if MOCK_CUTS is None or not MOCK_CUTS:
            anat = nilearn.image.load_img(
                f"{CUTS_DATA_PATH}/derivatives/fmriprep/{sub}/ses-01/anat/{sub}_ses-01_space-MNI152NLin2009cAsym_desc-preproc_T1w.nii.gz"
            )
            currentSub.anat = _safe_get_data(anat, ensure_finite=True)
            modelname = f"{CUTS_DATA_PATH}/derivatives/nilearn/{sub}/ses-01/func/{sub}_ses-01_task-{task}"
            currentSub.fmri_glm = pickle.load(
                open(f"{modelname}_model-spm.pkl", "rb")
            )
        else:
            subject_data = fetch_spm_auditory()
            fmri_img = concat_imgs(subject_data.func)
            events = pd.read_table(subject_data["events"])
            currentSub.fmri_glm = FirstLevelModel(
                t_r=7, minimize_memory=False
            ).fit(fmri_img, events)
            anat = mean_img(fmri_img)
            currentSub.anat = _safe_get_data(anat, ensure_finite=True)
        return "Loaded"  # What is the unit type in python? None?

    @eel.expose
    def update_contrast(contrast, threshold):
        print(f"Updateing images for `{contrast}` at t-threshold {threshold}")
        if (
            threshold != currentSub.threshold
            or contrast != currentSub.contrast
        ):
            print("\tThis requires an update, performing")
            currentSub.threshold = threshold
            currentSub.contrast = contrast
            img = currentSub.fmri_glm.compute_contrast(currentSub.contrast)
            currentSub.img = _safe_get_data(img, ensure_finite=True)
        return "Updated"

    @eel.expose
    def get_brain():
        data = currentSub.anat
        data = (255 * (data / np.max(data))).astype(np.uint8).tobytes()
        # size = len(data)
        # api.BrainCockpit.Volume.VolumeStartVoxelsVector(builder, size)
        # builder.head = builder.head - (size)
        # builder.Bytes[builder.head : (builder.head + size)] = data
        # bdata = builder.EndVector(size)
        # builder.Finish(bdata)
        # bdata = builder.Output()
        # with open("/tmp/bytes", "wb") as f:
        # f.write(bdata)
        # with open("/tmp/json", "w") as f:
        # data = cast_to_uint_for_eel(currentSub.anat)
        # print(data)
        # json.dump(data, f)
        # assert(False)
        print(data)
        return {"raw": data}

    def cast_to_uint_for_eel(data):
        # TODO : if this takes too long we should do it once and for all early
        return (255 * (data / np.max(data))).astype(np.uint8).tolist()

    @eel.expose
    def get_slice_sagital(slices):
        print("sending sagital")
        return cast_to_uint_for_eel(currentSub.anat[slices, :, :])

    @eel.expose
    def get_slice_coronal(slices):
        return cast_to_uint_for_eel(currentSub.anat[:, slices, :])

    @eel.expose
    def get_slice_horizontal(slices):
        return cast_to_uint_for_eel(currentSub.anat[:, :, slices])

    @eel.expose
    def get_t_at_coordinate(coord):
        print(f"Sending t-value at {coord}")
        if currentSub.img is not None:
            shape = currentSub.img.shape
            if coord[0] is not None:
                return currentSub.img[
                    shape[0] - 1 - coord[0], coord[1], coord[2]
                ]
            else:
                return currentSub.img[
                    shape[0] - 1 - (shape[0] / 2), shape[1] / 2, shape[2] / 2
                ]
        else:
            return 0

    @eel.expose
    def get_callbacks(mni):
        print("Sending callbacks")
        return []

    # async def echo(websocket, path):
    # async for message in websocket:
    # if message == "get_brain":
    # await websocket.send(get_brain())

    # asyncio.get_event_loop().run_until_complete(
    # websockets.serve(echo, 'localhost', 9443))
    # asyncio.get_event_loop().run_forever()
