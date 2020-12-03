import React, { useEffect, useState } from "react";

import BSCuts from "components/brainspriteCuts";
import GenericPlottable from "components/genericPlottable";

import type { BrainSpriteObject } from "components/brainspriteCuts";
import type { Plottable } from "components/genericPlottable";


import { eel } from "App";

import "./style.scss";

const CutsExplorer = () => {
  const [mnicoordinates, setMnicoordinates] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [slicecoordinates, setSlicecoordinates] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [tAtCoordinate, setTAtCoordinate] = useState<number>(NaN);
  const [tThreshold, setTThreshold] = useState<number>(3);
  const [contrast, setContrast] = useState<string>("active - rest");
  const [plottableList, setPlottableList] = useState<Plottable[]>([]);

  useEffect(() => {
    eel.get_t_at_coordinate(slicecoordinates)((returned_t: number) => {
      setTAtCoordinate(returned_t);
    });
    eel.get_callbacks(mnicoordinates)((plottables: Plottable[]) => {
      setPlottableList(plottables);
    });
  }, [slicecoordinates, mnicoordinates])

  return (
    <div id="grid-container" >
    <div id="infoscontainer">
      <div>
        <label className="form">
          <p>T-value threshold </p>
          <input
            type="number"
            value={tThreshold}
            // TODO: the type cast here looks abusive...?
            onChange={(e: React.FormEvent<HTMLInputElement>) => {
              setTThreshold(parseInt((e.target as HTMLInputElement).value));
            }}/>
        </label>
        <label className="form">
          <p>Contrast </p>
          <input
            type="string"
            value={contrast}
            onChange={(e: React.FormEvent<HTMLInputElement>) => {
              setContrast((e.target as HTMLInputElement).value);
            }}/>
        </label>
    </div>
      <div id="infos">
    <ul>
      <li>
        MNI = {[mnicoordinates[0], mnicoordinates[1], mnicoordinates[2]].toString()}
      </li><li>
        slices = {[slicecoordinates[0], slicecoordinates[1], slicecoordinates[2]].toString()}
      </li><li>
        At that coordinate, t = {tAtCoordinate}
      </li>
    </ul>
    </div>
    </div>
    <div id="cutsviewer" >
      <BSCuts
        clickedVoxelCallback={(brain: BrainSpriteObject) => {
          if (brain.coordinatesSlice !== undefined && brain.numSlice !== undefined) {
            // TODO There seem to be a log of one click :-(
            setMnicoordinates([brain.coordinatesSlice.X,
                               brain.coordinatesSlice.Y,
                               brain.coordinatesSlice.Z]);
            setSlicecoordinates([brain.numSlice.X,
                               brain.numSlice.Y,
                               brain.numSlice.Z]);
          }
        }}
        contrast={contrast}
        tThreshold={tThreshold}
      />
    </div>
    <div id="derivatives">
      <GenericPlottable
        plottableList={plottableList}
      />
    </div>
    </div>
  );
};

export default CutsExplorer;
