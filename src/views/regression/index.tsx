import React, { useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import ContrastFingerprint from "components/contrastFingerprint";
import Header from "components/header";
import Scene from "components/scene";
import { Orientation, Subject } from "constants/index";
import { eel } from "App";

const RegressionExplorer = () => {
  const initalSubject: Subject = { index: 10, label: "sub-15" };
  const [subject] = useState(initalSubject);
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [taskCounts, setTaskCounts] = useState<number[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [errorMap, setErrorMap] = useState<number[] | undefined>();
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(true);
  const [regressedCoordinates, setRegressedCoordinates] = useState<
    number[] | undefined
  >();

  // Initialise all app state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const contrastLabels = eel.get_contrast_labels()();
      const tasks = eel.get_tasks()();
      const errorMap = eel.get_regressed_coordinates_error()();

      // Wait for all data to be loaded before setting app state
      Promise.all([contrastLabels, tasks, errorMap]).then((values) => {
        setVoxelIndex(0);
        setContrastLabels(values[0]);
        setTaskLabels(values[1].map((x: any) => x[0]));
        setTaskCounts(values[1].map((x: any) => x[1]));
        setErrorMap(values[2]);
      });
    };

    fetchAllData();

    // Set keybinding
    const keyPressEvents = [
      {
        keyCode: 79, // O
        callback: () => {
          setMeanFingerprint((prevMeanFingerprint) => !prevMeanFingerprint);
        },
      },
      {
        keyCode: 87, // W
        callback: () => {
          setWireframe((prevWireframe) => !prevWireframe);
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
  }, []);

  // Update on voxelIndex change
  useEffect(() => {
    // Get regressed coordinates on voxelIndex change
    if (voxelIndex !== undefined) {
      eel.get_regressed_coordinates(voxelIndex)((coordinates: number[]) => {
        setRegressedCoordinates(coordinates);
      });
    }

    // Get activation fingerprint for this voxel
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
  }, [voxelIndex, subject, meanFingerprint]);

  return (
    <div
      id="main-container"
      className={`${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <Header subject={subject.label} voxelIndex={voxelIndex} />
      <div id="scene">
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              selectedVoxel={voxelIndex}
              surfaceMap={errorMap}
              wireframe={wireframe}
              regressedCoordinates={regressedCoordinates}
              width={sceneWidth}
              height={sceneHeight}
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

export default RegressionExplorer;
