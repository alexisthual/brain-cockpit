import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useReducer, useState } from "react";

import Colorbar from "components/colorbar";
import ContrastFingerprint from "components/contrastFingerprint";
import InfoPanel, { InputType } from "components/infoPanel";
import PanelButtons from "components/infoPanel/buttons";
import PanesButtons from "./panesButtons";
import ScenePane from "./scenePane";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  ActionPane,
  colormaps,
  Contrast,
  ContrastLabel,
  getMax,
  getMin,
  GradientMode,
  HemisphereSide,
  MeshSupport,
  MeshType,
  Orientation,
  Subject,
  SurfaceMode,
  modulo,
} from "constants/index";
import { server } from "App";

const SurfaceExplorer = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingContrastMap, setLoadingSurfaceMap] = useState(false);
  const [meanSurfaceMap, setMeanContrastMap] = useState(false);
  const gradientModeReducer = (
    gradientMode: GradientMode,
    action: ActionLabel
  ): GradientMode => {
    let newIndex = Object.keys(GradientMode).indexOf(gradientMode);
    const n = Object.values(GradientMode).length;
    switch (action.type) {
      case "increment":
        newIndex = modulo(newIndex + 1, n);
        break;
      case "decrement":
        newIndex = modulo(newIndex - 1, n);
        break;
      default:
        break;
    }
    return Object.values(GradientMode)[newIndex];
  };
  const [gradientMode, setGradientMode] = useReducer(
    gradientModeReducer,
    GradientMode.NONE
  );
  const surfaceModeReducer = (
    surfaceMode: SurfaceMode,
    action: ActionLabel
  ): SurfaceMode => {
    let newIndex = Object.keys(SurfaceMode).indexOf(surfaceMode);
    const n = Object.values(SurfaceMode).length;
    switch (action.type) {
      case "increment":
        newIndex = modulo(newIndex + 1, n);
        break;
      case "decrement":
        newIndex = modulo(newIndex - 1, n);
        break;
      default:
        break;
    }
    return Object.values(SurfaceMode)[newIndex];
  };
  const [surfaceMode, setSurfaceMode] = useReducer(
    surfaceModeReducer,
    SurfaceMode.CONTRAST
  );
  const [meshGradient, setMeshGradient] = useState<number[] | undefined>();
  const [loadingGradientMap, setLoadingGradientMap] = useState(false);
  const [gradientAverageMap, setGradientAverageMap] = useState<
    number[][] | undefined
  >();
  const [showGridHelper, setShowGridHelper] = useState(true);

  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
  const [meshSupport, setMeshSupport] = useState(MeshSupport.FSAVERAGE5);
  const [hemi, setHemi] = useState(HemisphereSide.LEFT);
  const [sharedState, setSharedState] = useState(true);
  const [lowThresholdMin, setLowThresholdMin] = useState(-10);
  const [lowThresholdMax, setLowThresholdMax] = useState(0);
  const [highThresholdMin, setHighThresholdMin] = useState(0);
  const [highThresholdMax, setHighThresholdMax] = useState(10);
  const [filterSurface, setFilterSurface] = useState(false);

  const colormapName = "diverging_temperature";

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

  const panesReducer = (state: string[], action: ActionPane): string[] => {
    const newState = [...state];

    switch (action.type) {
      case "add":
        newState.push(nanoid());
        break;
      case "remove":
        if (action.payload !== undefined) {
          const index = state.indexOf(action.payload);
          if (index >= 0) {
            newState.splice(index, 1);
          }
        }
        break;
      default:
        break;
    }

    return newState;
  };
  const [panes, setPanes] = useReducer(panesReducer, [nanoid()]);

  // Initialise all pane state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const subjectLabels = server.get<string[]>("subjects");
      const contrastLabels = server.get<string[][]>("contrast_labels");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels]).then((values) => {
        setSubjectLabels(values[0].data);
        if (values[0].data.length > 0) {
          setSubject({ payload: 0 });
        }

        setContrastLabels(
          values[1].data.map((label: any) => ({
            task: label[0],
            contrast: label[1],
          }))
        );
        if (values[1].data.length > 0) {
          setContrast({ payload: 0 });
        }
      });
    };

    fetchAllData();
  }, []);

  // Set key events

  // L
  const incrementContrast = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 76) {
        if (sharedState) {
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
        if (sharedState) {
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
        if (sharedState && !meanSurfaceMap) {
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
        if (sharedState && !meanSurfaceMap) {
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
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 85) {
        if (sharedState) {
          setMeanContrastMap((prevMeanContrastMap) => !prevMeanContrastMap);
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", toggleMeanContrastMap);
    return () => window.removeEventListener("keydown", toggleMeanContrastMap);
  }, [toggleMeanContrastMap]);

  // O
  const toggleMeanFingerprint = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 79) {
        if (sharedState) {
          setMeanFingerprint((prevMeanFingerprint) => !prevMeanFingerprint);
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", toggleMeanFingerprint);
    return () => window.removeEventListener("keydown", toggleMeanFingerprint);
  }, [toggleMeanFingerprint]);

  // W
  const toggleWireframe = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 87) {
        if (sharedState) {
          setWireframe((prevWireframe) => !prevWireframe);
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", toggleWireframe);
    return () => window.removeEventListener("keydown", toggleWireframe);
  }, [toggleWireframe]);

  // N
  const addPane = useCallback((event: any) => {
    if (event.target.matches("input")) return;

    if (event.isComposing || event.keyCode === 78) {
      setPanes({ type: "add" });
    }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", addPane);
    return () => window.removeEventListener("keydown", addPane);
  }, [addPane]);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      // Load surfacemap
      setLoadingSurfaceMap(true);
      if (meanSurfaceMap) {
        server
          .get(
            surfaceMode === SurfaceMode.CONTRAST
              ? "/contrast_mean"
              : "/contrast_gradient_norm_mean",
            {
              params: {
                contrast_index: contrast.index,
                mesh: meshSupport,
                hemi: hemi,
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
            surfaceMode === SurfaceMode.CONTRAST
              ? "/contrast"
              : "/contrast_gradient_norm",
            {
              params: {
                subject_index: subject.index,
                contrast_index: contrast.index,
                mesh: meshSupport,
                hemi: hemi,
              },
            }
          )
          .then((response: AxiosResponse<number[] | undefined>) => {
            setSurfaceMap(response.data ?? []);
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
                  mesh: meshSupport,
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
                  mesh: meshSupport,
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
  }, [
    subject,
    contrast,
    meanSurfaceMap,
    hemi,
    gradientMode,
    surfaceMode,
    meshSupport,
  ]);

  // Update fingerprint when voxelIndex or subjectIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      setLoadingFingerprint(true);
      if (meanFingerprint) {
        server
          .get("/voxel_fingerprint_mean", {
            params: {
              voxel_index: voxelIndex,
              mesh: meshSupport,
            },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else if (subject.index !== undefined) {
        server
          .get("/voxel_fingerprint", {
            params: {
              subject_index: subject.index,
              voxel_index: voxelIndex,
              mesh: meshSupport,
            },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else {
        setLoadingFingerprint(false);
      }
    }
  }, [voxelIndex, subject, meanFingerprint]);

  return (
    <div
      className={`main-container ${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <div className="scenes">
        {sharedState && loadingContrastMap ? (
          <TextualLoader text="Loading surface map..." />
        ) : null}
        {sharedState && loadingGradientMap ? (
          <TextualLoader text="Loading gradient map..." />
        ) : null}
        {sharedState ? (
          <Colorbar
            colormap={
              surfaceMode === SurfaceMode.GRADIENT
                ? colormaps["single_diverging_heat"]
                : colormaps[colormapName]
            }
            vmin={
              surfaceMode === SurfaceMode.GRADIENT && surfaceMap !== undefined
                ? getMin(surfaceMap)
                : -10
            }
            vmax={
              surfaceMode === SurfaceMode.GRADIENT && surfaceMap !== undefined
                ? getMax(surfaceMap)
                : 10
            }
            unit={
              surfaceMode === SurfaceMode.CONTRAST ? "Z-Score" : "Z-Score / mm"
            }
          />
        ) : null}
        <PanesButtons
          addPaneCallback={() => {
            setPanes({ type: "add" });
          }}
          filterSurface={filterSurface}
          filterSurfaceCallback={() => setFilterSurface(!filterSurface)}
          sharedState={sharedState}
          sharedStateCallback={() => setSharedState(!sharedState)}
          gradientMode={gradientMode}
          showGradientCallback={() => setGradientMode({ type: "increment" })}
          showGridHelper={showGridHelper}
          showGridHelperCallback={() => setShowGridHelper(!showGridHelper)}
          surfaceMode={surfaceMode}
          showSurfaceCallback={() => setSurfaceMode({ type: "increment" })}
        />
        {sharedState ? (
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
                    value: meshType,
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
                    value: hemi,
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
                    onChangeCallback: () => setMeanContrastMap(!meanSurfaceMap),
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
        <div className="scene-panes">
          {panes.map((paneId: string) => {
            return (
              <ScenePane
                key={`scene-pane-${paneId}`}
                closeCallback={() => {
                  setPanes({ type: "remove", payload: paneId });
                }}
                colormapName={
                  surfaceMode === SurfaceMode.GRADIENT
                    ? "single_diverging_heat"
                    : colormapName
                }
                subjectLabels={subjectLabels}
                contrastLabels={contrastLabels}
                sharedState={sharedState}
                sharedSubject={subject}
                sharedContrast={contrast}
                sharedSurfaceMap={surfaceMap}
                sharedMeanSurfaceMap={meanSurfaceMap}
                sharedMeshGradient={
                  gradientMode === GradientMode.EDGES ? meshGradient : undefined
                }
                sharedGradient={
                  gradientMode === GradientMode.AVERAGE
                    ? gradientAverageMap
                    : undefined
                }
                sharedVoxelIndex={voxelIndex}
                setSharedVoxelIndex={(newVoxelIndex: number) => {
                  setVoxelIndex(newVoxelIndex);
                }}
                sharedWireframe={wireframe}
                sharedMeshType={meshType}
                sharedMeshSupport={meshSupport}
                sharedHemi={hemi}
                lowThresholdMin={filterSurface ? lowThresholdMin : undefined}
                lowThresholdMax={filterSurface ? lowThresholdMax : undefined}
                highThresholdMin={filterSurface ? highThresholdMin : undefined}
                highThresholdMax={filterSurface ? highThresholdMax : undefined}
                showGridHelper={showGridHelper}
                gradientMode={gradientMode}
                surfaceMode={surfaceMode}
              />
            );
          })}
        </div>
      </div>
      {voxelIndex !== undefined ? (
        <div className="fingerprint">
          <PanelButtons
            orientation={
              orientation === Orientation.VERTICAL
                ? Orientation.HORIZONTAL
                : Orientation.VERTICAL
            }
            orientationChangeCallback={() => {
              switch (orientation) {
                case Orientation.VERTICAL:
                  setOrientation(Orientation.HORIZONTAL);
                  break;
                case Orientation.HORIZONTAL:
                  setOrientation(Orientation.VERTICAL);
                  break;
              }
            }}
            meanFingerprint={meanFingerprint}
            meanChangeCallback={() => {
              setMeanFingerprint(!meanFingerprint);
            }}
            clickCloseCallback={() => {
              setVoxelIndex(undefined);
            }}
          />
          <ParentSize className="fingerprint-container" debounceTime={10}>
            {({ width: fingerprintWidth, height: fingerprintHeight }) => (
              <ContrastFingerprint
                loading={loadingFingerprint}
                clickedLabelCallback={(contrastIndex: number) => {
                  if (sharedState) {
                    setContrast({ payload: contrastIndex });
                  }
                }}
                selectedContrast={contrast}
                orientation={
                  orientation === Orientation.VERTICAL
                    ? Orientation.HORIZONTAL
                    : Orientation.VERTICAL
                }
                contrastLabels={contrastLabels}
                fingerprint={contrastFingerprint}
                width={fingerprintWidth}
                height={fingerprintHeight}
                lowHandleMinRelease={(newValue: number) =>
                  setLowThresholdMin(newValue)
                }
                lowHandleMaxRelease={(newValue: number) =>
                  setLowThresholdMax(newValue)
                }
                highHandleMinRelease={(newValue: number) =>
                  setHighThresholdMin(newValue)
                }
                highHandleMaxRelease={(newValue: number) =>
                  setHighThresholdMax(newValue)
                }
              />
            )}
          </ParentSize>
        </div>
      ) : null}
    </div>
  );
};

export default SurfaceExplorer;
