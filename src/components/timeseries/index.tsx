import { Colors } from "@blueprintjs/core";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { curveLinear } from "@visx/curve";
import { Group } from "@visx/group";
import { scaleLinear, scaleBand } from "@visx/scale";
import { Bar, LinePath } from "@visx/shape";
import React, { useMemo } from "react";

import "./style.scss";

interface Props {
  timeseries: number[];
  height: number;
  width: number;
  clickCallback?: (t: number) => void;
  selectedT?: number;
  range?: number[];
}

const Timeseries = ({
  timeseries,
  selectedT,
  clickCallback = () => {},
  height,
  width,
  range,
}: Props) => {
  const margin = {
    top: 30,
    bottom: 40,
    left: 60,
    right: 40,
  };

  const xScale = useMemo(
    () =>
      scaleBand<number>({
        range: [0, width - margin.left - margin.right],
        domain: [...Array(timeseries.length).keys()],
      }),
    [timeseries, width, margin.left, margin.right]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height - margin.bottom - margin.top, 0],
        domain:
          range !== undefined
            ? range
            : [Math.min(...timeseries, 0), Math.max(...timeseries)],
      }),
    [timeseries, height, margin.bottom, margin.top]
  );

  return (
    <svg className="timeseries" height={height} width={width}>
      <AxisLeft
        axisClassName="axis"
        scale={yScale}
        stroke={Colors.GRAY3}
        top={margin.top}
        left={margin.left}
        tickStroke={Colors.GRAY3}
        tickClassName="tick"
        tickLabelProps={() => ({
          textAnchor: "end",
        })}
      />
      <AxisBottom
        axisClassName="axis"
        scale={xScale}
        stroke={Colors.GRAY3}
        left={margin.left}
        top={height - margin.bottom}
        tickStroke={Colors.GRAY3}
        tickClassName="tick"
        tickLabelProps={() => ({
          textAnchor: "middle",
        })}
      />
      <Group left={margin.left} top={margin.top}>
        {[...Array(timeseries.length).keys()].map((index: number) => (
          <Bar
            className={`timeseries-bar ${
              selectedT !== undefined && index === selectedT ? "active" : null
            }`}
            key={`bar-${timeseries.length}-${index}`}
            x={xScale(index)}
            y={0}
            width={xScale.step()}
            height={height - margin.top - margin.bottom}
            fill={Colors.BLUE1}
            onClick={() => {
              clickCallback(index);
            }}
          />
        ))}
        <LinePath<number>
          curve={curveLinear}
          data={timeseries}
          stroke={Colors.DARK_GRAY3}
          x={(d: number, index: number) =>
            (xScale(index) || 0) + xScale.step() / 2
          }
          y={(d: number) => yScale(d)}
        />
      </Group>
    </svg>
  );
};

export default React.memo(Timeseries);
