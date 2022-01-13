import { Colors } from "@blueprintjs/core";
import { AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleLinear } from "@visx/scale";
import { Text } from "@visx/text";
import chroma from "chroma-js";
import { useEffect, useMemo, useRef } from "react";

import "./style.scss";
import { colormaps } from "constants/index";

const defaultColorMap = colormaps["sequential"];

interface ColorbarProps {
  vmin?: number;
  vmax?: number;
  nUniqueValues?: number;
  maxHeight?: number;
  colormap?: chroma.Scale;
  unit?: string;
}

interface Props extends ColorbarProps {
  height: number;
  width: number;
}

const Colorbar = ({
  height,
  width,
  vmin = 0,
  vmax = 1,
  nUniqueValues,
  maxHeight = 300,
  colormap = defaultColorMap,
  unit,
}: Props) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const margin = {
    top: 20,
    bottom: 20,
    left: 50,
    right: 10,
  };

  const offset =
    maxHeight !== undefined ? Math.max(0, height - maxHeight) / 2 : 0;
  const realHeight =
    maxHeight !== undefined ? Math.min(maxHeight, height) : height;

  const scale = useMemo(
    () =>
      scaleLinear<number>({
        range: [realHeight - margin.top - margin.bottom, 0],
        domain: [nUniqueValues !== undefined ? 0 : vmin, nUniqueValues ?? vmax],
      }),
    [vmin, vmax, realHeight, margin.top, margin.bottom, nUniqueValues]
  );

  useEffect(() => {
    const canvas = canvasEl.current;
    const ctx = canvas?.getContext("2d");
    const h = realHeight - margin.top - margin.bottom;

    if (canvas && ctx) {
      // Discrete colorbar
      if (nUniqueValues !== undefined) {
        for (let c = 0; c < nUniqueValues; c++) {
          for (let i = 0; i <= h / nUniqueValues; i++) {
            ctx.beginPath();
            ctx.fillStyle = colormap(1 - c / nUniqueValues).css();
            ctx.fillRect(0, (c * h) / nUniqueValues + i, width, 1);
          }
        }
      }
      // Continuous colorbar
      else {
        for (let i = 0; i <= h; i++) {
          ctx.beginPath();
          ctx.fillStyle = colormap(1 - i / h).css();
          ctx.fillRect(0, i, width, 1);
        }
      }
    }
  }, [
    height,
    width,
    realHeight,
    margin.top,
    margin.bottom,
    colormap,
    nUniqueValues,
  ]);

  return (
    <>
      <svg height={height} width={(width * 3) / 4} className="colorbar-info">
        {unit !== undefined ? (
          <Group top={offset} left={margin.left}>
            <Text className="unit" textAnchor="middle" verticalAnchor="end">
              {unit}
            </Text>
          </Group>
        ) : null}
        <Group top={margin.top + offset} left={margin.left}>
          <AxisLeft
            axisClassName="axis"
            scale={scale}
            stroke={Colors.GRAY3}
            tickStroke={Colors.GRAY3}
            tickClassName="tick"
            tickLabelProps={() => ({
              textAnchor: "end",
              alignmentBaseline: "middle",
            })}
          />
        </Group>
      </svg>
      <canvas
        ref={canvasEl}
        className={"slice-crosshair-canvas"}
        width={width / 4 - margin.right}
        height={realHeight}
        style={{
          top: margin.top + offset,
          right: margin.right / 2,
        }}
      />
    </>
  );
};

const ColorbarWrapper = ({
  vmin,
  vmax,
  nUniqueValues,
  maxHeight,
  colormap,
  unit,
}: ColorbarProps) => {
  return (
    <div className="colorbar">
      <ParentSize>
        {({ width, height }) => (
          <Colorbar
            maxHeight={maxHeight}
            vmin={vmin}
            vmax={vmax}
            nUniqueValues={nUniqueValues}
            height={height}
            width={width}
            colormap={colormap}
            unit={unit}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default ColorbarWrapper;
