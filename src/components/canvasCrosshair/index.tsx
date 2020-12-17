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
      canvas.height = height;
      canvas.width = width;

      ctx.strokeStyle = Colors.BLUE5;

      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(x * width, 0);
      ctx.lineTo(x * width, width);
      ctx.stroke();

      // Draw horisontal line
      ctx.beginPath();
      ctx.moveTo(0, y * height);
      ctx.lineTo(height, y * height);
      ctx.stroke();

      // Mouse events
      canvas.onmousedown = (e) => {
        setMouseDown(true);
        changeCallback(e.offsetX / width, e.offsetY / height);
      };
      canvas.onmouseup = (e) => {
        setMouseDown(false);
      };
    }
  }, [height, width, x, y, changeCallback]);

  useEffect(() => {
    const canvas = canvasEl.current;

    if (canvas) {
      canvas.onmousemove = (e) => {
        if (mouseDown) {
          changeCallback(e.offsetX / width, e.offsetY / height);
        }
      };
    }
  }, [height, width, changeCallback, mouseDown]);

  return <canvas ref={canvasEl} className={"slice-crosshair-canvas"} />;
};

export default CanvasCrosshair;
