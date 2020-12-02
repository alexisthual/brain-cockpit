import React, { useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import BSCuts from "components/brainspriteCuts";
import type { BrainSpriteObject } from "components/brainspriteCuts";

import { eel } from "App";

const CutsExplorer = () => {
  const [mnicoordinates, setMnicoordinates] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [slicecoordinate, setSlicecoordinate] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [tAtCoordinate, setTAtCoordinate] = useState<number>(NaN);

  useEffect(() => {
    eel.get_t_at_coordinate(slicecoordinate)((returned_t: number) => {
      setTAtCoordinate(returned_t);
    });
  }, [slicecoordinate, mnicoordinates])

  return (
    <div
      id="main-container"
    >
    <ParentSize className="container" debounceTime={10}>
      {({ width: cWidth, height: cHeight }) => (
      <BSCuts
        clickedVoxelCallback={(brain: BrainSpriteObject) => {
          if (brain.coordinatesSlice !== undefined && brain.numSlice !== undefined) {
            setMnicoordinates([brain.coordinatesSlice.X,
                               brain.coordinatesSlice.Y,
                               brain.coordinatesSlice.Z]);
            setSlicecoordinate([brain.numSlice.X,
                               brain.numSlice.Y,
                               brain.numSlice.Z]);
          }
        }}
        width={cWidth}
        height={cHeight}
      />
    )}
    </ParentSize>
    <ul>
      <li>
        X = {mnicoordinates[0]}
      </li><li>
        Y = {mnicoordinates[1]}
      </li><li>
        Z = {mnicoordinates[2]}
      </li><li>
        At that coordinate, t = {tAtCoordinate}
      </li>
    </ul>
    </div>
  );
};

export default CutsExplorer;
