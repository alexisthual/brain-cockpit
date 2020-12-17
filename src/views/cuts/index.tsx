import { Colors } from "@blueprintjs/core";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useEffect, useState } from "react";

import { eel } from "App";
import CanvasSlice from "components/canvasSlice";
import CanvasCrosshair from "components/canvasCrosshair";

import "./style.scss";

const CutsExplorer = () => {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [z, setZ] = useState(0.5);
  const [anatSize, setAnatSize] = useState<number[]>([0, 0, 0]);
  const [anatSagitalSlice, setAnatSagitalSlice] = useState<number[][]>([]);
  const [anatCoronalSlice, setAnatCoronalSlice] = useState<number[][]>([]);
  const [anatHorizontalSlice, setAnatHorizontalSlice] = useState<number[][]>(
    []
  );
  const [contSize, setContSize] = useState<number[]>([0, 0, 0]);
  const [contSagitalSlice, setContSagitalSlice] = useState<number[][]>([]);
  const [contCoronalSlice, setContCoronalSlice] = useState<number[][]>([]);
  const [contHorizontalSlice, setContHorizontalSlice] = useState<number[][]>(
    []
  );
  // Some nifti files are rotated
  const [rotatedSagital] = useState(false);

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
      5
    )((slice: number[][]) => {
      setContSagitalSlice(slice);
    });
  }, [x, anatSize, contSize]);

  useEffect(() => {
    eel.get_anatomical_coronal(Math.floor(y * anatSize[1]))(
      (slice: number[][]) => {
        setAnatCoronalSlice(slice);
      }
    );
    eel.get_contrast_coronal(
      Math.floor(y * contSize[1]),
      5
    )((slice: number[][]) => {
      setContCoronalSlice(slice);
    });
  }, [y, anatSize, contSize]);

  useEffect(() => {
    eel.get_anatomical_horizontal(Math.floor(z * anatSize[2]))(
      (slice: number[][]) => {
        setAnatHorizontalSlice(slice);
      }
    );
    eel.get_contrast_horizontal(
      Math.floor(z * contSize[2]),
      5
    )((slice: number[][]) => {
      setContHorizontalSlice(slice);
    });
  }, [z, anatSize, contSize]);

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
                color2={Colors.LIGHT_GRAY5}
                threshold={0.5}
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
                color2={Colors.LIGHT_GRAY5}
                threshold={0.5}
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
                color2={Colors.LIGHT_GRAY5}
                threshold={0.5}
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
    </div>
  );
};

export default CutsExplorer;
