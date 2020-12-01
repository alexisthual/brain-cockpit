import nilearn.plotting
from nilearn.plotting.js_plotting_utils import colorscale


def generate_bs(img, bg_img, threshold):
    """
    Generate the json with base64 images + parameters to feed brainsprite
    This is close to being something that could be exported by nilearn's viewer
    stuff
    """
    cmap = nilearn.plotting.cm.cold_hot
    (
        mask_img,
        stat_map_img,
        data,
        threshold,
    ) = nilearn.plotting.html_stat_map._mask_stat_map(img, threshold)
    colors = colorscale(
        cmap,
        data.ravel(),
        threshold=threshold,
        symmetric_cmap=True,
        vmax=None,
        vmin=None,
    )

    # Prepare the data for the cuts
    (
        bg_img,
        bg_min,
        bg_max,
        black_bg,
    ) = nilearn.plotting.html_stat_map._load_bg_img(stat_map_img, bg_img)
    (
        stat_map_img,
        mask_img,
    ) = nilearn.plotting.html_stat_map._resample_stat_map(
        stat_map_img, bg_img, mask_img
    )

    # Now create a json-like object for the viewer, and converts in html
    json_view = nilearn.plotting.html_stat_map._json_view_data(
        bg_img, stat_map_img, mask_img, bg_min, bg_max, colors, cmap, True
    )

    json_view["params"] = nilearn.plotting.html_stat_map._json_view_params(
        stat_map_img.shape,
        stat_map_img.affine,
        colors["vmin"],
        colors["vmax"],
        (32, 32, 32),
    )
    json_view["params"]["colorFont"] = "#FFFFFF"
    json_view["params"]["colorBackground"] = "#000000"

    return json_view
