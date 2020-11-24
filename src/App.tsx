import React, { useEffect, useState } from "react";
import Scene from "./Scene";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import ContrastFingerprint from "./components/contrastFingerprint";
import HeaderItem from "./components/headerItem";
import { Orientation } from "constants/index";
import "./App.scss";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");

const App = () => {
  const [subject] = useState("sub-01");
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrast, setContrast] = useState<string | undefined>();
  const [contrastIndex, setContrastIndex] = useState<number | undefined>();
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [orientation] = useState(Orientation.VERTICAL);

  useEffect(() => {
    eel.get_contrast_labels()((contrastLabels: string[]) => {
      setContrastLabels(contrastLabels);
      eel.get_left_contrast(0)((contrastMap: number[]) => {
        setContrastIndex(0);
        setContrast(contrastLabels[0]);
        setContrastMap(contrastMap);
      });
    });
  }, []);

  const updateContrast = (contrastIndex: number, contrast: string) => {
    setContrast(contrast);
    setContrastIndex(contrastIndex);
    eel.get_left_contrast(contrastIndex)((contrastMap: number[]) => {
      setContrastMap(contrastMap);
    });
  };

  const updateContrasts = (voxelIndex: number) => {
    setVoxelIndex(voxelIndex);
    eel.explore_voxel(voxelIndex)((contrastFingerprint: number[]) => {
      setContrastFingerprint(contrastFingerprint);
    });
  };

  return (
    <div id="main-container" className={`${orientation}-orientation`}>
      <div id="header">
        <HeaderItem label={"Subject"} value={subject} />
        <HeaderItem
          label={"Contrast"}
          value={`${contrast} (${contrastIndex})`}
        />
        <HeaderItem label={"Voxel"} value={voxelIndex} />
      </div>
      <div id="scene">
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={updateContrasts}
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
                updateContrast(contrastIndex, contrast);
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
