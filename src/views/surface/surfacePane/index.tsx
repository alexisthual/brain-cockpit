import { Callout } from "@blueprintjs/core";
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
  DatasetDescriptions,
  getMax,
  getMin,
  GradientMode,
  HemisphereSide,
  modulo,
} from "constants/index";

export interface SurfacePaneState {
  subject?: number;
  contrast?: number;
  selectedVoxel?: number;
  meshSupport?: string;
  meshType?: string;
  hemi?: string;
  meanSurfaceMap?: boolean;
  showDescription?: boolean;
  voxels?: number[];
}

export const defaultPaneState: SurfacePaneState = {
  subject: undefined,
  contrast: undefined,
  meshSupport: undefined,
  meshType: undefined,
  hemi: undefined,
  meanSurfaceMap: false,
  showDescription: false,
};

interface Props {
  paneId: string;
  datasetId: string;
  paneState?: SurfacePaneState;
  paneCallbacks?: {
    updatePaneState: (id: string, state: SurfacePaneState) => void;
    updateAllPanesState: (key: string, value: any) => void;
    shiftAllPanes: (key: string, shift: number, n: number) => void;
    setVoxel: (selectedPaneId: string, voxelId: number) => void;
  };
  closeCallback: () => void;
  colormapName?: string;
  subjectLabels: string[];
  contrastLabels: ContrastLabel[];
  meshLabels: string[];
  meshTypeLabels?: string[];
  hemiLabels: string[];
  datasetDescriptions: DatasetDescriptions;
  filterSurface?: boolean;
  thresholdLow?: number;
  thresholdHigh?: number;
  showGridHelper?: boolean;
  gradientMode?: GradientMode;
}

const SurfacePane = ({
  paneId,
  datasetId,
  paneState,
  paneCallbacks,
  closeCallback = () => {},
  colormapName = "diverging_temperature",
  subjectLabels = [],
  contrastLabels = [],
  meshLabels = [],
  meshTypeLabels,
  hemiLabels = [],
  datasetDescriptions = {},
  filterSurface,
  thresholdLow,
  thresholdHigh,
  showGridHelper,
  gradientMode,
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

  const closeHotspot = useCallback(
    (voxel: number) => () => {
      if (state !== undefined && state.voxels !== undefined) {
        const index = state.voxels.indexOf(voxel);
        const newPaneState = {
          ...state,
          voxels: [
            ...state.voxels?.slice(0, index),
            ...state.voxels?.slice(index + 1),
          ],
        };
        paneCallbacks?.updatePaneState(paneId, newPaneState);
      }
    },
    [state, paneCallbacks, paneId]
  );

  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [gradient, setGradient] = useState<number[][] | undefined>();
  const [loadingGradient, setLoadingGradient] = useState(false);
  const [meshUrls, setMeshUrls] = useState<string[] | undefined>(undefined);
  const [wireframe] = useState(false);
  const panelEl = useRef<HTMLDivElement>(null);

  // Update url used to fetch mesh
  // on state change
  useEffect(() => {
    let newMeshUrls: Promise<any>[] = [];

    if (
      state.subject === undefined ||
      state.meshSupport === undefined ||
      state.meshType === undefined ||
      state.hemi === undefined
    ) {
      return;
    }

    if (
      state.hemi === HemisphereSide.LEFT ||
      state.hemi === HemisphereSide.RIGHT
    ) {
      newMeshUrls = [
        server.get<string[][]>(`/datasets/${datasetId}/mesh_url`, {
          params: {
            subject: state.subject,
            meshSupport: state.meshSupport,
            meshType: state.meshType,
            hemi: state.hemi,
          },
        }),
      ];
    } else if (state.hemi === HemisphereSide.BOTH) {
      newMeshUrls = [HemisphereSide.LEFT, HemisphereSide.RIGHT].map((hemi) =>
        server.get<string[][]>(`/datasets/${datasetId}/mesh_url`, {
          params: {
            subject: state.subject,
            meshSupport: state.meshSupport,
            meshType: state.meshType,
            hemi: hemi,
          },
        })
      );
    }

    Promise.all(newMeshUrls).then((values) => {
      setMeshUrls(
        values.map((value) => `datasets/${datasetId}/mesh/${value.data}`)
      );
    });
  }, [datasetId, state.subject, state.meshSupport, state.meshType, state.hemi]);

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
            modulo(
              state.contrast !== undefined ? state.contrast + 1 : 0,
              contrastLabels.length
            )
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
            modulo(
              state.contrast !== undefined ? state.contrast - 1 : 0,
              contrastLabels.length
            )
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
            modulo(
              state.subject !== undefined ? state.subject + 1 : 0,
              subjectLabels.length
            )
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
              modulo(
                state.subject !== undefined ? state.subject - 1 : 0,
                subjectLabels.length
              )
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

  // O
  const toggleDescription = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (panelEl.current !== null && panelEl.current.matches(":hover")) {
        if (event.isComposing || (event.keyCode === 79 && event.altKey)) {
          paneCallbacks?.updateAllPanesState(
            "showDescription",
            !state.showDescription
          );
        } else if (event.isComposing || event.keyCode === 79) {
          changeState("showDescription")(!state.showDescription);
        }
      }
    },
    [state.showDescription, paneCallbacks, changeState]
  );

  useEffect(() => {
    window.addEventListener("keydown", incrementContrast);
    window.addEventListener("keydown", decrementContrast);
    window.addEventListener("keydown", incrementSubject);
    window.addEventListener("keydown", decrementSubject);
    window.addEventListener("keydown", closePane);
    window.addEventListener("keydown", toggleMeanContrastMap);
    window.addEventListener("keydown", toggleDescription);
    return () => {
      window.removeEventListener("keydown", incrementContrast);
      window.removeEventListener("keydown", decrementContrast);
      window.removeEventListener("keydown", incrementSubject);
      window.removeEventListener("keydown", decrementSubject);
      window.removeEventListener("keydown", closePane);
      window.removeEventListener("keydown", toggleMeanContrastMap);
      window.removeEventListener("keydown", toggleDescription);
    };
  }, [
    incrementContrast,
    decrementContrast,
    incrementSubject,
    decrementSubject,
    closePane,
    toggleMeanContrastMap,
    toggleDescription,
  ]);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (state.contrast !== undefined) {
      setLoadingSurfaceMap(true);
      if (state.meanSurfaceMap) {
        server
          .get(`/datasets/${datasetId}/contrast_mean`, {
            params: {
              contrast_index: state.contrast,
              hemi: state.hemi,
              mesh: state.meshSupport,
            },
          })
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
          .get(`/datasets/${datasetId}/contrast`, {
            params: {
              subject_index: state.subject,
              contrast_index: state.contrast,
              hemi: state.hemi,
              mesh: state.meshSupport,
            },
          })
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
              .get(`/datasets/${datasetId}/contrast_gradient`, {
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
    datasetId,
    paneState,
    state.contrast,
    state.hemi,
    state.meanSurfaceMap,
    state.meshSupport,
    state.subject,
    gradientMode,
  ]);

  //
  // Show or hide contrast descriptions
  //

  const [descriptions, setDescriptions] = useState<any>([]);

  useEffect(() => {
    let newDescriptions = [];

    // Add task description
    const task = contrastLabels[state.contrast ?? 0]?.task;
    if (task !== undefined) {
      newDescriptions.push([task, datasetDescriptions[task]?.description]);
    }

    // Add contrast / condition description
    const contrast = contrastLabels[state.contrast ?? 0]?.contrast;
    if (contrast !== undefined) {
      newDescriptions.push([
        contrast,
        datasetDescriptions[task]?.maps[contrast],
      ]);
    }

    // If map is contrast, try to add the descriptions
    // of all conditions it results from
    if (
      task !== undefined &&
      contrast !== undefined &&
      datasetDescriptions[task] !== undefined &&
      contrast.indexOf("-") !== -1
    ) {
      const conditions = contrast.split("-");
      for (const condition of conditions) {
        if (condition in datasetDescriptions[task]?.maps) {
          newDescriptions.push([
            condition,
            datasetDescriptions[task]?.maps[condition],
          ]);
        }
      }
    }

    setDescriptions(newDescriptions);
  }, [state.contrast, datasetDescriptions, contrastLabels]);

  return (
    <div className="scene-pane">
      <div className="scene" ref={panelEl}>
        <CloseButton closeCallback={closeCallback} />
        {state.showDescription ? (
          <div className="description-callout">
            <Callout>
              {descriptions.map((description: any) => {
                return (
                  <p key={`description-${description[0]}`}>
                    <strong>{description[0]}:</strong> {description[1]}
                  </p>
                );
              })}
            </Callout>
          </div>
        ) : null}
        <PaneControls
          rows={[
            {
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  selectedItem: state.meshSupport,
                  items: meshLabels,
                  onChangeCallback: (
                    newValue: string,
                    event: React.SyntheticEvent<HTMLElement>
                  ) => {
                    if ((event as any).altKey) {
                      paneCallbacks?.updateAllPanesState(
                        "meshSupport",
                        newValue
                      );
                    } else {
                      changeState("meshSupport")(newValue);
                    }
                  },
                },
                {
                  inputType: InputType.SELECT_STRING,
                  selectedItem: state.meshType,
                  items: meshTypeLabels,
                  onChangeCallback: (
                    newValue: string,
                    event: React.SyntheticEvent<HTMLElement>
                  ) => {
                    if ((event as any).altKey) {
                      paneCallbacks?.updateAllPanesState("meshType", newValue);
                    } else {
                      changeState("meshType")(newValue);
                    }
                  },
                },
                {
                  inputType: InputType.SELECT_STRING,
                  selectedItem: state.hemi,
                  items: hemiLabels,
                  onChangeCallback: (
                    newValue: string,
                    event: React.SyntheticEvent<HTMLElement>
                  ) => {
                    if ((event as any).altKey) {
                      paneCallbacks?.updateAllPanesState("hemi", newValue);
                    } else {
                      changeState("hemi")(newValue);
                    }
                  },
                },
              ],
            },
            {
              inputs: [
                {
                  inputType: InputType.SELECT_STRING,
                  selectedItem: subjectLabels[state.subject ?? 0],
                  items: subjectLabels,
                  onChangeCallback: (
                    newValue: string,
                    event: React.SyntheticEvent<HTMLElement>
                  ) => {
                    if ((event as any).altKey) {
                      paneCallbacks?.updateAllPanesState(
                        "subject",
                        subjectLabels.indexOf(newValue)
                      );
                    } else {
                      changeState("subject")(subjectLabels.indexOf(newValue));
                    }
                  },
                },
                {
                  inputType: InputType.TWO_STATE_TOGGLE,
                  value: state.meanSurfaceMap,
                  onChangeCallback: (
                    event: React.FormEvent<HTMLInputElement>
                  ) => {
                    if ((event.nativeEvent as any).altKey) {
                      paneCallbacks?.updateAllPanesState(
                        "meanSurfaceMap",
                        !state.meanSurfaceMap
                      );
                    } else {
                      changeState("meanSurfaceMap")(!state.meanSurfaceMap);
                    }
                  },
                  iconLeft: "person",
                  iconRight: "people",
                  title: "Mean across subjects",
                },
              ],
            },
            {
              inputs: [
                {
                  inputType: InputType.SELECT_CONTRAST,
                  selectedItem: contrastLabels[state.contrast ?? 0],
                  items: contrastLabels,
                  onChangeCallback: (
                    newValue: ContrastLabel,
                    event: React.SyntheticEvent<HTMLElement>
                  ) => {
                    if ((event as any).altKey) {
                      paneCallbacks?.updateAllPanesState(
                        "contrast",
                        contrastLabels.indexOf(newValue)
                      );
                    } else {
                      changeState("contrast")(contrastLabels.indexOf(newValue));
                    }
                  },
                },
                {
                  inputType: InputType.BUTTON,
                  value: state.showDescription,
                  onChangeCallback: (event: React.MouseEvent<HTMLElement>) => {
                    if (event.altKey) {
                      paneCallbacks?.updateAllPanesState(
                        "showDescription",
                        !state.showDescription
                      );
                    } else {
                      changeState("showDescription")(!state.showDescription);
                    }
                  },
                  iconActive: "manual",
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
          colormap={colormaps[colormapName]}
          vmin={getMin(surfaceMap)}
          vmax={getMax(surfaceMap)}
          unit={unit}
          symmetric={true}
        />
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(
                voxelIndex: number,
                event?: MouseEvent
              ) => {
                if (event !== undefined && event.shiftKey) {
                  changeState("voxels")([...(state.voxels ?? []), voxelIndex]);
                } else {
                  paneCallbacks?.setVoxel(paneId, voxelIndex);
                }
              }}
              colormap={colormaps[colormapName]}
              hotspots={state.voxels?.map((voxel: number) => {
                return {
                  id: `voxel-${paneId}-${voxel}`,
                  voxelIndex: voxel,
                  header: voxel.toString(),
                  closeCallback: closeHotspot(voxel),
                };
              })}
              surfaceMap={surfaceMap}
              meshUrls={meshUrls}
              gradient={gradient}
              wireframe={wireframe}
              width={sceneWidth}
              height={sceneHeight}
              filterSurface={filterSurface}
              thresholdLow={thresholdLow}
              thresholdHigh={thresholdHigh}
              showGridHelper={showGridHelper}
            />
          )}
        </ParentSize>
      </div>
      <div className="scene-pane-hover-bar"></div>
    </div>
  );
};

export default SurfacePane;
