import { Button, Colors, Slider } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import interpolate from "color-interpolate";
import React, { useEffect, useState } from "react";

import { eel } from "App";
import CanvasSlice from "components/canvasSlice";
import CanvasCrosshair from "components/canvasCrosshair";
import Colorbar from "components/colorbar";
import TextualLoader from "components/textualLoader";
import Timeseries from "components/timeseries";
import { stringRenderer } from "constants/index";

import "./style.scss";

const colorString = require("color-string");

interface Position {
  x: number;
  y: number;
  z: number;
}

const CutsExplorer = () => {
  const [subjects] = useState(["debby"]);
  const [subject, setSubject] = useState("debby");
  const [sequences] = useState(["seq-01"]);
  const [sequence, setSequence] = useState("seq-01");
  const [runs] = useState(["run-01"]);
  const [run, setRun] = useState("run-01");
  const [position, setPosition] = useState<Position>({
    x: 0.5,
    y: 0.5,
    z: 0.3,
  });
  const [t, setT] = useState(0);
  const [loadingSagital, setLoadingSagital] = useState(false);
  const [loadingCoronal, setLoadingCoronal] = useState(false);
  const [loadingHorizontal, setLoadingHorizontal] = useState(false);
  const [loadingTimeseries, setLoadingTimeseries] = useState(false);
  const [anatSize, setAnatSize] = useState<number[]>([0, 0, 0]);
  const [anatSagitalSlice, setAnatSagitalSlice] = useState<number[][]>([]);
  const [anatCoronalSlice, setAnatCoronalSlice] = useState<number[][]>([]);
  const [anatHorizontalSlice, setAnatHorizontalSlice] = useState<number[][]>(
    []
  );
  const [contThreshold, setContThreshold] = useState(0.5);
  const [contSize, setContSize] = useState<number[]>([0, 0, 0]);
  const [contRange, setContRange] = useState([0, 1]);
  const [contSagitalSlice, setContSagitalSlice] = useState<number[][]>([]);
  const [contCoronalSlice, setContCoronalSlice] = useState<number[][]>([]);
  const [contHorizontalSlice, setContHorizontalSlice] = useState<number[][]>(
    []
  );
  const [voxelTimeseries, setVoxelTimeseries] = useState<number[]>([]);
  // Some nifti files are rotated
  const [rotatedSagital] = useState(false);

  useEffect(() => {
    eel.get_contrast_range()((range: number[]) => {
      setContRange(range);
    });
  }, []);

  // Get voxel timeseries
  useEffect(() => {
    setLoadingTimeseries(true);
    eel.get_voxel_timeseries(
      Math.floor(position.x * contSize[0]),
      Math.floor(position.y * contSize[1]),
      Math.floor(position.z * contSize[2])
    )((timeseries: number[]) => {
      setVoxelTimeseries(timeseries);
      setLoadingTimeseries(false);
    });
  }, [position.x, position.y, position.z, contSize]);

  // Get slice shapes
  useEffect(() => {
    eel.get_anatomical_shape()((shape: number[]) => {
      setAnatSize(shape);
    });
    eel.get_contrast_shape()((shape: number[]) => {
      setContSize(shape);
    });
  }, []);

  // Set logic for updating slices on x,y,z-change
  useEffect(() => {
    setLoadingSagital(true);
    const anat = eel.get_anatomical_sagital(
      Math.floor(position.x * anatSize[0])
    )();
    const contrast = eel.get_contrast_sagital(
      Math.floor(position.x * contSize[0]),
      t
    )();
    Promise.all([anat, contrast]).then((values) => {
      setAnatSagitalSlice(values[0]);
      setContSagitalSlice(values[1]);
      setLoadingSagital(false);
    });
  }, [position.x, t, anatSize, contSize]);

  useEffect(() => {
    setLoadingCoronal(true);
    const anat = eel.get_anatomical_coronal(
      Math.floor(position.y * anatSize[1])
    )();
    const contrast = eel.get_contrast_coronal(
      Math.floor(position.y * contSize[1]),
      t
    )();
    Promise.all([anat, contrast]).then((values) => {
      setAnatCoronalSlice(values[0]);
      setContCoronalSlice(values[1]);
      setLoadingCoronal(false);
    });
  }, [position.y, t, anatSize, contSize]);

  useEffect(() => {
    setLoadingHorizontal(true);
    const anat = eel.get_anatomical_horizontal(
      Math.floor(position.z * anatSize[2])
    )();
    const contrast = eel.get_contrast_horizontal(
      Math.floor(position.z * contSize[2]),
      t
    )();
    Promise.all([anat, contrast]).then((values) => {
      setAnatHorizontalSlice(values[0]);
      setContHorizontalSlice(values[1]);
      setLoadingHorizontal(false);
    });
  }, [position.z, t, anatSize, contSize]);

  const SelectSubject = Select.ofType<string>();
  const SelectSequence = Select.ofType<string>();
  const SelectRun = Select.ofType<string>();

  const color1 = Colors.VERMILION1;
  const color2 = Colors.GOLD5;
  const colormap = (i: number) =>
    colorString.get.rgb(interpolate([color1, color2])(i));

  return (
    <div className="slice-container">
      <div className="controls">
        <div className="item">
          <div className="item-label">Subject</div>
          <div className="item-value">
            <SelectSubject
              filterable={false}
              items={subjects}
              itemRenderer={stringRenderer}
              onItemSelect={(item: string) => {
                setSubject(item);
              }}
            >
              <Button rightIcon="double-caret-vertical" text={subject} />
            </SelectSubject>
          </div>
        </div>
        <div className="item">
          <div className="item-label">Sequance</div>
          <div className="item-value">
            <SelectSequence
              filterable={false}
              items={sequences}
              itemRenderer={stringRenderer}
              onItemSelect={(item: string) => {
                setSequence(item);
              }}
            >
              <Button rightIcon="double-caret-vertical" text={sequence} />
            </SelectSequence>
          </div>
        </div>
        <div className="item">
          <div className="item-label">Run</div>
          <div className="item-value">
            <SelectRun
              filterable={false}
              items={runs}
              itemRenderer={stringRenderer}
              onItemSelect={(item: string) => {
                setRun(item);
              }}
            >
              <Button rightIcon="double-caret-vertical" text={run} />
            </SelectRun>
          </div>
        </div>
        <div className="item">
          <div className="item-label">Threshold</div>
          <div className="item-value">
            <Slider
              min={0}
              max={1}
              stepSize={0.1}
              labelStepSize={10}
              onChange={(newThreshold: number) => {
                setContThreshold(newThreshold);
              }}
              value={contThreshold}
            />
          </div>
        </div>
      </div>
      <div className="slices">
        <div className="slices-grid">
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingSagital ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatSagitalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contSagitalSlice}
                  height={(Math.min(height, width) * contSize[0]) / anatSize[0]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatSagitalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={rotatedSagital ? position.z : position.y}
                    y={rotatedSagital ? position.y : position.z}
                    changeCallback={(newX: number, newY: number) => {
                      if (rotatedSagital) {
                        setPosition({
                          x: position.x,
                          y: newY,
                          z: newX,
                        });
                      } else {
                        setPosition({
                          x: position.x,
                          y: newX,
                          z: newY,
                        });
                      }
                    }}
                  />
                ) : null}
                <div className="slice-label">x: {position.x.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingCoronal ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatCoronalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contCoronalSlice}
                  height={(Math.min(height, width) * contSize[1]) / anatSize[1]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatCoronalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={position.x}
                    y={position.z}
                    changeCallback={(newX: number, newY: number) => {
                      setPosition({
                        x: newX,
                        y: position.y,
                        z: newY,
                      });
                    }}
                  />
                ) : null}
                <div className="slice-label">y: {position.y.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingHorizontal ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatHorizontalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contHorizontalSlice}
                  height={(Math.min(height, width) * contSize[2]) / anatSize[2]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatHorizontalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={position.x}
                    y={position.y}
                    changeCallback={(newX: number, newY: number) => {
                      setPosition({
                        x: newX,
                        y: newY,
                        z: position.z,
                      });
                    }}
                  />
                ) : null}
                <div className="slice-label">z: {position.z.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
        </div>
        <Colorbar
          colormap={colormap}
          vmin={contThreshold ? contRange[1] * contThreshold : contRange[0]}
          vmax={contRange[1]}
        />
      </div>
      <div className={"slice-information"}>
        <ParentSize>
          {({ width, height }) => (
            <Timeseries
              loading={loadingTimeseries}
              clickCallback={(t: number) => setT(t)}
              timeseries={voxelTimeseries}
              selectedT={t}
              range={contRange}
              height={height}
              width={width}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
};

export default CutsExplorer;
