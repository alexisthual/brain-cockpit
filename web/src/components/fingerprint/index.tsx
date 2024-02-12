import { Colors, MultiSlider } from "@blueprintjs/core";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Text } from "@visx/text";
import _ from "lodash";
import { useState } from "react";

import {
  Contrast,
  ContrastLabel,
  contrastLabelToId,
  Orientation,
} from "constants/index";
import "./style.scss";

export enum FingerprintFilter {
  ALL = "all",
  CONTRASTS = "contrasts",
  CONDITIONS = "conditions",
}

interface Props {
  contrastLabels: ContrastLabel[];
  filter?: FingerprintFilter;
  selectedTasks?: string[];
  fingerprints: number[][];
  width: number;
  height: number;
  clickedLabelCallback?: (labelIndex: number) => void;
  orientation: Orientation;
  selectedContrast?: Contrast;
  thresholdLow?: number;
  thresholdHigh?: number;
  thresholdLowHandleRelease?: (newValue: number) => void;
  thresholdHighHandleRelease?: (newValue: number) => void;
}

const Fingerprint = ({
  contrastLabels,
  filter = FingerprintFilter.ALL,
  selectedTasks,
  fingerprints,
  width,
  height,
  clickedLabelCallback,
  orientation = Orientation.VERTICAL,
  selectedContrast,
  thresholdLow = 0,
  thresholdHigh = 0,
  thresholdLowHandleRelease,
  thresholdHighHandleRelease,
}: Props) => {
  let labelMargin = 8;
  let offsetLeft = 0;
  let offsetTop = 0;
  let offsetRight = 0;
  let offsetBottom = 0;
  let nSteps = 10;

  const maxFingerprints = _.max(
    fingerprints.map((fingerprint) => _.max(fingerprint))
  );
  const minFingerprints = _.min(
    fingerprints.map((fingerprint) => _.min(fingerprint))
  );
  const maxAbsFingerprints = Math.max(
    Math.abs(maxFingerprints ?? 0),
    Math.abs(minFingerprints ?? 1)
  );

  switch (orientation) {
    case Orientation.VERTICAL:
      offsetLeft = 150;
      offsetTop = 30; // account for MultiSlider
      offsetRight = 100;
      offsetBottom = 10;
      break;
    case Orientation.HORIZONTAL:
      offsetLeft = 60; // account for MultiSlider
      offsetTop = 60;
      offsetRight = 20;
      offsetBottom = 120;
      break;
  }

  //
  // Filter out parts of the fingerprint
  //

  let filteredContrastLabels = contrastLabels;
  let filteredFingerprints = fingerprints;

  // Keep only conditions/contrasts whose task is selected
  if (selectedTasks !== undefined) {
    filteredContrastLabels = filteredContrastLabels.filter(
      (label) => selectedTasks.indexOf(label.task) !== -1
    );
    filteredFingerprints = filteredFingerprints.map((fingerprint) => {
      return fingerprint.filter(
        (_, index) => selectedTasks.indexOf(contrastLabels[index]?.task) !== -1
      );
    });
  }

  // Keep only contrasts, conditions, or both
  switch (filter) {
    case FingerprintFilter.CONTRASTS:
      filteredFingerprints = filteredFingerprints.map((fingerprint) => {
        return fingerprint.filter(
          (_, index) =>
            filteredContrastLabels[index]?.contrast.split("-").length > 1
        );
      });
      filteredContrastLabels = filteredContrastLabels.filter(
        (label) => label.contrast.split("-").length > 1
      );
      break;
    case FingerprintFilter.CONDITIONS:
      filteredFingerprints = filteredFingerprints.map((fingerprint) => {
        return fingerprint.filter(
          (_, index) =>
            filteredContrastLabels[index]?.contrast.split("-").length === 1
        );
      });
      filteredContrastLabels = filteredContrastLabels.filter(
        (label) => label.contrast.split("-").length === 1
      );
      break;
    default:
      break;
  }

  // Determine size of group of bars
  let yMax, xMax;

  if (orientation === Orientation.VERTICAL) {
    xMax = width - offsetLeft - offsetRight;
    yMax = Math.max(
      filteredContrastLabels.length * 12,
      height - offsetBottom - offsetTop
    );
  } else {
    xMax = Math.max(
      filteredContrastLabels.length * 12,
      width - offsetLeft - offsetRight
    );
    yMax = height - offsetBottom - offsetTop;
  }

  const valueScale = scaleLinear<number>({
    domain:
      orientation === Orientation.VERTICAL
        ? [-maxAbsFingerprints, maxAbsFingerprints]
        : [maxAbsFingerprints, -maxAbsFingerprints],
    range: [0, orientation === Orientation.VERTICAL ? xMax : yMax],
    round: true,
  });

  // Util function to convert ContrastLabel to id
  // by concatenating its attributes into a single string
  const labelScale = scaleBand<string>({
    domain: filteredContrastLabels.map(contrastLabelToId),
    range: [0, orientation === Orientation.VERTICAL ? yMax : xMax],
    round: true,
  });
  labelScale.paddingInner(0.4);
  labelScale.paddingOuter(0);

  // Compute task counts
  const taskCounts = _.map(
    _.values(_.groupBy(filteredContrastLabels, "task")),
    (contrasts: ContrastLabel[]) => contrasts.length
  );
  const taskLabels = _.keys(_.groupBy(filteredContrastLabels, "task"));

  // Compute cumulated sum for tasks
  const taskCumulatedSum: number[] = [];
  taskCounts.reduce((acc: number, count: number) => {
    taskCumulatedSum.push(acc);
    return acc + count;
  }, 0);

  const [lowHandleMax, setLowHandleMax] = useState(thresholdLow);
  const [highHandleMin, setHighHandleMin] = useState(thresholdHigh);

  return (
    <div className={`fingerprint ${orientation}-orientation`}>
      <div>
        <div
          className="fingerprint-slider"
          style={{
            height:
              orientation === Orientation.HORIZONTAL
                ? height - offsetBottom - offsetTop
                : "auto",
            minWidth: orientation === Orientation.HORIZONTAL ? "60px" : "auto",
            top: orientation === Orientation.HORIZONTAL ? offsetTop : "10px",
            left: orientation === Orientation.HORIZONTAL ? "10px" : offsetLeft,
            width:
              orientation === Orientation.VERTICAL
                ? width - offsetLeft - offsetRight
                : "auto",
            minHeight: orientation === Orientation.VERTICAL ? "60px" : "auto",
          }}
        >
          <MultiSlider
            className="fingerprint-multislider"
            labelStepSize={(2 * maxAbsFingerprints) / nSteps}
            labelPrecision={1}
            max={maxAbsFingerprints}
            min={-maxAbsFingerprints}
            showTrackFill={true}
            stepSize={maxAbsFingerprints / nSteps}
            vertical={orientation === Orientation.HORIZONTAL}
            onChange={(newValues: number[]) => {
              if (newValues[0] !== lowHandleMax) {
                setLowHandleMax(newValues[0]);
              }
              if (newValues[1] !== highHandleMin) {
                setHighHandleMin(newValues[1]);
              }
            }}
            onRelease={(newValues: number[]) => {
              if (thresholdLowHandleRelease !== undefined) {
                thresholdLowHandleRelease(newValues[0]);
              }
              if (thresholdHighHandleRelease !== undefined) {
                thresholdHighHandleRelease(newValues[1]);
              }
            }}
          >
            {thresholdLowHandleRelease !== undefined ? (
              <MultiSlider.Handle
                intentBefore={"primary"}
                type="end"
                value={lowHandleMax}
              />
            ) : null}
            {thresholdHighHandleRelease !== undefined ? (
              <MultiSlider.Handle
                intentAfter={"primary"}
                type="start"
                value={highHandleMin}
              />
            ) : null}
          </MultiSlider>
        </div>
      </div>
      <div className="fingerprint-main">
        <svg
          width={xMax + offsetLeft + offsetRight}
          height={yMax + offsetBottom + offsetTop}
          className={`${orientation}-orientation`}
        >
          <Group left={offsetLeft} top={offsetTop}>
            {orientation === Orientation.VERTICAL ? (
              <>
                {taskCounts.map((count: number, index: number) => {
                  return (
                    <Group key={`task-info-${taskLabels[index]}-${index}`}>
                      <line
                        key={`task-line-${taskLabels[index]}`}
                        className="task-line"
                        x1={valueScale(maxAbsFingerprints) + labelMargin / 2}
                        y1={
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
                          labelScale.step() * (taskCumulatedSum[index] + 0.2)
                        }
                        x2={valueScale(maxAbsFingerprints) + labelMargin / 2}
                        y2={
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
                          labelScale.step() *
                            (taskCumulatedSum[index] + count - 0.4)
                        }
                      />
                      <Text
                        className={"task-label"}
                        key={`task-label-${taskLabels[index]}`}
                        textAnchor="start"
                        verticalAnchor="middle"
                        x={valueScale(maxAbsFingerprints) + labelMargin}
                        y={
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
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
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
                          labelScale.step() * (taskCumulatedSum[index] + 0.2)
                        }
                        y1={-6}
                        x2={
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
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
                          (labelScale(
                            contrastLabelToId(filteredContrastLabels[0])
                          ) ?? 0) +
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
            {filteredContrastLabels.map(
              (label: ContrastLabel, contrastIndex: number) => {
                let backBarHeight: number | undefined,
                  backBarY: number | undefined,
                  backBarWidth: number | undefined,
                  backBarX: number | undefined;

                switch (orientation) {
                  case Orientation.VERTICAL:
                    backBarX = valueScale(-maxAbsFingerprints);
                    backBarWidth = valueScale(maxAbsFingerprints);
                    backBarY =
                      (labelScale(contrastLabelToId(label)) ?? 0) -
                      (labelScale.step() * labelScale.padding()) / 2;
                    backBarHeight = labelScale.step();
                    break;
                  case Orientation.HORIZONTAL:
                    backBarX =
                      (labelScale(contrastLabelToId(label)) ?? 0) -
                      (labelScale.step() * labelScale.padding()) / 2;
                    backBarWidth = labelScale.step();
                    backBarY = valueScale(maxAbsFingerprints);
                    backBarHeight = valueScale(-maxAbsFingerprints);
                    break;
                }

                return (
                  <Group
                    key={`fingerprint-bar-${label.task}-${label.contrast}-${contrastIndex}`}
                    className={`fingerprint-bar ${
                      selectedContrast
                        ? contrastIndex === selectedContrast.index
                          ? "active"
                          : ""
                        : ""
                    }`}
                    onClick={() => {
                      if (clickedLabelCallback) {
                        clickedLabelCallback(contrastIndex);
                      }
                    }}
                  >
                    <Bar
                      className={`background-bar ${
                        contrastIndex % 2 === 0 ? "dark" : "light"
                      }`}
                      key={`background-bar-${label.task}-${label.contrast}-${contrastIndex}`}
                      x={backBarX}
                      width={
                        !isNaN(backBarWidth) && backBarWidth >= 0
                          ? backBarWidth
                          : 0
                      }
                      y={backBarY}
                      height={
                        !isNaN(backBarHeight) && backBarHeight >= 0
                          ? backBarHeight
                          : 0
                      }
                    />
                    {filteredFingerprints.map(
                      (fingerprint: number[], i: number) => {
                        const value = fingerprint[contrastIndex];
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
                            barHeight =
                              labelScale.bandwidth() / fingerprints.length;
                            barHeight -= fingerprints.length > 1 ? 1 : 0;
                            barY =
                              (labelScale(contrastLabelToId(label)) ?? 0) +
                              (i * labelScale.bandwidth()) /
                                fingerprints.length;
                            barWidth = delta > 0 ? delta : -delta;
                            barX =
                              delta > 0 ? valueScale(0) : valueScale(value);

                            break;
                          case Orientation.HORIZONTAL:
                            barWidth =
                              labelScale.bandwidth() / fingerprints.length;
                            barWidth -= fingerprints.length > 1 ? 1 : 0;
                            barX =
                              (labelScale(contrastLabelToId(label)) ?? 0) +
                              (i * labelScale.bandwidth()) /
                                fingerprints.length;
                            barHeight = delta > 0 ? delta : -delta;
                            barY =
                              delta > 0 ? valueScale(value) : valueScale(0);

                            break;
                        }

                        return (
                          <Bar
                            className="value-bar"
                            key={`bar-${label.task}-${label.contrast}-${contrastIndex}-${i}`}
                            fill={delta >= 0 ? Colors.RED5 : Colors.BLUE5}
                            x={barX}
                            width={
                              !isNaN(barWidth) && barWidth >= 0 ? barWidth : 0
                            }
                            y={barY}
                            height={
                              !isNaN(barHeight) && barHeight >= 0
                                ? barHeight
                                : 0
                            }
                          />
                        );
                      }
                    )}
                    <Text
                      angle={orientation === Orientation.VERTICAL ? 0 : -45}
                      className={"label"}
                      key={`label-${label.task}-${label.contrast}-${contrastIndex}`}
                      textAnchor="end"
                      verticalAnchor={
                        orientation === Orientation.VERTICAL ? "end" : "middle"
                      }
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
                          : valueScale(-maxAbsFingerprints) + labelMargin
                      }
                    >
                      {label.contrast}
                    </Text>
                  </Group>
                );
              }
            )}
          </Group>
        </svg>
      </div>
    </div>
  );
};

export default Fingerprint;
