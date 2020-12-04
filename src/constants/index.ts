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

export enum MeshType {
  PIAL = "pial",
  INFL = "infl",
}

export type MeshTypeString = keyof typeof MeshType;
