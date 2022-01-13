import { Colors, Slider } from "@blueprintjs/core";
import { useState } from "react";
import { AxisBottom } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

import OverlayLoader from "components/overlayLoader";
import "./style.scss";

interface Props {
  loading?: boolean;
  distances?: number[];
  m?: number;
  mChangeCallback: (m: number) => void;
  width: number;
  height: number;
  sliderEnabled?: boolean;
}

const DistanceBars = ({
  loading,
  distances,
  m,
  mChangeCallback = () => {},
  width,
  height,
  sliderEnabled = false,
}: Props) => {
  let padding = 10;
  let labelMargin = 0;
  let offsetLeft = 30;
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
    domain: [distances ? Math.max(Math.max(...distances), 1) : 0, 0],
    range: [0, yMax],
    round: true,
  });
  const yDomain = yScale.domain();

  const [sliderValue, setSliderValue] = useState(m);

  return (
    <>
      {loading ? <OverlayLoader /> : null}
      <Slider
        className="functional-slider"
        disabled={
          !sliderEnabled || distances === undefined || distances.length === 0
        }
        labelStepSize={0.2}
        max={yDomain[0]}
        min={yDomain[1]}
        onChange={(newSliderValue: number) => setSliderValue(newSliderValue)}
        onRelease={(newM: number) => mChangeCallback(newM)}
        stepSize={0.1}
        value={sliderValue ?? (yDomain[0] - yDomain[1]) / 2}
        vertical={true}
      />
      <svg width={width} height={height} className="functional-distance-bars">
        {distances ? (
          <Group
            width={width - 2 * padding - offsetLeft}
            height={height - 2 * padding - offsetBottom - offsetTop}
            left={padding + offsetLeft}
            top={padding + offsetTop}
          >
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
                const height = yScale(yDomain[1]) - yScale(distance);
                return (
                  <Bar
                    className="distance-bar"
                    key={`distance-bar-${index}`}
                    fill={
                      sliderValue && distance <= sliderValue
                        ? Colors.GRAY2
                        : Colors.GRAY4
                    }
                    x={xScale(index)}
                    width={xScale.bandwidth()}
                    y={yScale(distance)}
                    height={height}
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
