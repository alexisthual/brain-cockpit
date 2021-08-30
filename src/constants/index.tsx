import chroma from "chroma-js";
import { MenuItem } from "@blueprintjs/core";

export const colormaps = {
  // Generated using python package bokey
  // import bokey.palettes as bp
  // bp.plasma(4)
  // Using too many colors in bezier crashes the app
  batlow: chroma
    .bezier(["#011959", "#205E61", "#7F8133", "#F19D6B", "#FACCFA"])
    .scale()
    .mode("lab")
    .correctLightness(),
  plasma: chroma
    .bezier(["#0C0786", "#9B179E", "#EC7853", "#EFF821"])
    .scale()
    .mode("lab")
    .correctLightness(),
  plasma_r: chroma
    .bezier(["#EFF821", "#EC7853", "#9B179E", "#0C0786"])
    .scale()
    .mode("lab")
    .correctLightness(),
  magma: chroma
    .bezier(["#000003", "#711F81", "#F0605D", "#FBFCBF"])
    .scale()
    .mode("lab")
    .correctLightness(),
  magma_r: chroma
    .bezier(["#FBFCBF", "#F0605D", "#711F81", "#000003"])
    .scale()
    .mode("lab")
    .correctLightness(),
  viridis: chroma
    .bezier(["#440154", "#30678D", "#35B778", "#FDE724"])
    .scale()
    .mode("lab")
    .correctLightness(),
  // Find more on https://colorbrewer2.org
  sequential: chroma
    .bezier(["#225ea8", "#41b6c4", "#a1dab4", "#ffffcc"])
    .scale()
    .mode("lab")
    .correctLightness(),
  diverging: chroma
    // .bezier(["#e66101", "#fdb863", "#d4d0d0", "#b2abd2", "#5e3c99"])
    .bezier(["#7b3294", "#c2a5cf", "#d4d0d0", "#a6dba0", "#008837"])
    .scale()
    .mode("lab"),
  diverging_temperature: chroma
    .bezier(["#0571b0", "#92c5de", "#c4c4c4", "#f4a582", "#ca0020"])
    .scale()
    .mode("lab"),
  single_diverging_heat: chroma
    .bezier(["#c4c4c4", "#f4a582", "#ca0020"])
    .scale()
    .mode("lab"),
  single_diverging_heat_r: chroma
    .bezier(["#ca0020", "#f4a582", "#c4c4c4"])
    .scale()
    .mode("lab"),
} as Record<string, chroma.Scale>;

export enum View {
  LATERAL = "lateral",
  FRONTAL = "frontal",
  MEDIAL = "medial",
  DORSAL = "dorsal",
}

export enum Orientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export interface Contrast {
  index: number;
  label: ContrastLabel;
}

export type ContrastLabel = {
  task: string;
  contrast: string;
};

export const contrastLabelToId = (label: ContrastLabel) => {
  return `${label.task}-${label.contrast}`;
};

export interface Subject {
  index: number;
  label: string;
}

export enum HemisphereSide {
  LEFT = "left",
  RIGHT = "right",
  BOTH = "both",
}

export type HemisphereSideString = keyof typeof HemisphereSide;

export enum MeshSupport {
  FSAVERAGE5 = "fsaverage5",
  // FSAVERAGE6 = "fsaverage6",
  FSAVERAGE7 = "fsaverage7",
  INDIVIDUAL = "individual",
}

export enum MeshType {
  PIAL = "pial",
  WHITE = "white",
  INFL = "infl",
}

export type MeshTypeString = keyof typeof MeshType;

export enum SurfaceMapType {
  SEED_BASED = "seed-based",
  M_DISTANCE = "m-distance",
}

export type SurfaceMapTypeString = keyof typeof SurfaceMapType;

export enum Metric {
  COSINE = "cosine",
}

export type MetricString = keyof typeof Metric;

// Utils for Select ojects
export function stringRenderer(
  str: string,
  { handleClick, modifiers, query }: any
) {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return <MenuItem key={`menu-item-${str}`} onClick={handleClick} text={str} />;
}

export type ActionLabel = {
  type?: "increment" | "decrement";
  payload?: number;
};

export type ActionPane = {
  type?: "add" | "remove";
  payload?: string;
};

export const modulo = (a: number, n: number) => {
  return ((a % n) + n) % n;
};

export enum GradientMode {
  NONE = "NONE",
  LOCAL = "LOCAL",
}

export enum SurfaceMode {
  CONTRAST = "CONTRAST",
  GRADIENT = "GRADIENT",
}

// FUNCTIONS
export const getMax = (arr: any[] | undefined | null) => {
  let max = undefined;

  if (arr !== undefined && arr !== null) {
    let len = arr.length;
    max = -Infinity;

    while (len--) {
      max = arr[len] > max ? arr[len] : max;
    }
  }

  return max;
};

export const getMin = (arr: any[] | undefined | null) => {
  let min = undefined;

  if (arr !== undefined && arr !== null) {
    let len = arr.length;
    min = Infinity;

    while (len--) {
      min = arr[len] < min ? arr[len] : min;
    }
  }

  return min;
};
