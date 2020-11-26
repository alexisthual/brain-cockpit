import React from "react";
import { AxisLeft, AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";

import { Colors } from "constants/colors";
import { Orientation } from "constants/index";
import "./style.scss";

interface Props {
  labels: string[];
  fingerprint: number[];
  width: number;
  height: number;
  clickedLabelCallback?: (labelIndex: number) => void;
  orientation: Orientation;
}

const ContrastFingerprint = ({
  labels,
  fingerprint,
  width,
  height,
  clickedLabelCallback,
  orientation = Orientation.VERTICAL,
}: Props) => {
  let padding = 30;
  let labelMargin = 15;
  let offsetLeft = 0;
  let offsetBottom = 0;

  switch (orientation) {
    case Orientation.VERTICAL:
      offsetLeft = 120;
      break;
    case Orientation.HORIZONTAL:
      offsetBottom = 100;
      break;
  }

  const xMax = width - 2 * padding - offsetLeft - labelMargin;
  const yMax = height - 2 * padding - offsetBottom;

  const valueScale = scaleLinear<number>({
    range: [0, orientation === Orientation.VERTICAL ? xMax : yMax],
    round: true,
    domain: [-10, 10],
  });

  const labelScale = scaleBand<string>({
    range: [0, orientation === Orientation.VERTICAL ? yMax : xMax],
    round: true,
    domain: labels,
  });

  labelScale.paddingInner(0.5);
  labelScale.paddingOuter(0.5);

  return (
    <svg
      width={width}
      height={height}
      className={`contrast-fingerprint ${orientation}-orientation`}
    >
      <Group
        width={width - 2 * padding - offsetLeft}
        height={height - 2 * padding - offsetBottom}
        left={padding + offsetLeft}
        top={padding}
      >
        {orientation === Orientation.VERTICAL ? (
          <AxisTop
            axisClassName="axis"
            scale={valueScale}
            stroke={Colors.GRAY3}
            tickStroke={Colors.GRAY3}
            tickClassName="tick"
            tickLabelProps={() => ({
              textAnchor: "middle",
            })}
          />
        ) : (
          <AxisLeft
            axisClassName="axis"
            scale={valueScale}
            stroke={Colors.GRAY3}
            tickStroke={Colors.GRAY3}
            tickClassName="tick"
            tickLabelProps={() => ({
              textAnchor: "middle",
            })}
          />
        )}
        <Group>
          {fingerprint.map((value, index) => {
            const label = labels[index];
            let barHeight: number | undefined,
              barY: number | undefined,
              barWidth: number | undefined,
              barX: number | undefined;
            const delta = valueScale(value) - valueScale(0);
            switch (orientation) {
              case Orientation.VERTICAL:
                barHeight = labelScale.bandwidth();
                barY = labelScale(label);
                barWidth = delta > 0 ? delta : -delta;
                barX = delta > 0 ? valueScale(0) : valueScale(value);
                break;
              case Orientation.HORIZONTAL:
                barWidth = labelScale.bandwidth();
                barX = labelScale(label);
                barHeight = delta > 0 ? delta : -delta;
                barY = delta > 0 ? valueScale(0) : valueScale(value);
                break;
            }
            const backgroundBar = (parity: boolean) => {
              switch (orientation) {
                case Orientation.VERTICAL:
                  return (
                    <Bar
                      className={`background-bar ${parity ? "dark" : "light"}`}
                      key={`background-bar-${label}`}
                      x={valueScale(-10)}
                      y={
                        (barY ?? 0) -
                        (labelScale.step() * labelScale.padding()) / 2
                      }
                      width={valueScale(10)}
                      height={labelScale.step()}
                    />
                  );
                case Orientation.HORIZONTAL:
                  return (
                    <Bar
                      className={`background-bar ${parity ? "dark" : "light"}`}
                      key={`background-bar-${label}`}
                      x={
                        (barX ?? 0) -
                        (labelScale.step() * labelScale.padding()) / 2
                      }
                      y={valueScale(-10)}
                      width={labelScale.step()}
                      height={valueScale(10)}
                    />
                  );
              }
            };

            return (
              <Group
                key={`contarst-bar-${label}`}
                className="contrast-bar"
                onClick={() => {
                  if (clickedLabelCallback) {
                    clickedLabelCallback(index);
                  }
                }}
              >
                {backgroundBar(index % 2 === 0)}
                <Bar
                  className="value-bar"
                  key={`bar-${label}`}
                  fill={delta >= 0 ? Colors.RED5 : Colors.BLUE5}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                />
                <Text
                  angle={orientation === Orientation.VERTICAL ? 0 : -45}
                  className={"label"}
                  key={`label-${label}`}
                  textAnchor="end"
                  verticalAnchor="middle"
                  y={
                    orientation === Orientation.VERTICAL
                      ? (labelScale(label) ?? 0) + labelScale.step() / 2
                      : valueScale(10) + labelMargin
                  }
                  x={
                    orientation === Orientation.VERTICAL
                      ? -labelMargin
                      : (labelScale(label) ?? 0) + labelScale.step() / 2
                  }
                >
                  {label}
                </Text>
              </Group>
            );
          })}
        </Group>
      </Group>
    </svg>
  );
};

export default ContrastFingerprint;
