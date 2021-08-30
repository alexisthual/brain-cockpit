import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import InfoPanel, { InputType } from "components/infoPanel";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  colormaps,
  Contrast,
  ContrastLabel,
  getMax,
  getMin,
  GradientMode,
  HemisphereSide,
  MeshSupport,
  MeshType,
  modulo,
  Subject,
  SurfaceMode,
} from "constants/index";
import PaneButtons from "./buttons";

interface Props {
  closeCallback: () => void;
  colormapName?: string;
  subjectLabels: string[];
  contrastLabels: ContrastLabel[];
  sharedState: boolean;
  sharedSubject?: Subject;
  sharedContrast?: Contrast;
  sharedSurfaceMap?: number[];
  sharedMeanSurfaceMap: boolean;
  sharedMeshGradient?: number[];
  sharedGradient?: number[][];
  sharedVoxelIndex?: number;
  setSharedVoxelIndex?: (voxelIndex: number) => void;
  sharedWireframe: boolean;
  sharedMeshType: MeshType;
  sharedMeshSupport: MeshSupport;
  sharedHemi: HemisphereSide;
  filterSurface?: boolean;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
  showGridHelper?: boolean;
  gradientMode?: GradientMode;
  surfaceMode?: SurfaceMode;
}

const ScenePane = ({
  closeCallback = () => {},
  colormapName = "plasma",
  subjectLabels = [],
  contrastLabels = [],
  sharedState = false,
  sharedSubject,
  sharedContrast,
  sharedSurfaceMap,
  sharedMeanSurfaceMap = false,
  sharedGradient,
  sharedVoxelIndex,
  setSharedVoxelIndex = () => {},
  sharedWireframe = false,
  sharedMeshType = MeshType.PIAL,
  sharedMeshSupport = MeshSupport.FSAVERAGE5,
  sharedHemi = HemisphereSide.LEFT,
  filterSurface,
  lowThresholdMin,
  lowThresholdMax,
  highThresholdMin,
  highThresholdMax,
  showGridHelper,
  gradientMode,
  surfaceMode,
}: Props) => {
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [meanSurfaceMap, setMeanSurfaceMap] = useState(false);
  const [gradient, setGradient] = useState<number[][] | undefined>();
  const [loadingGradient, setLoadingGradient] = useState(false);
  const [wireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
  const [meshSupport, setMeshSupport] = useState(MeshSupport.FSAVERAGE5);
  const [hemi, setHemi] = useState(HemisphereSide.LEFT);
  const panelEl = useRef<HTMLDivElement>(null);

  const subjectReducer = (state: Subject, action: ActionLabel): Subject => {
    let newIndex = state.index;
    let n = subjectLabels.length;
    switch (action.type) {
      case "increment":
        newIndex = modulo((state.index ?? 0) + 1, n);
        break;
      case "decrement":
        newIndex = modulo((state.index ?? 0) - 1, n);
        break;
      default:
        newIndex = modulo(action.payload ?? 0, n);
        break;
    }
    return {
      index: newIndex,
      label: subjectLabels[newIndex],
    };
  };
  const [subject, setSubject] = useReducer(subjectReducer, {} as Subject);
  if (subjectLabels.length > 0 && subject.index === undefined) {
    setSubject({ payload: 0 });
  }

  const contrastReducer = (state: Contrast, action: ActionLabel): Contrast => {
    let newIndex = state.index;
    let n = contrastLabels.length;
    switch (action.type) {
      case "increment":
        newIndex = modulo((state.index ?? 0) + 1, n);
        break;
      case "decrement":
        newIndex = modulo((state.index ?? 0) - 1, n);
        break;
      default:
        newIndex = modulo(action.payload ?? 0, n);
        break;
    }
    return {
      index: newIndex,
      label: contrastLabels[newIndex],
    };
  };
  const [contrast, setContrast] = useReducer(contrastReducer, {} as Contrast);
  if (contrastLabels.length > 0 && contrast.index === undefined) {
    setContrast({ payload: 0 });
  }

  // Set key events

  // L
  const incrementContrast = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 76) {
        if (!sharedState) {
          setContrast({ type: "increment" });
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", incrementContrast);
    return () => window.removeEventListener("keydown", incrementContrast);
  }, [incrementContrast]);

  // J
  const decrementContrast = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 74) {
        if (!sharedState) {
          setContrast({ type: "decrement" });
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", decrementContrast);
    return () => window.removeEventListener("keydown", decrementContrast);
  }, [decrementContrast]);

  // I
  const incrementSubject = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 73) {
        if (!sharedState && !meanSurfaceMap) {
          setSubject({ type: "increment" });
        }
      }
    },
    [sharedState, meanSurfaceMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", incrementSubject);
    return () => window.removeEventListener("keydown", incrementSubject);
  }, [incrementSubject]);

  // K
  const decrementSubject = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 75) {
        if (!sharedState && !meanSurfaceMap) {
          setSubject({ type: "decrement" });
        }
      }
    },
    [sharedState, meanSurfaceMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", decrementSubject);
    return () => window.removeEventListener("keydown", decrementSubject);
  }, [decrementSubject]);

  // U
  const toggleMeanContrastMap = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 85) {
        if (!sharedState) {
          setMeanSurfaceMap((prevMeanSurfaceMap) => !prevMeanSurfaceMap);
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", toggleMeanContrastMap);
    return () => window.removeEventListener("keydown", toggleMeanContrastMap);
  }, [toggleMeanContrastMap]);

  // X
  const closePane = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (
        (event.isComposing || event.keyCode === 88) &&
        panelEl.current !== null &&
        panelEl.current.matches(":hover")
      ) {
        closeCallback();
      }
    },
    [closeCallback]
  );
  useEffect(() => {
    window.addEventListener("keydown", closePane);
    return () => window.removeEventListener("keydown", closePane);
  }, [closePane]);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      setLoadingSurfaceMap(true);
      if (meanSurfaceMap) {
        server
          .get(
            surfaceMode === SurfaceMode.GRADIENT
              ? "/contrast_gradient_norm_mean"
              : "/contrast_mean",
            {
              params: {
                contrast_index: contrast.index,
                hemi: hemi,
                mesh: meshSupport,
              },
            }
          )
          .then((response: AxiosResponse<number[]>) => {
            setSurfaceMap(response.data);
            setLoadingSurfaceMap(false);
          });
      } else if (subject.index !== undefined) {
        server
          .get(
            surfaceMode === SurfaceMode.GRADIENT
              ? "/contrast_gradient_norm"
              : "/contrast",
            {
              params: {
                subject_index: subject.index,
                contrast_index: contrast.index,
                hemi: hemi,
                mesh: meshSupport,
              },
            }
          )
          .then((response: AxiosResponse<number[]>) => {
            setSurfaceMap(response.data);
            setLoadingSurfaceMap(false);
          });
      } else {
        setLoadingSurfaceMap(false);
      }

      // Load surfacemap gradient
      setLoadingGradient(true);
      switch (gradientMode) {
        case GradientMode.LOCAL:
          if (subject.index !== undefined) {
            server
              .get("/contrast_gradient", {
                params: {
                  subject_index: subject.index,
                  contrast_index: contrast.index,
                  mesh: meshSupport,
                },
              })
              .then((response: AxiosResponse<number[][]>) => {
                setGradient(response.data);
                setLoadingGradient(false);
              });
          }
          break;
        default:
          setLoadingGradient(false);
          break;
      }
    }
  }, [
    subject,
    contrast,
    meanSurfaceMap,
    hemi,
    gradientMode,
    surfaceMode,
    meshSupport,
  ]);

  return (
    <div className="scene" ref={panelEl}>
      <PaneButtons closeCallback={closeCallback} />
      {!sharedState ? (
        <InfoPanel
          rows={[
            {
              label: "Mesh Support",
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  value: meshSupport,
                  values: Object.keys(MeshSupport),
                  onChangeCallback: (newValue: string) =>
                    setMeshSupport(
                      MeshSupport[newValue as keyof typeof MeshSupport]
                    ),
                },
              ],
            },
            {
              label: "Mesh Type",
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  value: sharedState ? sharedMeshType : meshType,
                  values: Object.keys(MeshType),
                  onChangeCallback: (newValue: string) =>
                    setMeshType(MeshType[newValue as keyof typeof MeshType]),
                },
              ],
            },
            {
              label: "Hemi",
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  value: sharedState ? sharedHemi : hemi,
                  values: Object.keys(HemisphereSide),
                  onChangeCallback: (newValue: string) =>
                    setHemi(
                      HemisphereSide[newValue as keyof typeof HemisphereSide]
                    ),
                },
              ],
            },
            {
              label: "Subject",
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  value: subject.label,
                  values: subjectLabels,
                  onChangeCallback: (newValue: string) =>
                    setSubject({ payload: subjectLabels.indexOf(newValue) }),
                },
                {
                  inputType: InputType.BUTTON,
                  value: meanSurfaceMap,
                  onChangeCallback: () => setMeanSurfaceMap(!meanSurfaceMap),
                  iconActive: "group-objects",
                  iconInactive: "ungroup-objects",
                  title: "Mean across subjects",
                },
              ],
            },
            {
              label: "Contrast",
              inputs: [
                {
                  inputType: InputType.SELECT_CONTRAST,
                  value: contrast.label,
                  values: contrastLabels,
                  onChangeCallback: (newValue: ContrastLabel) =>
                    setContrast({
                      payload: contrastLabels.indexOf(newValue),
                    }),
                },
              ],
            },
            {
              label: "Voxel",
              inputs: [
                {
                  inputType: InputType.LABEL,
                  value: voxelIndex ? voxelIndex.toString() : undefined,
                },
              ],
            },
          ]}
        />
      ) : null}
      {loadingSurfaceMap ? (
        <TextualLoader text="Loading surface map..." />
      ) : null}
      {loadingGradient ? (
        <TextualLoader text="Loading gradient map..." />
      ) : null}
      <Colorbar
        colormap={
          surfaceMode === SurfaceMode.GRADIENT
            ? colormaps["single_diverging_heat"]
            : colormaps[colormapName]
        }
        vmin={
          filterSurface
            ? lowThresholdMin
            : surfaceMode === SurfaceMode.CONTRAST
            ? sharedState
              ? getMin(sharedSurfaceMap)
              : getMin(surfaceMap)
            : sharedState
            ? getMin(sharedGradient)
            : getMin(gradient)
        }
        vmax={
          filterSurface
            ? highThresholdMax
            : surfaceMode === SurfaceMode.CONTRAST
            ? sharedState
              ? getMax(sharedSurfaceMap)
              : getMax(surfaceMap)
            : sharedState
            ? getMax(sharedGradient)
            : getMax(gradient)
        }
        unit={surfaceMode === SurfaceMode.CONTRAST ? "Z-Score" : "Z-Score / mm"}
      />
      <ParentSize className="scene-container" debounceTime={10}>
        {({ width: sceneWidth, height: sceneHeight }) => (
          <Scene
            clickedVoxelCallback={(voxelIndex: number) => {
              if (sharedState) {
                setSharedVoxelIndex(voxelIndex);
              } else {
                setVoxelIndex(voxelIndex);
              }
            }}
            colormap={colormaps[colormapName]}
            voxelIndex={sharedState ? sharedVoxelIndex : voxelIndex}
            surfaceMap={sharedState ? sharedSurfaceMap : surfaceMap}
            gradient={sharedState ? sharedGradient : gradient}
            meshType={sharedState ? sharedMeshType : meshType}
            meshSupport={sharedState ? sharedMeshSupport : meshSupport}
            subjectLabel={
              sharedState && sharedSubject !== undefined
                ? sharedSubject.label
                : subject.label
            }
            hemi={sharedState ? sharedHemi : hemi}
            wireframe={sharedState ? sharedWireframe : wireframe}
            width={sceneWidth}
            height={sceneHeight}
            lowThresholdMin={lowThresholdMin}
            lowThresholdMax={lowThresholdMax}
            highThresholdMin={highThresholdMin}
            highThresholdMax={highThresholdMax}
            showGridHelper={showGridHelper}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default ScenePane;
