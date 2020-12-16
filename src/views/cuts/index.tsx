import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useEffect, useState } from "react";

import { eel } from "App";
import CanvasSlice from "components/canvasSlice";
import CanvasCrosshair from "components/canvasCrosshair";

import "./style.scss";

const CutsExplorer = () => {
  const [x, setX] = useState(125);
  const [y, setY] = useState(75);
  const [z, setZ] = useState(100);
  const [sagitalSlice, setSagitalSlice] = useState<number[][]>([]);
  const [coronalSlice, setCoronalSlice] = useState<number[][]>([]);
  const [horizontalSlice, setHorizontalSlice] = useState<number[][]>([]);

  useEffect(() => {
    eel.get_sagital(x)((sagitalSlice: number[][]) => {
      setSagitalSlice(sagitalSlice);
    });
  }, [x]);

  useEffect(() => {
    eel.get_coronal(y)((coronalSlice: number[][]) => {
      setCoronalSlice(coronalSlice);
    });
  }, [y]);

  useEffect(() => {
    eel.get_horizontal(z)((horizontalSlice: number[][]) => {
      setHorizontalSlice(horizontalSlice);
    });
  }, [z]);

  return (
    <div className="slice-container">
      <div className="slices">
        <ParentSize>
          {({ width, height }) => (
            <>
              <CanvasSlice image={sagitalSlice} height={height} width={width} />
              {sagitalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={height}
                  width={width}
                  x={z / sagitalSlice.length}
                  y={y / sagitalSlice.length}
                  changeCallback={(newX: number, newY: number) => {
                    setZ(Math.floor(newX * sagitalSlice.length));
                    setY(Math.floor(newY * sagitalSlice[0].length));
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
              <CanvasSlice image={coronalSlice} height={height} width={width} />
              {coronalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={height}
                  width={width}
                  x={x / coronalSlice.length}
                  y={z / coronalSlice.length}
                  changeCallback={(newX: number, newY: number) => {
                    setX(Math.floor(newX * coronalSlice.length));
                    setZ(Math.floor(newY * coronalSlice.length));
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
                image={horizontalSlice}
                height={height}
                width={width}
              />
              {horizontalSlice.length > 0 ? (
                <CanvasCrosshair
                  height={height}
                  width={width}
                  x={x / horizontalSlice.length}
                  y={y / horizontalSlice.length}
                  changeCallback={(newX: number, newY: number) => {
                    setX(Math.floor(newX * horizontalSlice.length));
                    setY(Math.floor(newY * horizontalSlice[0].length));
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
