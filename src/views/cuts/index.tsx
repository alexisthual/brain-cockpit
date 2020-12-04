import React, { useEffect, useState } from "react";

import BSCuts from "components/brainspriteCuts";
import GenericPlottable from "components/genericPlottable";

import type { BrainSpriteObject } from "components/brainspriteCuts";
import type { Plottable } from "components/genericPlottable";


import { eel } from "App";

import "./style.scss";

interface Defaults {
  subList: string[];
  taskList: string[];
  contrastList: string[]
}

const CutsExplorer = () => {
  const [mnicoordinates, setMnicoordinates] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [slicecoordinates, setSlicecoordinates] = useState<[number, number, number]>([NaN, NaN, NaN]);
  const [tAtCoordinate, setTAtCoordinate] = useState<number>(NaN);
  const [tThreshold, setTThreshold] = useState<number>(3);
  const [contrast, setContrast] = useState<string>("");
  const [plottableList, setPlottableList] = useState<Plottable[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [task, setTask] = useState<string>("");
  const [subList, setSubList] = useState<string[]>([]);
  const [taskList, setTaskList] = useState<string[]>([]);
  const [contrastList, setContrastList] = useState<string[]>([]);

  useEffect(() => {
    eel.get_t_at_coordinate(slicecoordinates)((returned_t: number) => {
      setTAtCoordinate(returned_t);
    });
    eel.get_callbacks(mnicoordinates)((plottables: Plottable[]) => {
      setPlottableList(plottables);
    });
  }, [slicecoordinates, mnicoordinates]);

  useEffect(() => {
    eel.get_available_subject_tasks()((defaults: Defaults) => {
      setSubList(defaults.subList);
      setTaskList(defaults.taskList);
      setContrastList(defaults.contrastList);
      setSubject(defaults.subList[0])
      setTask(defaults.taskList[0])
      setContrast(defaults.contrastList[0])
    });
  }, []);

  return (
    <div id="grid-container" >
    <div id="infoscontainer">
      <div>
        <label className="form">
          <p>Subject </p>
          <select
            value={subject}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setSubject((e.target as HTMLSelectElement).value);
            }}>
              { subList.map(e => {return (<option value={e}>{e}</option>)}) }
          </select>
        </label>
        <label className="form">
          <p>Task </p>
          <select
            value={task}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setTask((e.target as HTMLSelectElement).value);
            }}>
              {taskList.map(e => {return (<option value={e}>{e}</option>)})}
          </select>
        </label>
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
            // TODO There seem to be a lag of one click :-(
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
        subject={subject}
        task={task}
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
