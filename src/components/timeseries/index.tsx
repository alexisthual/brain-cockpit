import { Colors } from "@blueprintjs/core";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { curveLinear } from "@visx/curve";
import { Group } from "@visx/group";
import { scaleLinear, scaleBand } from "@visx/scale";
import { LinePath } from "@visx/shape";
import React, { useEffect, useMemo, useState } from "react";

import "./style.scss";

interface Props {
  timeseries: number[];
  height: number;
  width: number;
}

const Timeseries = ({ timeseries, height, width }: Props) => {
  const margin = {
    top: 20,
    bottom: 20,
    left: 30,
    right: 30,
  };

  const xScale = useMemo(
    () =>
      scaleBand<number>({
        range: [0, width - margin.left - margin.right],
        domain: [...Array(timeseries.length).keys()],
      }),
    [timeseries, width]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height - margin.bottom - margin.top, 0],
        domain: [Math.min(...timeseries, 0), Math.max(...timeseries)],
      }),
    [timeseries, height]
  );

  return (
    <svg height={height} width={width}>
      <AxisLeft
        axisClassName="axis"
        scale={yScale}
        stroke={Colors.GRAY3}
        top={margin.top}
        left={margin.left}
        tickStroke={Colors.GRAY3}
        tickClassName="tick"
        tickLabelProps={() => ({
          textAnchor: "middle",
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
        <LinePath<number>
          curve={curveLinear}
          data={timeseries}
          x={(d: number, index: number) => xScale(index) || 0}
          y={(d: number) => yScale(d)}
          stroke={Colors.DARK_GRAY1}
        />
      </Group>
    </svg>
  );
};

export default Timeseries;
