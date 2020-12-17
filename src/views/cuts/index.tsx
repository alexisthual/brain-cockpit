import { Colors } from "@blueprintjs/core";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useEffect, useState } from "react";

import { eel } from "App";
import CanvasSlice from "components/canvasSlice";
import CanvasCrosshair from "components/canvasCrosshair";
import Timeseries from "components/timeseries";

import "./style.scss";

const CutsExplorer = () => {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [z, setZ] = useState(0.5);
  const [t, setT] = useState(0);
  const [anatSize, setAnatSize] = useState<number[]>([0, 0, 0]);
  const [anatSagitalSlice, setAnatSagitalSlice] = useState<number[][]>([]);
  const [anatCoronalSlice, setAnatCoronalSlice] = useState<number[][]>([]);
  const [anatHorizontalSlice, setAnatHorizontalSlice] = useState<number[][]>(
    []
  );
  const [contThreshold, setContThreshold] = useState(0.5);
  const [contSize, setContSize] = useState<number[]>([0, 0, 0]);
  const [contSagitalSlice, setContSagitalSlice] = useState<number[][]>([]);
  const [contCoronalSlice, setContCoronalSlice] = useState<number[][]>([]);
  const [contHorizontalSlice, setContHorizontalSlice] = useState<number[][]>(
    []
  );
  const [voxelTimeseries, setVoxelTimeseries] = useState<number[]>([]);
  // Some nifti files are rotated
  const [rotatedSagital] = useState(false);

  // Get voxel timeseries
  useEffect(() => {
    eel.get_voxel_timeseries(
      Math.floor(x * contSize[0]),
      Math.floor(y * contSize[1]),
      Math.floor(z * contSize[2])
    )((timeseries: number[]) => {
      setVoxelTimeseries(timeseries);
    });
  }, [x, y, z]);

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
    eel.get_anatomical_sagital(Math.floor(x * anatSize[0]))(
      (slice: number[][]) => {
        setAnatSagitalSlice(slice);
      }
    );
    eel.get_contrast_sagital(
      Math.floor(x * contSize[0]),
      t
    )((slice: number[][]) => {
      setContSagitalSlice(slice);
    });
  }, [x, t, anatSize, contSize]);

  useEffect(() => {
    eel.get_anatomical_coronal(Math.floor(y * anatSize[1]))(
      (slice: number[][]) => {
        setAnatCoronalSlice(slice);
      }
    );
    eel.get_contrast_coronal(
      Math.floor(y * contSize[1]),
      t
    )((slice: number[][]) => {
      setContCoronalSlice(slice);
    });
  }, [y, t, anatSize, contSize]);

  useEffect(() => {
    eel.get_anatomical_horizontal(Math.floor(z * anatSize[2]))(
      (slice: number[][]) => {
        setAnatHorizontalSlice(slice);
      }
    );
    eel.get_contrast_horizontal(
      Math.floor(z * contSize[2]),
      t
    )((slice: number[][]) => {
      setContHorizontalSlice(slice);
    });
  }, [z, t, anatSize, contSize]);

  return (
    <div className="slice-container">
      <div className="slices">
        <ParentSize>
          {({ width, height }) => (
            <>
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
                color1={Colors.VERMILION1}
                color2={Colors.GOLD5}
                threshold={contThreshold}
              />
              {anatSagitalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                  x={rotatedSagital ? z : y}
                  y={rotatedSagital ? y : z}
                  changeCallback={(newX: number, newY: number) => {
                    if (rotatedSagital) {
                      setZ(newX);
                      setY(newY);
                    } else {
                      setY(newX);
                      setZ(newY);
                    }
                  }}
                />
              ) : null}
              <div className="slice-label">x: {x}</div>
            </>
          )}
        </ParentSize>
        <ParentSize>
          {({ width, height }) => (
            <>
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
                color1={Colors.VERMILION1}
                color2={Colors.GOLD5}
                threshold={contThreshold}
              />
              {anatCoronalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                  x={x}
                  y={z}
                  changeCallback={(newX: number, newY: number) => {
                    setX(newX);
                    setZ(newY);
                  }}
                />
              ) : null}
              <div className="slice-label">y: {y}</div>
            </>
          )}
        </ParentSize>
        <ParentSize>
          {({ width, height }) => (
            <>
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
                color1={Colors.VERMILION1}
                color2={Colors.GOLD5}
                threshold={contThreshold}
              />
              {anatHorizontalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                  x={x}
                  y={y}
                  changeCallback={(newX: number, newY: number) => {
                    setX(newX);
                    setY(newY);
                  }}
                />
              ) : null}
              <div className="slice-label">z: {z}</div>
            </>
          )}
        </ParentSize>
      </div>
      <div className={"slice-information"}>
        <ParentSize>
          {({ width, height }) => (
            <Timeseries
              clickCallback={(t: number) => setT(t)}
              timeseries={voxelTimeseries}
              selectedT={t}
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
