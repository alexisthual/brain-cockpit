import { Colors } from "@blueprintjs/core";
import React from "react";
import {
  AiOutlineClose,
  AiOutlineRotateLeft,
  AiOutlineRotateRight,
} from "react-icons/ai";
import { AxisLeft, AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";

import { Contrast, Orientation } from "constants/index";
import "./style.scss";

interface Props {
  contrastLabels: string[];
  taskLabels?: string[];
  taskCounts?: number[];
  fingerprint: number[];
  width: number;
  height: number;
  clickedLabelCallback?: (labelIndex: number) => void;
  closePanelCallback?: () => void;
  changeOrientationCallback?: () => void;
  orientation: Orientation;
  selectedContrast?: Contrast;
}

const ContrastFingerprint = ({
  contrastLabels,
  taskLabels = [],
  taskCounts = [],
  fingerprint,
  width,
  height,
  clickedLabelCallback,
  orientation = Orientation.VERTICAL,
  selectedContrast,
  changeOrientationCallback,
  closePanelCallback,
}: Props) => {
  let padding = 40;
  let labelMargin = 15;
  let offsetLeft = 0;
  let offsetTop = 0;
  let offsetRight = 0;
  let offsetBottom = 0;

  switch (orientation) {
    case Orientation.VERTICAL:
      offsetLeft = 120;
      offsetRight = 70;
      break;
    case Orientation.HORIZONTAL:
      offsetTop = 30;
      offsetBottom = 80;
      break;
  }

  const xMax = width - 2 * padding - offsetLeft - offsetRight - labelMargin;
  const yMax = height - 2 * padding - offsetBottom - offsetTop;

  const valueScale = scaleLinear<number>({
    domain: orientation === Orientation.VERTICAL ? [-10, 10] : [10, -10],
    range: [0, orientation === Orientation.VERTICAL ? xMax : yMax],
    round: true,
  });

  const labelScale = scaleBand<string>({
    domain: contrastLabels,
    range: [0, orientation === Orientation.VERTICAL ? yMax : xMax],
    round: true,
  });
  labelScale.paddingInner(0.4);
  labelScale.paddingOuter(0);

  // Compute culumated sum for tasks
  const taskCumulatedSum: number[] = [];
  taskCounts.reduce((acc: number, count: number) => {
    taskCumulatedSum.push(acc);
    return acc + count;
  }, 0);

  return (
    <>
      <div className="contrast-fingerprint-buttons">
        <div
          onClick={changeOrientationCallback}
          title="Change panel orientation"
        >
          {orientation === Orientation.VERTICAL ? (
            <AiOutlineRotateLeft />
          ) : (
            <AiOutlineRotateRight />
          )}
        </div>
        <div onClick={closePanelCallback} title="Close panel">
          <AiOutlineClose />
        </div>
      </div>
      <svg
        width={width}
        height={height}
        className={`contrast-fingerprint ${orientation}-orientation`}
      >
        <Group
          width={width - 2 * padding - offsetLeft}
          height={height - 2 * padding - offsetBottom - offsetTop}
          left={padding + offsetLeft}
          top={padding + offsetTop}
        >
          {orientation === Orientation.VERTICAL ? (
            <>
              {taskCounts.map((count: number, index: number) => {
                return (
                  <Group key={`task-info-${taskLabels[index]}`}>
                    <line
                      key={`task-line-${taskLabels[index]}`}
                      className="task-line"
                      x1={valueScale(10) + labelMargin / 2}
                      y1={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() * (taskCumulatedSum[index] + 0.2)
                      }
                      x2={valueScale(10) + labelMargin / 2}
                      y2={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() *
                          (taskCumulatedSum[index] + count - 0.4)
                      }
                    />
                    <Text
                      className={"task-label"}
                      key={`task-label-${taskLabels[index]}`}
                      textAnchor="start"
                      verticalAnchor="middle"
                      x={valueScale(10) + labelMargin}
                      y={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() *
                          (taskCumulatedSum[index] + count / 2)
                      }
                    >
                      {taskLabels[index]}
                    </Text>
                  </Group>
                );
              })}
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
            </>
          ) : (
            <>
              {taskCounts.map((count: number, index: number) => {
                return (
                  <Group key={`task-info-${taskLabels[index]}`}>
                    <line
                      key={`task-line-${taskLabels[index]}`}
                      className="task-line"
                      x1={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() * (taskCumulatedSum[index] + 0.2)
                      }
                      y1={-6}
                      x2={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() *
                          (taskCumulatedSum[index] + count - 0.4)
                      }
                      y2={-6}
                    />
                    <Text
                      angle={-25}
                      className={"task-label"}
                      key={`task-label-${taskLabels[index]}`}
                      textAnchor="start"
                      verticalAnchor="middle"
                      x={
                        (labelScale(contrastLabels[0]) ?? 0) +
                        labelScale.step() *
                          (taskCumulatedSum[index] + count / 2)
                      }
                      y={-15}
                    >
                      {taskLabels[index]}
                    </Text>
                  </Group>
                );
              })}
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
            </>
          )}
          <Group>
            {fingerprint.map((value, index) => {
              const label = contrastLabels[index];
              let barHeight: number | undefined,
                barY: number | undefined,
                barWidth: number | undefined,
                barX: number | undefined;
              const delta =
                orientation === Orientation.VERTICAL
                  ? valueScale(value) - valueScale(0)
                  : valueScale(0) - valueScale(value);
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
                  barY = delta > 0 ? valueScale(value) : valueScale(0);
                  break;
              }
              const backgroundBar = (parity: boolean) => {
                switch (orientation) {
                  case Orientation.VERTICAL:
                    return (
                      <Bar
                        className={`background-bar ${
                          parity ? "dark" : "light"
                        }`}
                        key={`background-bar-${label}`}
                        x={valueScale(-10)}
                        width={valueScale(10)}
                        y={
                          (barY ?? 0) -
                          (labelScale.step() * labelScale.padding()) / 2
                        }
                        height={labelScale.step()}
                      />
                    );
                  case Orientation.HORIZONTAL:
                    return (
                      <Bar
                        className={`background-bar ${
                          parity ? "dark" : "light"
                        }`}
                        key={`background-bar-${label}`}
                        x={
                          (barX ?? 0) -
                          (labelScale.step() * labelScale.padding()) / 2
                        }
                        width={labelScale.step()}
                        y={valueScale(10)}
                        height={valueScale(-10)}
                      />
                    );
                }
              };

              return (
                <Group
                  key={`contarst-bar-${label}`}
                  className={`contrast-bar ${
                    selectedContrast
                      ? index === selectedContrast.index
                        ? "active"
                        : ""
                      : ""
                  }`}
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
                    width={barWidth}
                    y={barY}
                    height={barHeight}
                  />
                  <Text
                    angle={orientation === Orientation.VERTICAL ? 0 : -45}
                    className={"label"}
                    key={`label-${label}`}
                    textAnchor="end"
                    verticalAnchor="middle"
                    x={
                      orientation === Orientation.VERTICAL
                        ? -labelMargin
                        : (labelScale(label) ?? 0) + labelScale.step() / 2
                    }
                    y={
                      orientation === Orientation.VERTICAL
                        ? (labelScale(label) ?? 0) + labelScale.step() / 2
                        : valueScale(-10) + labelMargin
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
    </>
  );
};

export default ContrastFingerprint;
