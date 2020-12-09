import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useEffect, useReducer, useState } from "react";
import { nanoid } from "nanoid";

import { eel } from "App";
import ContrastFingerprint from "components/contrastFingerprint";
import InfoPanel from "components/infoPanel";
import PanelButtons from "components/infoPanel/buttons";
import PanesButtons from "./panesButtons";
import ScenePane from "components/scenePane";
import TextualLoader from "components/textualLoader";
import {
  Contrast,
  HemisphereSide,
  HemisphereSideString,
  MeshType,
  MeshTypeString,
  Orientation,
  Subject,
} from "constants/index";

type ActionLabel = {
  type?: "increment" | "decrement";
  payload?: number;
};

type ActionPane = {
  type?: "add" | "remove";
  payload?: string;
};

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

  useEffect(() => {
    // Set keybinding
    const keyPressEvents = [
      {
        keyCode: 76, // L
        callback: () => {
          if (sharedState) {
            setContrast({ type: "increment" });
          }
        },
      },
      {
        keyCode: 74, // J
        callback: () => {
          if (sharedState) {
            setContrast({ type: "decrement" });
          }
        },
      },
      {
        keyCode: 73, // K
        callback: () => {
          if (sharedState && !meanContrastMap) {
            setSubject({ type: "increment" });
          }
        },
      },
      {
        keyCode: 75, // I
        callback: () => {
          if (sharedState && !meanContrastMap) {
            setSubject({ type: "decrement" });
          }
        },
      },
      {
        keyCode: 85, // U
        callback: () => {
          if (sharedState) {
            setMeanContrastMap((prevMeanContrastMap) => !prevMeanContrastMap);
          }
        },
      },
      {
        keyCode: 79, // O
        callback: () => {
          if (sharedState) {
            setMeanFingerprint((prevMeanFingerprint) => !prevMeanFingerprint);
          }
        },
      },
      {
        keyCode: 87, // W
        callback: () => {
          if (sharedState) {
            setWireframe((prevWireframe) => !prevWireframe);
          }
        },
      },
    ];
    keyPressEvents.forEach((keyPressEvent: any) => {
      window.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === keyPressEvent.keyCode) {
          keyPressEvent.callback();
        }
      });
    });

    return () => {
      keyPressEvents.forEach((keyPressEvent: any) => {
        window.removeEventListener("keydown", (event) => {
          if (event.isComposing || event.keyCode === keyPressEvent.keyCode) {
            keyPressEvent.callback();
          }
        });
      });
    };
  }, [sharedState, meanContrastMap]);

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
            subjectLabels={subjectLabels}
            subject={subject.label}
            contrast={contrast.label}
            contrastIndex={contrast.index}
            voxelIndex={voxelIndex}
            subjectChangeCallback={(subjectIndex: number) => {
              setSubject({ payload: subjectIndex });
            }}
            meanSurfaceMap={meanContrastMap}
            meanChangeCallback={() => {
              setMeanContrastMap(!meanContrastMap);
            }}
            meshType={meshType}
            meshTypeLabels={Object.keys(MeshType) as MeshTypeString[]}
            meshTypeChangeCallback={(meshType: MeshType) => {
              setMeshType(meshType);
            }}
            hemi={hemi}
            hemiLabels={Object.keys(HemisphereSide) as HemisphereSideString[]}
            hemiChangeCallback={(hemi: HemisphereSide) => {
              setHemi(hemi);
            }}
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
