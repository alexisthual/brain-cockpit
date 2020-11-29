import React, { useEffect, useReducer, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import ContrastFingerprint from "./components/contrastFingerprint";
import Header from "./components/header";
import Scene from "./components/scene";
import { Contrast, Orientation, Subject } from "constants/index";
import "./App.scss";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");

type ActionLabel = {
  type?: "increment" | "decrement";
  payload?: number;
};

const App = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [taskCounts, setTaskCounts] = useState<number[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [meanContrastMap, setMeanContrastMap] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);

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

  // Initialise all app state variables
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

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      if (meanContrastMap) {
        eel.get_left_contrast_mean(contrast.index)((contrastMap: number[]) => {
          setContrastMap(contrastMap);
        });
      } else if (subject.index !== undefined) {
        eel.get_left_contrast(
          subject.index,
          contrast.index
        )((contrastMap: number[]) => {
          setContrastMap(contrastMap);
        });
      }
    }
  }, [subject, contrast, meanContrastMap]);

  // Update fingerprint when voxelIndex or subjectIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      if (meanFingerprint) {
        eel.get_voxel_fingerprint_mean(voxelIndex)((fingerprint: number[]) => {
          setContrastFingerprint(fingerprint);
        });
      } else if (subject.index !== undefined) {
        eel.get_voxel_fingerprint(
          subject.index,
          voxelIndex
        )((contrastFingerprint: number[]) => {
          setContrastFingerprint(contrastFingerprint);
        });
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
      <Header
        subjectLabels={subjectLabels}
        subject={subject.label}
        contrast={contrast.label}
        contrastIndex={contrast.index}
        voxelIndex={voxelIndex}
        subjectChangeCallback={(subjectIndex: number) => {
          setSubject({ payload: subjectIndex });
        }}
        meanContrastMap={meanContrastMap}
        meanChangeCallback={() => {
          setMeanContrastMap(!meanContrastMap);
        }}
      />
      <div id="scene">
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              selectedVoxel={voxelIndex}
              surfaceMap={contrastMap}
              width={sceneWidth}
              height={sceneHeight}
              keyPressEvents={[
                {
                  keyCode: 76,
                  callback: () => {
                    setContrast({ type: "increment" });
                  },
                },
                {
                  keyCode: 74,
                  callback: () => {
                    setContrast({ type: "decrement" });
                  },
                },
                {
                  keyCode: 73,
                  callback: () => {
                    setSubject({ type: "decrement" });
                  },
                },
                {
                  keyCode: 75,
                  callback: () => {
                    setSubject({ type: "increment" });
                  },
                },
              ]}
            />
          )}
        </ParentSize>
      </div>
      {voxelIndex !== undefined ? (
        <div id="fingerprint">
          <ParentSize className="fingerprint-container" debounceTime={10}>
            {({ width: fingerprintWidth, height: fingerprintHeight }) => (
              <ContrastFingerprint
                changeOrientationCallback={() => {
                  switch (orientation) {
                    case Orientation.VERTICAL:
                      setOrientation(Orientation.HORIZONTAL);
                      break;
                    case Orientation.HORIZONTAL:
                      setOrientation(Orientation.VERTICAL);
                      break;
                  }
                }}
                closePanelCallback={() => {
                  setVoxelIndex(undefined);
                }}
                clickedLabelCallback={(contrastIndex: number) => {
                  setContrast({ payload: contrastIndex });
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
                meanFingerprint={meanFingerprint}
                meanFingerprintCallback={() => {
                  setMeanFingerprint(!meanFingerprint);
                }}
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

export default App;
