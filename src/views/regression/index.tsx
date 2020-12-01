import React, { useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import Header from "components/header";
import Scene from "components/scene";
import { eel } from "App";

const RegressionExplorer = () => {
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [errorMap, setErrorMap] = useState<number[] | undefined>();
  const [wireframe, setWireframe] = useState(true);
  const [regressedCoordinates, setRegressedCoordinates] = useState<
    number[] | undefined
  >();

  // Initialise all app state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const errorMap = eel.get_regressed_coordinates_error()();

      // Wait for all data to be loaded before setting app state
      Promise.all([errorMap]).then((values) => {
        setVoxelIndex(0);
        setErrorMap(values[0]);
      });
    };

    fetchAllData();

    // Set keybinding
    const keyPressEvents = [
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

  // Get regressed coordinates on voxelIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      eel.get_regressed_coordinates(voxelIndex)((coordinates: number[]) => {
        setRegressedCoordinates(coordinates);
      });
    }
  }, [voxelIndex]);

  return (
    <div id="main-container">
      <Header voxelIndex={voxelIndex} />
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
    </div>
  );
};

export default RegressionExplorer;
