import React from "react";
import { AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";

import { Colors } from "colors";

interface Props {
  labels: string[];
  values: number[];
  width: number;
  height: number;
}

const HorizontalBar = ({ labels, values, width, height }: Props) => {
  const marginLeft = 150;
  const paddingTop = 30;
  const marginRight = 30;
  const xMax = width - marginLeft - marginRight;

  const xScale = scaleLinear<number>({
    range: [0, xMax],
    round: true,
    domain: [-10, 10],
  });

  const yScale = scaleBand<string>({
    range: [0, height],
    round: true,
    domain: labels,
    padding: 0.2,
  });

  const axisColor = Colors.GRAY3;

  return (
    <svg width={width} height={height}>
      <Group width={width - marginRight}>
        <AxisTop
          left={marginLeft}
          top={paddingTop}
          scale={xScale}
          stroke={axisColor}
          tickStroke={axisColor}
          tickLabelProps={() => ({
            fill: axisColor,
            fontSize: 11,
            textAnchor: "middle",
          })}
        />
        <Group left={marginLeft} top={paddingTop}>
          {values.map((value, index) => {
            const label = labels[index];
            const barHeight = yScale.bandwidth();
            const barY = yScale(label);
            const delta = xScale(value) - xScale(0);
            const barWidth = delta > 0 ? delta : -delta;
            const barX = delta > 0 ? xScale(0) : xScale(value);

            return (
              <Bar
                key={`bar-${label}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={Colors.GRAY4}
                onClick={() => {
                  alert(`clicked: ${label}`);
                }}
              />
            );
          })}
        </Group>
        <Group top={paddingTop}>
          {labels.map((label, index) => {
            return (
              <Text
                fill={Colors.DARK_GRAY3}
                fontSize={8}
                key={`label-${label}`}
                textAnchor="end"
                verticalAnchor="middle"
                y={yScale(label)}
                x={marginLeft - 20}
              >
                {label}
              </Text>
            );
          })}
        </Group>
      </Group>
    </svg>
  );
};

export default HorizontalBar;
