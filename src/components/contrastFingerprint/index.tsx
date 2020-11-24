import React from "react";
import { AxisLeft, AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";

import { Colors } from "constants/colors";
import "./style.scss";

interface Props {
  labels: string[];
  values: number[];
  width: number;
  height: number;
  clickedLabelCallback?: (labelIndex: number, label: string) => void;
  orientation?: "vertical" | "horizontal" | undefined;
}

const ContrastFingerprint = ({
  labels,
  values,
  width,
  height,
  clickedLabelCallback,
  orientation = "vertical",
}: Props) => {
  const marginLeft = 150;
  const paddingTop = 30;
  const marginRight = 30;
  const xMax = width - marginLeft - marginRight;
  const yMax = height;

  const valueScale = scaleLinear<number>({
    range: [0, orientation === "vertical" ? xMax : yMax],
    round: true,
    domain: [-10, 10],
  });

  const labelScale = scaleBand<string>({
    range: [0, orientation === "vertical" ? yMax : xMax],
    round: true,
    domain: labels,
    padding: 0.2,
  });

  const axisColor = Colors.GRAY3;

  return (
    <svg width={width} height={height} className={"contrast-fingerprint"}>
      <Group width={width - marginRight}>
        {orientation === "vertical" ? (
          <AxisTop
            left={marginLeft}
            top={paddingTop}
            scale={valueScale}
            stroke={Colors.GRAY3}
            tickStroke={Colors.GRAY3}
            tickLabelProps={() => ({
              fill: Colors.GRAY3,
              fontSize: 11,
              textAnchor: "middle",
            })}
          />
        ) : (
          <AxisLeft
            left={marginLeft}
            top={paddingTop}
            scale={valueScale}
            stroke={axisColor}
            tickStroke={axisColor}
            tickLabelProps={() => ({
              fill: axisColor,
              fontSize: 11,
              textAnchor: "middle",
            })}
          />
        )}
        <Group left={marginLeft} top={paddingTop}>
          {values.map((value, index) => {
            const label = labels[index];
            let barHeight, barY, barWidth, barX;
            const delta = valueScale(value) - valueScale(0);
            switch (orientation) {
              case "vertical":
                barHeight = labelScale.bandwidth();
                barY = labelScale(label);
                barWidth = delta > 0 ? delta : -delta;
                barX = delta > 0 ? valueScale(0) : valueScale(value);
                break;
              case "horizontal":
                barWidth = labelScale.bandwidth();
                barX = labelScale(label);
                barHeight = delta > 0 ? delta : -delta;
                barY = delta > 0 ? valueScale(0) : valueScale(value);
                break;
            }

            return (
              <Bar
                key={`bar-${label}`}
                fill={delta >= 0 ? Colors.RED5 : Colors.BLUE5}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
              />
            );
          })}
        </Group>
        <Group top={paddingTop}>
          {labels.map((label, index) => {
            return (
              <Text
                className={"label"}
                key={`label-${label}`}
                onClick={() => {
                  if (clickedLabelCallback) {
                    clickedLabelCallback(index, label);
                  }
                }}
                textAnchor="end"
                verticalAnchor="middle"
                y={orientation === "vertical" ? labelScale(label) : height - 20}
                x={
                  orientation === "vertical"
                    ? marginLeft - 20
                    : labelScale(label)
                }
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

export default ContrastFingerprint;
