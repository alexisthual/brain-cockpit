import { Colors } from "@blueprintjs/core";
import React, { useEffect, useRef, useState } from "react";

import "./style.scss";

interface Props {
  height: number;
  width: number;
  x: number;
  y: number;
  changeCallback: (x: number, y: number) => void;
}

const CanvasCrosshair = ({
  height,
  width,
  x,
  y,
  changeCallback = () => {},
}: Props) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const [mouseDown, setMouseDown] = useState(false);

  useEffect(() => {
    const canvas = canvasEl.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      const size = Math.min(height, width);
      canvas.height = size;
      canvas.width = size;

      ctx.strokeStyle = Colors.BLUE5;

      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(x * size, 0);
      ctx.lineTo(x * size, size);
      ctx.stroke();

      // Draw horisontal line
      ctx.beginPath();
      ctx.moveTo(0, y * size);
      ctx.lineTo(size, y * size);
      ctx.stroke();

      // Mouse events
      canvas.onmousedown = (e) => {
        setMouseDown(true);
        changeCallback(e.offsetX / size, e.offsetY / size);
      };
      canvas.onmouseup = (e) => {
        setMouseDown(false);
      };
    }
  }, [height, width, x, y, changeCallback]);

  useEffect(() => {
    const canvas = canvasEl.current;
    const size = Math.min(height, width);

    if (canvas) {
      canvas.onmousemove = (e) => {
        if (mouseDown) {
          changeCallback(e.offsetX / size, e.offsetY / size);
        }
      };
    }
  }, [height, width, changeCallback, mouseDown]);

  return <canvas ref={canvasEl} className={"slice-crosshair-canvas"} />;
};

export default CanvasCrosshair;
