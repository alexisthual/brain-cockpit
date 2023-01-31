import chroma from "chroma-js";
import { MenuItem } from "@blueprintjs/core";
import { useRef, useEffect } from "react";
import type { MutableRefObject } from "react";

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
    .scale(["#7b3294", "#c2a5cf", "#d0d0d0", "#a6dba0", "#008837"])
    .mode("lab"),
  diverging_temperature: chroma
    .scale(["#0571b0", "#92c5de", "#c4c4c4", "#f4a582", "#ca0020"])
    .mode("lab"),
  single_diverging_heat: chroma
    .scale(["#c4c4c4", "#f4a582", "#ca0020"])
    .mode("lab"),
  single_diverging_heat_r: chroma
    .scale(["#ca0020", "#f4a582", "#c4c4c4"])
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

export interface DatasetDescriptions {
  [protocol: string]: {
    description: string;
    maps: {
      [condition: string]: string;
    };
  };
}

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

//
// Utils for Select ojects
//

export const highlightText = (text: string, query: string) => {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }
  const regexp = new RegExp(words.join("|"), "gi");
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
};

const escapeRegExpChars = (text: string) => {
  return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
};

export function stringRenderer(
  str: string,
  { handleClick, modifiers, query }: any
) {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return (
    <MenuItem
      key={`menu-item-${str}`}
      active={modifiers.active}
      onClick={handleClick}
      text={highlightText(str, query)}
    />
  );
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

//
// GLOBAL UTIL FUNCTIONS
//

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

export function usePrevious<T>(
  value: T
): MutableRefObject<T | undefined>["current"] {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
