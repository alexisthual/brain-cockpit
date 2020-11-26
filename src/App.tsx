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
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [orientation] = useState(Orientation.VERTICAL);

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

  // Initialise contrast map
  useEffect(() => {
    eel.get_subjects()((subjectLabels: string[]) => {
      setSubjectLabels(subjectLabels);
      setSubject({ payload: 0 });
      eel.get_contrast_labels()((contrastLabels: string[]) => {
        setContrastLabels(contrastLabels);
        eel.get_left_contrast(
          0,
          0
        )((contrastMap: number[]) => {
          setContrast({ payload: 0 });
          setContrastMap(contrastMap);
        });
      });
    });
  }, []);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (subject.index !== undefined && contrast.index !== undefined) {
      eel.get_left_contrast(
        subject.index,
        contrast.index
      )((contrastMap: number[]) => {
        setContrastMap(contrastMap);
      });
    }
  }, [subject, contrast]);

  // Update fingerprint when voxelIndex or subjectIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      eel.get_voxel_fingerprint(
        subject.index,
        voxelIndex
      )((contrastFingerprint: number[]) => {
        setContrastFingerprint(contrastFingerprint);
      });
    }
  }, [voxelIndex, subject]);

  return (
    <div id="main-container" className={`${orientation}-orientation`}>
      <Header
        subjectLabels={subjectLabels}
        subject={subject.label}
        contrast={contrast.label}
        contrastIndex={contrast.index}
        voxelIndex={voxelIndex}
        subjectChangeCallback={(subjectIndex: number) => {
          setSubject({ payload: subjectIndex });
        }}
      />
      <div id="scene">
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
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
      <div id="fingerprint">
        <ParentSize className="fingerprint-container" debounceTime={10}>
          {({ width: fingerprintWidth, height: fingerprintHeight }) => (
            <ContrastFingerprint
              clickedLabelCallback={(contrastIndex: number) => {
                setContrast({ payload: contrastIndex });
              }}
              orientation={
                orientation === Orientation.VERTICAL
                  ? Orientation.HORIZONTAL
                  : Orientation.VERTICAL
              }
              labels={contrastLabels}
              fingerprint={contrastFingerprint}
              width={fingerprintWidth}
              height={fingerprintHeight}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
};

export default App;
