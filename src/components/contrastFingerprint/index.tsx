import { Colors, MultiSlider } from "@blueprintjs/core";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import _ from "lodash";
import React, { useState } from "react";

import {
  Contrast,
  ContrastLabel,
  contrastLabelToId,
  Orientation,
} from "constants/index";
import OverlayLoader from "components/overlayLoader";
import "./style.scss";

interface Props {
  loading?: boolean;
  contrastLabels: ContrastLabel[];
  fingerprint: number[];
  width: number;
  height: number;
  clickedLabelCallback?: (labelIndex: number) => void;
  orientation: Orientation;
  selectedContrast?: Contrast;
  lowHandleMinRelease?: (newValue: number) => void;
  lowHandleMaxRelease?: (newValue: number) => void;
  highHandleMinRelease?: (newValue: number) => void;
  highHandleMaxRelease?: (newValue: number) => void;
}

const ContrastFingerprint = ({
  loading,
  contrastLabels,
  fingerprint,
  width,
  height,
  clickedLabelCallback,
  orientation = Orientation.VERTICAL,
  selectedContrast,
  lowHandleMinRelease,
  lowHandleMaxRelease,
  highHandleMinRelease,
  highHandleMaxRelease,
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

  // Util function to convert ContrastLabel to id
  // by concatenating its attributes into a single string
  const labelScale = scaleBand<string>({
    domain: contrastLabels.map(contrastLabelToId),
    range: [0, orientation === Orientation.VERTICAL ? yMax : xMax],
    round: true,
  });
  labelScale.paddingInner(0.4);
  labelScale.paddingOuter(0);

  // Compute task counts
  const taskCounts = _.map(
    _.values(_.groupBy(contrastLabels, "task")),
    (contrasts: ContrastLabel[]) => contrasts.length
  );
  const taskLabels = _.keys(_.groupBy(contrastLabels, "task"));

  // Compute culumated sum for tasks
  const taskCumulatedSum: number[] = [];
  taskCounts.reduce((acc: number, count: number) => {
    taskCumulatedSum.push(acc);
    return acc + count;
  }, 0);

  const [lowHandleMin, setLowHandleMin] = useState(-10);
  const [lowHandleMax, setLowHandleMax] = useState(-3);
  const [highHandleMin, setHighHandleMin] = useState(3);
  const [highHandleMax, setHighHandleMax] = useState(10);

  return (
    <div className={`contrast-fingerprint ${orientation}-orientation`}>
      {loading ? <OverlayLoader /> : null}
      <MultiSlider
        className="contrast-fingerprint-slider"
        labelStepSize={2}
        max={10}
        min={-10}
        showTrackFill={true}
        stepSize={1}
        vertical={orientation === Orientation.HORIZONTAL}
        onChange={(newValues: number[]) => {
          if (newValues[0] !== lowHandleMin) {
            setLowHandleMin(newValues[0]);
          }
          if (newValues[1] !== lowHandleMax) {
            setLowHandleMax(newValues[1]);
          }
          if (newValues[2] !== highHandleMin) {
            setHighHandleMin(newValues[2]);
          }
          if (newValues[3] !== highHandleMax) {
            setHighHandleMax(newValues[3]);
          }
        }}
        onRelease={(newValues: number[]) => {
          if (lowHandleMinRelease !== undefined) {
            lowHandleMinRelease(newValues[0]);
          }
          if (lowHandleMaxRelease !== undefined) {
            lowHandleMaxRelease(newValues[1]);
          }
          if (highHandleMinRelease !== undefined) {
            highHandleMinRelease(newValues[2]);
          }
          if (highHandleMaxRelease !== undefined) {
            highHandleMaxRelease(newValues[3]);
          }
        }}
      >
        {lowHandleMinRelease !== undefined ? (
          <MultiSlider.Handle
            intentBefore={undefined}
            type="start"
            value={lowHandleMin}
          />
        ) : null}
        {highHandleMinRelease !== undefined ? (
          <MultiSlider.Handle
            intentBefore={"primary"}
            type="end"
            value={lowHandleMax}
          />
        ) : null}
        {highHandleMinRelease !== undefined ? (
          <MultiSlider.Handle
            intentBefore={undefined}
            type="start"
            value={highHandleMin}
          />
        ) : null}
        {highHandleMinRelease !== undefined ? (
          <MultiSlider.Handle
            intentBefore={"primary"}
            intentAfter={undefined}
            type="end"
            value={highHandleMax}
          />
        ) : null}
      </MultiSlider>
      <svg
        width={width}
        height={height}
        className={`${orientation}-orientation`}
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
                  <Group key={`task-info-${taskLabels[index]}-${index}`}>
                    <line
                      key={`task-line-${taskLabels[index]}`}
                      className="task-line"
                      x1={valueScale(10) + labelMargin / 2}
                      y1={
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
                        labelScale.step() * (taskCumulatedSum[index] + 0.2)
                      }
                      x2={valueScale(10) + labelMargin / 2}
                      y2={
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
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
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
                        labelScale.step() *
                          (taskCumulatedSum[index] + count / 2)
                      }
                    >
                      {taskLabels[index]}
                    </Text>
                  </Group>
                );
              })}
            </>
          ) : (
            <>
              {taskCounts.map((count: number, index: number) => {
                return (
                  <Group key={`task-info-${taskLabels[index]}-${index}`}>
                    <line
                      key={`task-line-${taskLabels[index]}`}
                      className="task-line"
                      x1={
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
                        labelScale.step() * (taskCumulatedSum[index] + 0.2)
                      }
                      y1={-6}
                      x2={
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
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
                        (labelScale(contrastLabelToId(contrastLabels[0])) ??
                          0) +
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
                  barY = labelScale(contrastLabelToId(label));
                  barWidth = delta > 0 ? delta : -delta;
                  barX = delta > 0 ? valueScale(0) : valueScale(value);
                  break;
                case Orientation.HORIZONTAL:
                  barWidth = labelScale.bandwidth();
                  barX = labelScale(contrastLabelToId(label));
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
                        key={`background-bar-${label}-${index}`}
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
                        key={`background-bar-${label}-${index}`}
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
                  key={`contrast-bar-${label}-${index}`}
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
                        : (labelScale(contrastLabelToId(label)) ?? 0) +
                          labelScale.step() / 2
                    }
                    y={
                      orientation === Orientation.VERTICAL
                        ? (labelScale(contrastLabelToId(label)) ?? 0) +
                          labelScale.step() / 2
                        : valueScale(-10) + labelMargin
                    }
                  >
                    {label.contrast}
                  </Text>
                </Group>
              );
            })}
          </Group>
        </Group>
      </svg>
    </div>
  );
};

export default ContrastFingerprint;
