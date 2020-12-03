import { Colors } from "@blueprintjs/core";
import React from "react";
import { AxisBottom, AxisLeft, AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

import OverlayLoader from "components/overlayLoader";
import "./style.scss";

interface Props {
  loading?: boolean;
  distances?: number[];
  m?: number;
  width: number;
  height: number;
}

const DistanceBars = ({ loading, distances, m, width, height }: Props) => {
  let padding = 10;
  let labelMargin = 0;
  let offsetLeft = 20;
  let offsetTop = 0;
  let offsetRight = 0;
  let offsetBottom = 20;

  const xMax = width - 2 * padding - offsetLeft - offsetRight - labelMargin;
  const yMax = height - 2 * padding - offsetBottom - offsetTop;

  const xScale = scaleBand<number>({
    domain: distances ? [...Array(distances.length).keys()] : [],
    range: [0, xMax],
    round: true,
  });
  xScale.paddingInner(0.4);
  xScale.paddingOuter(0);

  const yScale = scaleLinear<number>({
    domain: [distances ? Math.max(...distances) : 0, 0],
    range: [0, yMax],
    round: true,
  });

  return (
    <>
      {loading ? <OverlayLoader /> : null}
      <svg width={width} height={height} className="functional-distance-bars">
        {distances ? (
          <Group
            width={width - 2 * padding - offsetLeft}
            height={height - 2 * padding - offsetBottom - offsetTop}
            left={padding + offsetLeft}
            top={padding + offsetTop}
          >
            <AxisLeft
              axisClassName="axis"
              scale={yScale}
              stroke={Colors.GRAY3}
              tickStroke={Colors.GRAY3}
              tickClassName="tick"
              tickLabelProps={() => ({
                textAnchor: "end",
                alignmentBaseline: "middle",
                dominantBaseline: "middle",
              })}
              tickLength={4}
            />
            <AxisBottom
              axisClassName="axis"
              numTicks={distances ? distances.length / 10 : 1}
              scale={xScale}
              stroke={Colors.GRAY3}
              tickStroke={Colors.GRAY3}
              tickClassName="tick"
              tickLabelProps={() => ({
                textAnchor: "middle",
              })}
              tickLength={4}
              top={height - padding - offsetBottom}
            />
            <Group>
              {distances.map((distance: number, index: number) => {
                return (
                  <Bar
                    className="distance-bar"
                    key={`distance-bar-${index}`}
                    fill={Colors.GRAY4}
                    x={xScale(index)}
                    width={xScale.bandwidth()}
                    y={yScale(distance)}
                    height={yScale(yScale.domain()[1]) - yScale(distance)}
                  />
                );
              })}
            </Group>
          </Group>
        ) : null}
      </svg>
    </>
  );
};

export default DistanceBars;
