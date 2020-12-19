import { MenuItem } from "@blueprintjs/core";

export enum Orientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export interface Contrast {
  index?: number;
  label?: string;
}

export interface Subject {
  index?: number;
  label?: string;
}

export enum HemisphereSide {
  LEFT = "left",
  RIGHT = "right",
  BOTH = "both",
}

export type HemisphereSideString = keyof typeof HemisphereSide;

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

  return <MenuItem key={`menuitem-${str}`} onClick={handleClick} text={str} />;
}
