import { Colors } from "@blueprintjs/core";
import interpolate from "color-interpolate";
import React, { useRef } from "react";

import "./style.scss";

const colorString = require("color-string");

interface Props {
  image: number[][];
  alpha?: number;
  threshold?: number;
  range?: number[];
  color1?: string;
  color2?: string;
  height: number;
  width: number;
}

const getMax = (a: any) => {
  return Math.max(...a.map((e: any) => (Array.isArray(e) ? getMax(e) : e)));
};

const getMin = (a: any, t: number) => {
  return Math.min(
    ...a.map((e: any) =>
      Array.isArray(e) ? getMin(e, t) : e > t ? e : Infinity
    )
  );
};

const CanvasSlice = ({
  alpha = 1,
  image,
  threshold,
  range,
  color1 = Colors.BLACK,
  color2 = Colors.WHITE,
  height,
  width,
}: Props) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const colormap = interpolate([color1, color2]);

  const canvas = canvasEl.current;
  const ctx = canvas?.getContext("2d");

  if (canvas && ctx && image.length > 0) {
    canvas.height = height;
    canvas.width = width;
    const pixelWidth = width / image.length;
    const pixelHeight = height / image[0].length;
    const max = range !== undefined ? range[1] : getMax(image);
    const min =
      range !== undefined
        ? range[0]
        : getMin(image, threshold ? max * threshold : 0);

    // Draw image pixels
    for (let i = 0; i < image.length; i++) {
      for (let j = 0; j < image[0].length; j++) {
        const intensity = image[i][j];
        const normalizedIntensity = Math.min(
          Math.max((intensity - min) / (max - min), 0),
          1
        );

        ctx.fillStyle =
          threshold && Math.abs(intensity) < threshold * max
            ? colorString.to.rgb(colorString.get.rgb(color1).slice(0, 3), 0)
            : colorString.to.rgb(
                colorString.get
                  .rgb(colormap(normalizedIntensity || 0))
                  .slice(0, 3),
                max - min > 0 ? alpha : 0
              );
        ctx.fillRect(
          i * pixelWidth,
          j * pixelHeight,
          1.2 * pixelWidth,
          1.2 * pixelHeight
        );
      }
    }
  }

  return <canvas ref={canvasEl} className={"slice-canvas"} />;
};

export default React.memo(CanvasSlice);
