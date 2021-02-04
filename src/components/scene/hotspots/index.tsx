import { Drag } from "@vx/drag";
import React, { useRef } from "react";

import "./style.scss";

export interface IHotspot {
  id?: string;
  voxelIndex?: number;
  xPointer?: number;
  yPointer?: number;
  header?: string;
  description?: string;
}

interface HotspotProps extends IHotspot {
  xLabel?: number;
  yLabel?: number;
  width: number;
  height: number;
}

interface Props {
  hotspots: IHotspot[];
  width: number;
  height: number;
}

const Hotspot = ({
  xLabel = 200,
  yLabel = 200,
  xPointer,
  yPointer,
  header,
  description,
  width,
  height,
}: HotspotProps) => {
  const lineRef = useRef<SVGLineElement>(null);
  const labelWidth = 120;
  const padding = 7;
  const lineHeight = 12;

  return (
    <>
      <line
        className="hotspot-line"
        ref={lineRef}
        x1={xPointer}
        y1={yPointer}
        x2={xLabel}
        y2={yLabel}
      />
      <circle className="hotspot-pointer" cx={xPointer} cy={yPointer} r={3} />
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
                  height={40}
                  rx={2}
                  transform={`translate(${dx}, ${dy})`}
                  onMouseMove={dragMove}
                  onMouseUp={dragEnd}
                  onMouseDown={dragStart}
                  onTouchStart={dragStart}
                  onTouchMove={dragMove}
                  onTouchEnd={dragEnd}
                />
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

export const Hotspots = ({ hotspots, width, height }: Props) => {
  return (
    <svg className="hotspots">
      {hotspots.map((hotspot: IHotspot, index: number) => (
        <Hotspot
          key={`hotspot-${hotspot.id ?? index}`}
          xPointer={hotspot.xPointer}
          yPointer={hotspot.yPointer}
          xLabel={100}
          yLabel={200 + 50 * index}
          header={hotspot.header}
          description={hotspot.description}
          height={height}
          width={width}
        />
      ))}
    </svg>
  );
};
