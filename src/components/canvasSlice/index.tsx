import React, { useEffect, useRef } from "react";

import "./style.scss";

interface Props {
  image: number[][];
  height: number;
  width: number;
}

const CanvasSlice = ({ image, height, width }: Props) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasEl.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx && image.length > 0) {
      const size = Math.min(height, width);
      canvas.height = size;
      canvas.width = size;
      const pixelHeight = size / image.length;
      const pixelWidth = size / image[0].length;

      // Draw image pixels
      for (let i = 0; i < image.length; i++) {
        for (let j = 0; j < image[0].length; j++) {
          const color = image[i][j];
          ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
          ctx.fillRect(
            i * pixelWidth,
            j * pixelHeight,
            pixelWidth + 0.5,
            pixelHeight + 0.5
          );
        }
      }
    }
  }, [image, width, height, canvasEl]);

  return <canvas ref={canvasEl} className={"slice-canvas"} />;
};

export default React.memo(CanvasSlice);
