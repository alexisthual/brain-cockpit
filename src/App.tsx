import React, { useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import ContrastFingerprint from "./components/contrastFingerprint";
import Header from "./components/header";
import Scene from "./components/scene";
import { Orientation } from "constants/index";
import "./App.scss";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");

const App = () => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string | undefined>();
  const [subjectIndex, setSubjectIndex] = useState<number | undefined>();
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrast, setContrast] = useState<string | undefined>();
  const [contrastIndex, setContrastIndex] = useState<number | undefined>();
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [orientation] = useState(Orientation.VERTICAL);

  useEffect(() => {
    eel.get_subjects()((subjects: string[]) => {
      setSubjects(subjects);
      setSubject(subjects[0]);
      setSubjectIndex(0);
      eel.get_contrast_labels()((contrastLabels: string[]) => {
        setContrastLabels(contrastLabels);
        eel.get_left_contrast(
          0,
          0
        )((contrastMap: number[]) => {
          setContrastIndex(0);
          setContrast(contrastLabels[0]);
          setContrastMap(contrastMap);
        });
      });
    });
  }, []);

  useEffect(() => {
    if (subjectIndex !== undefined && contrastIndex !== undefined) {
      eel.get_left_contrast(
        subjectIndex,
        contrastIndex
      )((contrastMap: number[]) => {
        setContrastMap(contrastMap);
      });
    }
  }, [subjectIndex, contrastIndex]);

  useEffect(() => {
    if (voxelIndex !== undefined) {
      eel.get_voxel_fingerprint(
        subjectIndex,
        voxelIndex
      )((contrastFingerprint: number[]) => {
        setContrastFingerprint(contrastFingerprint);
      });
    }
  }, [voxelIndex, subjectIndex]);

  return (
    <div id="main-container" className={`${orientation}-orientation`}>
      <Header
        subjects={subjects}
        subject={subject}
        contrast={contrast}
        contrastIndex={contrastIndex}
        voxelIndex={voxelIndex}
        subjectChangeCallback={(subject: string) => {
          setSubject(subject);
          setSubjectIndex(subjects.indexOf(subject));
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
            />
          )}
        </ParentSize>
      </div>
      <div id="fingerprint">
        <ParentSize className="fingerprint-container" debounceTime={10}>
          {({ width: fingerprintWidth, height: fingerprintHeight }) => (
            <ContrastFingerprint
              clickedLabelCallback={(
                contrastIndex: number,
                contrast: string
              ) => {
                setContrast(contrast);
                setContrastIndex(contrastIndex);
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
