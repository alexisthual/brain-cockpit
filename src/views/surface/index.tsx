import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useCallback, useEffect, useReducer, useState } from "react";
import { nanoid } from "nanoid";

import { eel } from "App";
import Colorbar from "components/colorbar";
import ContrastFingerprint from "components/contrastFingerprint";
import InfoPanel from "components/infoPanel";
import PanelButtons from "components/infoPanel/buttons";
import PanesButtons from "./panesButtons";
import ScenePane from "components/scenePane";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  ActionPane,
  Contrast,
  HemisphereSide,
  MeshType,
  Orientation,
  Subject,
} from "constants/index";

const SurfaceExplorer = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [taskCounts, setTaskCounts] = useState<number[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [loadingContrastMap, setLoadingContrastMap] = useState(false);
  const [meanContrastMap, setMeanContrastMap] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
  const [hemi, setHemi] = useState(HemisphereSide.LEFT);
  const [sharedState, setSharedState] = useState(true);

  const subjectReducer = (state: Subject, action: ActionLabel): Subject => {
    let newIndex = state.index;
    let n = subjectLabels.length;
    switch (action.type) {
      case "increment":
        newIndex = ((((state.index ?? 0) + 1) % n) + n) % n;
        break;
      case "decrement":
        newIndex = ((((state.index ?? 0) - 1) % n) + n) % n;
        break;
      default:
        newIndex = ((action.payload ?? 0 % n) + n) % n;
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
        newIndex = ((((state.index ?? 0) + 1) % n) + n) % n;
        break;
      case "decrement":
        newIndex = ((((state.index ?? 0) - 1) % n) + n) % n;
        break;
      default:
        newIndex = ((action.payload ?? 0 % n) + n) % n;
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
      const subjectLabels = eel.get_subjects()();
      const contrastLabels = eel.get_contrast_labels()();
      const tasks = eel.get_tasks()();

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, tasks]).then((values) => {
        setSubjectLabels(values[0]);
        setContrastLabels(values[1]);
        setTaskLabels(values[2].map((x: any) => x[0]));
        setTaskCounts(values[2].map((x: any) => x[1]));
        if (values[0].length > 0) {
          setSubject({ payload: 0 });
        }
        if (values[1].length > 0) {
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
      if (event.isComposing || event.keyCode === 73) {
        if (sharedState && !meanContrastMap) {
          setSubject({ type: "increment" });
        }
      }
    },
    [sharedState, meanContrastMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", incrementSubject);
    return () => window.removeEventListener("keydown", incrementSubject);
  }, [incrementSubject]);

  // K
  const decrementSubject = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 75) {
        if (sharedState && !meanContrastMap) {
          setSubject({ type: "decrement" });
        }
      }
    },
    [sharedState, meanContrastMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", decrementSubject);
    return () => window.removeEventListener("keydown", decrementSubject);
  }, [decrementSubject]);

  // U
  const toggleMeanContrastMap = useCallback(
    (event: any) => {
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

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      setLoadingContrastMap(true);
      if (meanContrastMap) {
        eel.get_contrast_mean(
          contrast.index,
          hemi
        )((contrastMap: number[]) => {
          setContrastMap(contrastMap);
          setLoadingContrastMap(false);
        });
      } else if (subject.index !== undefined) {
        eel.get_contrast(
          subject.index,
          contrast.index,
          hemi
        )((contrastMap: number[]) => {
          setContrastMap(contrastMap);
          setLoadingContrastMap(false);
        });
      } else {
        setLoadingContrastMap(false);
      }
    }
  }, [subject, contrast, meanContrastMap, hemi]);

  // Update fingerprint when voxelIndex or subjectIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      setLoadingFingerprint(true);
      if (meanFingerprint) {
        eel.get_voxel_fingerprint_mean(voxelIndex)((fingerprint: number[]) => {
          setContrastFingerprint(fingerprint);
          setLoadingFingerprint(false);
        });
      } else if (subject.index !== undefined) {
        eel.get_voxel_fingerprint(
          subject.index,
          voxelIndex
        )((contrastFingerprint: number[]) => {
          setContrastFingerprint(contrastFingerprint);
          setLoadingFingerprint(false);
        });
      } else {
        setLoadingFingerprint(false);
      }
    }
  }, [voxelIndex, subject, meanFingerprint]);

  return (
    <div
      id="main-container"
      className={`${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <div id="scenes">
        <Colorbar
          vmin={
            contrastMap !== undefined ? Math.min(...contrastMap) : undefined
          }
          vmax={
            contrastMap !== undefined ? Math.max(...contrastMap) : undefined
          }
        />
        <PanesButtons
          addPaneCallback={() => {
            setPanes({ type: "add" });
          }}
          sharedState={sharedState}
          sharedStateCallback={() => {
            setSharedState(!sharedState);
          }}
        />
        {sharedState && loadingContrastMap ? (
          <TextualLoader text="Loading surface map..." />
        ) : null}
        {sharedState ? (
          <InfoPanel
            rows={[
              {
                label: "Mesh Type",
                inputs: [
                  {
                    value: meshType,
                    values: Object.keys(MeshType),
                    onChangeCallback: (newValue: string) =>
                      setMeshType(newValue as MeshType),
                  },
                ],
              },
              {
                label: "Hemi",
                inputs: [
                  {
                    value: hemi,
                    values: Object.keys(HemisphereSide),
                    onChangeCallback: (newValue: string) =>
                      setHemi(newValue as HemisphereSide),
                  },
                ],
              },
              {
                label: "Subject",
                inputs: [
                  {
                    value: subject.label,
                    values: subjectLabels,
                    onChangeCallback: (newValue: string) =>
                      setSubject({ payload: subjectLabels.indexOf(newValue) }),
                  },
                  {
                    value: meanContrastMap,
                    onChangeCallback: () =>
                      setMeanContrastMap(!meanContrastMap),
                    iconActive: "group-objects",
                    iconInactive: "ungroup-objects",
                    title: "Take subject's mean",
                  },
                ],
              },
              {
                label: "Contrast",
                inputs: [
                  {
                    value: contrast.label,
                    values: contrastLabels,
                    onChangeCallback: (newValue: string) =>
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
                subjectLabels={subjectLabels}
                contrastLabels={contrastLabels}
                sharedState={sharedState}
                sharedSubject={subject}
                sharedContrast={contrast}
                sharedSurfaceMap={contrastMap}
                sharedMeanSurfaceMap={meanContrastMap}
                sharedVoxelIndex={voxelIndex}
                setSharedVoxelIndex={(newVoxelIndex: number) => {
                  setVoxelIndex(newVoxelIndex);
                }}
                sharedWireframe={wireframe}
                sharedMeshType={meshType}
                sharedHemi={hemi}
              />
            );
          })}
        </div>
      </div>
      {voxelIndex !== undefined ? (
        <div id="fingerprint">
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
                taskLabels={taskLabels}
                taskCounts={taskCounts}
                fingerprint={contrastFingerprint}
                width={fingerprintWidth}
                height={fingerprintHeight}
              />
            )}
          </ParentSize>
        </div>
      ) : null}
    </div>
  );
};

export default SurfaceExplorer;
