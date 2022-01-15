import { Drag } from "@vx/drag";
import { useRef } from "react";

import "./style.scss";

export interface IHotspot {
  id?: string;
  voxelIndex?: number;
  xPointer?: number;
  yPointer?: number;
  header?: string;
  description?: string;
  side?: "left" | "right";
  closeCallback?: () => void;
}

interface HotspotProps extends IHotspot {
  xLabel?: number;
  yLabel?: number;
  width: number;
  height: number;
}

const labelWidth = 120;
const labelHeight = 40;
const padding = 7;
const lineHeight = 12;
const labelMargin = 5;

const Hotspot = ({
  xLabel = 200,
  yLabel = 200,
  xPointer,
  yPointer,
  header,
  description,
  width,
  height,
  closeCallback,
}: HotspotProps) => {
  const lineRef = useRef<SVGLineElement>(null);

  return (
    <>
      <line
        className="hotspot-line"
        ref={lineRef}
        x1={xPointer || 0}
        y1={yPointer || 0}
        x2={xLabel + labelWidth / 2}
        y2={yLabel + labelHeight / 2}
      />
      <circle
        className="hotspot-pointer"
        cx={xPointer || 0}
        cy={yPointer || 0}
        r={4}
      />
      <g className="hotspot-label">
        <Drag
          height={height}
          width={width}
          onDragMove={(args) => {
            const line = lineRef.current;
            if (line !== null) {
              if (args.x !== undefined) {
                line.x2.baseVal.value = args.x + args.dx;
              }
              if (args.y !== undefined) {
                line.y2.baseVal.value = args.y + args.dy;
              }
            }
          }}
        >
          {({ dragStart, dragEnd, dragMove, isDragging, dx, dy }) =>
            (false && isDragging) || (
              <>
                <rect
                  className={"hotspot-back"}
                  x={xLabel}
                  y={yLabel}
                  width={labelWidth}
                  height={labelHeight}
                  rx={3}
                  transform={`translate(${dx}, ${dy})`}
                  onMouseMove={dragMove}
                  onMouseUp={dragEnd}
                  onMouseDown={dragStart}
                  onTouchStart={dragStart}
                  onTouchMove={dragMove}
                  onTouchEnd={dragEnd}
                ></rect>
                {closeCallback !== undefined ? (
                  <g
                    className={"hotspot-cross"}
                    transform={`translate(${
                      xLabel + labelWidth - 16 - 1 + dx
                    }, ${yLabel + 1 + dy})`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      onClick={closeCallback}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={16}
                        height={16}
                        fill={"transparent"}
                      />
                      <path
                        d="M9.41 8l2.29-2.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-2.29-2.3a1.003 1.003 0 00-1.42 1.42L6.59 8 4.3 10.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l2.29 2.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  </g>
                ) : null}
                <text
                  className="hotspot-header"
                  x={xLabel + padding}
                  y={yLabel + padding + lineHeight}
                  transform={`translate(${dx}, ${dy})`}
                  width={labelWidth - 2 * padding}
                >
                  {header}
                </text>
                <text
                  className="hotspot-description"
                  x={xLabel + padding}
                  y={yLabel + padding + 2 * lineHeight}
                  transform={`translate(${dx}, ${dy})`}
                  width={labelWidth - 2 * padding}
                >
                  {description}
                </text>
              </>
            )
          }
        </Drag>
      </g>
    </>
  );
};

interface Props {
  hotspots: IHotspot[];
  width: number;
  height: number;
}

export const Hotspots = ({ hotspots, width, height }: Props) => {
  return (
    <svg className="hotspots">
      {hotspots.map((hotspot: IHotspot, index: number) => (
        <Hotspot
          key={`hotspot-${hotspot.id ?? index}`}
          xPointer={hotspot.xPointer}
          yPointer={hotspot.yPointer}
          xLabel={hotspot.side === "right" ? width - 100 - labelWidth : 100}
          yLabel={
            (labelHeight + labelMargin) * index +
            (hotspot.side === "right" ? labelMargin : 200)
          }
          header={hotspot.header}
          description={hotspot.description}
          height={height}
          width={width}
          closeCallback={hotspot.closeCallback}
        />
      ))}
    </svg>
  );
};
