import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosError, AxiosResponse } from "axios";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { server } from "App";
import CloseButton from "components/buttons/closeButton";
import Colorbar from "components/colorbar";
import PaneControls, { InputType } from "components/paneControls";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  colormaps,
  ContrastLabel,
  getMax,
  getMin,
  GradientMode,
  HemisphereSide,
  MeshSupport,
  MeshType,
  modulo,
  SurfaceMode,
} from "constants/index";
import "./style.scss";

export interface SurfacePaneState {
  subject: number;
  contrast: number;
  selectedVoxel?: number;
  meshSupport: MeshSupport;
  meshType: MeshType;
  hemi: HemisphereSide;
  meanSurfaceMap?: boolean;
  other?: string;
}

export const defaultPaneState: SurfacePaneState = {
  subject: 0,
  contrast: 0,
  meshSupport: MeshSupport.FSAVERAGE5,
  meshType: MeshType.PIAL,
  hemi: HemisphereSide.LEFT,
  meanSurfaceMap: false,
};

interface Props {
  paneId: string;
  paneState?: SurfacePaneState;
  paneCallbacks?: {
    updatePaneState: (id: string, state: SurfacePaneState) => void;
    updateAllPanesState: (key: string, value: any) => void;
    shiftAllPanes: (key: string, shift: number, n: number) => void;
  };
  closeCallback: () => void;
  colormapName?: string;
  subjectLabels: string[];
  contrastLabels: ContrastLabel[];
  filterSurface?: boolean;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
  showGridHelper?: boolean;
  gradientMode?: GradientMode;
  surfaceMode?: SurfaceMode;
}

const SurfacePane = ({
  paneId,
  paneState,
  paneCallbacks,
  closeCallback = () => {},
  colormapName = "diverging_temperature",
  subjectLabels = [],
  contrastLabels = [],
  filterSurface,
  lowThresholdMin,
  lowThresholdMax,
  highThresholdMin,
  highThresholdMax,
  showGridHelper,
  gradientMode,
  surfaceMode,
}: Props) => {
  const state = useMemo(() => {
    return {
      ...defaultPaneState,
      ...paneState,
    };
  }, [paneState]);

  const changeState = useCallback(
    (key: string) => {
      return (value: any) => {
        const newPaneState = {
          ...defaultPaneState,
          ...state,
          [key]: value,
        };

        paneCallbacks?.updatePaneState(paneId, newPaneState);
      };
    },
    [paneCallbacks, paneId, state]
  );

  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [gradient, setGradient] = useState<number[][] | undefined>();
  const [loadingGradient, setLoadingGradient] = useState(false);
  const [wireframe] = useState(false);
  const panelEl = useRef<HTMLDivElement>(null);

  // Set key events

  // If ALT is pressed, dispatch event for all panes,
  // otherwise, dispatch event for current pane

  // L
  const incrementContrast = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 76 && event.altKey)) {
          paneCallbacks?.shiftAllPanes("contrast", 1, contrastLabels.length);
        } else if (event.isComposing || event.keyCode === 76) {
          changeState("contrast")(
            modulo(state.contrast + 1, contrastLabels.length)
          );
        }
      }
    },
    [state.contrast, contrastLabels, paneCallbacks, changeState]
  );

  // J
  const decrementContrast = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 74 && event.altKey)) {
          paneCallbacks?.shiftAllPanes("contrast", -1, contrastLabels.length);
        } else if (event.isComposing || event.keyCode === 74) {
          changeState("contrast")(
            modulo(state.contrast - 1, contrastLabels.length)
          );
        }
      }
    },
    [state.contrast, contrastLabels, paneCallbacks, changeState]
  );

  // I
  const incrementSubject = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 73 && event.altKey)) {
          paneCallbacks?.shiftAllPanes("subject", 1, subjectLabels.length);
        } else if (event.isComposing || event.keyCode === 73) {
          changeState("subject")(
            modulo(state.subject + 1, subjectLabels.length)
          );
        }
      }
    },
    [state.subject, subjectLabels, paneCallbacks, changeState]
  );

  // K
  const decrementSubject = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 75 && event.altKey)) {
          paneCallbacks?.shiftAllPanes("subject", -1, subjectLabels.length);
        } else if (event.isComposing || event.keyCode === 75) {
          if (!state.meanSurfaceMap) {
            changeState("subject")(
              modulo(state.subject - 1, subjectLabels.length)
            );
          }
        }
      }
    },
    [
      state.subject,
      state.meanSurfaceMap,
      subjectLabels,
      paneCallbacks,
      changeState,
    ]
  );

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

  // U
  const toggleMeanContrastMap = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 85 && event.altKey)) {
          paneCallbacks?.updateAllPanesState(
            "meanSurfaceMap",
            !state.meanSurfaceMap
          );
        } else if (event.isComposing || event.keyCode === 85) {
          changeState("meanSurfaceMap")(!state.meanSurfaceMap);
        }
      }
    },
    [state.meanSurfaceMap, paneCallbacks, changeState]
  );

  useEffect(() => {
    window.addEventListener("keydown", incrementContrast);
    window.addEventListener("keydown", decrementContrast);
    window.addEventListener("keydown", incrementSubject);
    window.addEventListener("keydown", decrementSubject);
    window.addEventListener("keydown", closePane);
    window.addEventListener("keydown", toggleMeanContrastMap);
    return () => {
      window.removeEventListener("keydown", incrementContrast);
      window.removeEventListener("keydown", decrementContrast);
      window.removeEventListener("keydown", incrementSubject);
      window.removeEventListener("keydown", decrementSubject);
      window.removeEventListener("keydown", closePane);
      window.removeEventListener("keydown", toggleMeanContrastMap);
    };
  }, [
    incrementContrast,
    decrementContrast,
    incrementSubject,
    decrementSubject,
    closePane,
    toggleMeanContrastMap,
  ]);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (state.contrast !== undefined) {
      setLoadingSurfaceMap(true);
      if (state.meanSurfaceMap) {
        server
          .get(
            surfaceMode === SurfaceMode.GRADIENT
              ? "/contrast_gradient_norm_mean"
              : "/contrast_mean",
            {
              params: {
                contrast_index: state.contrast,
                hemi: state.hemi,
                mesh: state.meshSupport,
              },
            }
          )
          .then((response: AxiosResponse<number[]>) => {
            setSurfaceMap(response.data);
            setLoadingSurfaceMap(false);
          })
          .catch((error: AxiosError) => {
            console.error(error);
            setSurfaceMap(undefined);
            setLoadingSurfaceMap(false);
          });
      } else if (state.subject !== undefined) {
        server
          .get(
            surfaceMode === SurfaceMode.GRADIENT
              ? "/contrast_gradient_norm"
              : "/contrast",
            {
              params: {
                subject_index: state.subject,
                contrast_index: state.contrast,
                hemi: state.hemi,
                mesh: state.meshSupport,
              },
            }
          )
          .then((response: AxiosResponse<number[]>) => {
            setSurfaceMap(response.data);
            setLoadingSurfaceMap(false);
          })
          .catch((error: AxiosError) => {
            console.error(error);
            setSurfaceMap(undefined);
            setLoadingSurfaceMap(false);
          });
      } else {
        setLoadingSurfaceMap(false);
      }

      // Load surfacemap gradient
      setLoadingGradient(true);
      switch (gradientMode) {
        case GradientMode.LOCAL:
          if (state.subject !== undefined) {
            server
              .get("/contrast_gradient", {
                params: {
                  subject_index: state.subject,
                  contrast_index: state.contrast,
                  mesh: state.meshSupport,
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
    paneState,
    state.contrast,
    state.hemi,
    state.meanSurfaceMap,
    state.meshSupport,
    state.subject,
    surfaceMode,
  ]);

  return (
    <div className="surface-pane scene" ref={panelEl}>
      <CloseButton closeCallback={closeCallback} />
      <PaneControls
        rows={[
          {
            label: "Mesh",
            inputs: [
              {
                inputType: InputType.SELECT_STRING,
                value: state.meshSupport,
                values: Object.keys(MeshSupport),
                onChangeCallback: (newValue: string) =>
                  changeState("meshSupport")(
                    MeshSupport[newValue as keyof typeof MeshSupport]
                  ),
              },
              {
                inputType: InputType.SELECT_STRING,
                value: state.meshType,
                values: Object.keys(MeshType),
                onChangeCallback: (newValue: string) =>
                  changeState("meshType")(
                    MeshType[newValue as keyof typeof MeshType]
                  ),
              },
              {
                inputType: InputType.SELECT_STRING,
                value: state.hemi,
                values: Object.keys(HemisphereSide),
                onChangeCallback: (newValue: string) =>
                  changeState("hemi")(
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
                value: subjectLabels[state.subject],
                values: subjectLabels,
                onChangeCallback: (newValue: string) =>
                  changeState("subject")(subjectLabels.indexOf(newValue)),
              },
              {
                inputType: InputType.TWO_STATE_TOGGLE,
                value: state.meanSurfaceMap,
                onChangeCallback: () =>
                  changeState("meanSurfaceMap")(!state.meanSurfaceMap),
                iconLeft: "person",
                iconRight: "people",
                title: "Mean across subjects",
              },
            ],
          },
          {
            label: "Contrast",
            inputs: [
              {
                inputType: InputType.SELECT_CONTRAST,
                value: contrastLabels[state.contrast],
                values: contrastLabels,
                onChangeCallback: (newValue: ContrastLabel) =>
                  changeState("contrast")(contrastLabels.indexOf(newValue)),
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
            ? getMin(surfaceMap)
            : getMin(gradient)
        }
        vmax={
          filterSurface
            ? highThresholdMax
            : surfaceMode === SurfaceMode.CONTRAST
            ? getMax(surfaceMap)
            : getMax(gradient)
        }
        unit={surfaceMode === SurfaceMode.CONTRAST ? "Z-Score" : "Z-Score / mm"}
      />
      <ParentSize className="scene-container" debounceTime={10}>
        {({ width: sceneWidth, height: sceneHeight }) => (
          <Scene
            clickedVoxelCallback={(voxelIndex: number) => {
              setVoxelIndex(voxelIndex);
            }}
            colormap={colormaps[colormapName]}
            voxelIndex={voxelIndex}
            surfaceMap={surfaceMap}
            gradient={gradient}
            meshType={state.meshType}
            meshSupport={state.meshSupport}
            subjectLabel={subjectLabels[state.subject]}
            hemi={state.hemi}
            wireframe={wireframe}
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

export default SurfacePane;
