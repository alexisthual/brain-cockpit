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
  GradientMode,
  HemisphereSide,
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
  sharedHemi: HemisphereSide;
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
  sharedMeshGradient,
  sharedGradient,
  sharedVoxelIndex,
  setSharedVoxelIndex = () => {},
  sharedWireframe = false,
  sharedMeshType = MeshType.PIAL,
  sharedHemi = HemisphereSide.LEFT,
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
  const [meshGradient, setMeshGradient] = useState<number[] | undefined>();
  const [gradientAverageMap, setGradientAverageMap] = useState<
    number[][] | undefined
  >();
  const [loadingGradientMap, setLoadingGradientMap] = useState(false);
  const [wireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
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
              params: { contrast_index: contrast.index, hemi: hemi },
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
      setLoadingGradientMap(true);
      switch (gradientMode) {
        case GradientMode.EDGES:
          if (subject.index !== undefined) {
            server
              .get("/contrast_gradient", {
                params: {
                  subject_index: subject.index,
                  contrast_index: contrast.index,
                },
              })
              .then((response: AxiosResponse<number[]>) => {
                setMeshGradient(response.data);
                setLoadingGradientMap(false);
              });
          }
          break;
        case GradientMode.AVERAGE:
          if (subject.index !== undefined) {
            server
              .get("/contrast_gradient_averaged", {
                params: {
                  subject_index: subject.index,
                  contrast_index: contrast.index,
                },
              })
              .then((response: AxiosResponse<number[][]>) => {
                setGradientAverageMap(response.data);
                setLoadingGradientMap(false);
              });
          }
          break;
        default:
          setLoadingGradientMap(false);
          break;
      }
    }
  }, [subject, contrast, meanSurfaceMap, hemi, gradientMode, surfaceMode]);

  return (
    <div className="scene" ref={panelEl}>
      <PaneButtons closeCallback={closeCallback} />
      {!sharedState ? (
        <InfoPanel
          rows={[
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
      {loadingGradientMap ? (
        <TextualLoader text="Loading gradient map..." />
      ) : null}
      <Colorbar
        colormap={
          surfaceMode === SurfaceMode.GRADIENT
            ? colormaps["single_diverging_heat"]
            : colormaps[colormapName]
        }
        vmin={
          surfaceMode === SurfaceMode.GRADIENT && surfaceMap !== undefined
            ? Math.min(...surfaceMap)
            : -10
        }
        vmax={
          surfaceMode === SurfaceMode.GRADIENT && surfaceMap !== undefined
            ? Math.max(...surfaceMap)
            : 10
        }
        unit={
          surfaceMode === SurfaceMode.CONTRAST ? "Z-Score" : "Z-Score\n/ mm"
        }
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
            meshGradient={sharedState ? sharedMeshGradient : meshGradient}
            gradient={sharedState ? sharedGradient : gradientAverageMap}
            meshType={sharedState ? sharedMeshType : meshType}
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
