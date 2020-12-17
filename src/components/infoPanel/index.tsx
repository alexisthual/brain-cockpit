import { Button, ButtonGroup } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import React from "react";

import {
  HemisphereSide,
  HemisphereSideString,
  MeshType,
  MeshTypeString,
  Metric,
  MetricString,
  SurfaceMapType,
  SurfaceMapTypeString,
  stringRenderer,
} from "constants/index";
import "./style.scss";

interface IProps {
  subject?: string;
  subjectLabels?: string[];
  subjectChangeCallback?: (subjectIndex: number) => void;
  contrast?: string;
  contrastIndex?: number;
  voxelIndex?: number;
  meanSurfaceMap?: boolean;
  meanChangeCallback?: () => void;
  meshType?: MeshType;
  meshTypeLabels?: MeshTypeString[];
  meshTypeChangeCallback?: (meshType: MeshType) => void;
  metric?: Metric;
  metricLabels?: MetricString[];
  metricChangeCallback?: (metric: Metric) => void;
  surfaceMapType?: SurfaceMapType;
  surfaceMapTypeLabels?: SurfaceMapTypeString[];
  surfaceMapTypeChangeCallback?: (surfaceMapType: SurfaceMapType) => void;
  hemi?: HemisphereSide;
  hemiLabels?: HemisphereSideString[];
  hemiChangeCallback?: (hemi: HemisphereSide) => void;
}

const InfoPanel = ({
  subject,
  subjectLabels,
  subjectChangeCallback = () => {},
  contrast,
  contrastIndex,
  voxelIndex,
  meanSurfaceMap,
  meanChangeCallback = () => {},
  meshType,
  meshTypeLabels,
  meshTypeChangeCallback = () => {},
  hemi,
  hemiLabels,
  hemiChangeCallback = () => {},
  metric,
  metricLabels,
  metricChangeCallback = () => {},
  surfaceMapType,
  surfaceMapTypeLabels,
  surfaceMapTypeChangeCallback = () => {},
}: IProps) => {
  const MeshTypeSelect = Select.ofType<MeshTypeString>();
  const HemiSelect = Select.ofType<HemisphereSideString>();
  const SelectSubject = Select.ofType<string>();
  const MetricSelect = Select.ofType<MetricString>();
  const SurfaceMapTypeSelect = Select.ofType<SurfaceMapTypeString>();

  return (
    <div className="info-panel">
      {meshType ? (
        <>
          <div className="header-item-label">Mesh type</div>
          <div className="header-item-value">
            {meshTypeLabels ? (
              <ButtonGroup>
                <MeshTypeSelect
                  filterable={false}
                  items={meshTypeLabels}
                  itemRenderer={stringRenderer}
                  onItemSelect={(meshTypeString: MeshTypeString) => {
                    meshTypeChangeCallback(MeshType[meshTypeString]);
                  }}
                >
                  <Button rightIcon="double-caret-vertical" text={meshType} />
                </MeshTypeSelect>
              </ButtonGroup>
            ) : (
              <>{meshType}</>
            )}
          </div>
        </>
      ) : null}
      {hemi ? (
        <>
          <div className="header-item-label">Hemisphere</div>
          <div className="header-item-value">
            {hemiLabels ? (
              <ButtonGroup>
                <HemiSelect
                  filterable={false}
                  items={hemiLabels}
                  itemRenderer={stringRenderer}
                  onItemSelect={(hemiString: HemisphereSideString) => {
                    hemiChangeCallback(HemisphereSide[hemiString]);
                  }}
                >
                  <Button rightIcon="double-caret-vertical" text={hemi} />
                </HemiSelect>
              </ButtonGroup>
            ) : (
              <>{hemi}</>
            )}
          </div>
        </>
      ) : null}
      {subjectLabels || subject ? (
        <>
          <div className="header-item-label">Subject</div>
          <div className="header-item-value">
            {subjectLabels ? (
              <ButtonGroup>
                <SelectSubject
                  disabled={meanSurfaceMap}
                  filterable={false}
                  items={subjectLabels}
                  itemRenderer={stringRenderer}
                  onItemSelect={(item: string) => {
                    subjectChangeCallback(subjectLabels.indexOf(item));
                  }}
                >
                  <Button
                    disabled={meanSurfaceMap}
                    rightIcon="double-caret-vertical"
                    text={subject}
                  />
                </SelectSubject>
                <Button
                  active={meanSurfaceMap}
                  icon={meanSurfaceMap ? "ungroup-objects" : "group-objects"}
                  onClick={meanChangeCallback}
                  outlined
                  title={"Take subjects' mean"}
                />
              </ButtonGroup>
            ) : (
              <>{subject}</>
            )}
          </div>
        </>
      ) : null}
      {contrast ? (
        <>
          <div className="header-item-label">Contrast</div>
          <div className="header-item-value">
            {contrast} ({contrastIndex})
          </div>
        </>
      ) : null}
      {metricLabels || metric ? (
        <>
          <div className="header-item-label">Metric</div>
          <div className="header-item-value">
            {metricLabels ? (
              <MetricSelect
                filterable={false}
                items={metricLabels}
                itemRenderer={stringRenderer}
                onItemSelect={(metric: MetricString) => {
                  metricChangeCallback(Metric[metric]);
                }}
              >
                <Button rightIcon="double-caret-vertical" text={metric} />
              </MetricSelect>
            ) : (
              <>{metric}</>
            )}
          </div>
        </>
      ) : null}
      {surfaceMapTypeLabels || surfaceMapType ? (
        <>
          <div className="header-item-label">Type</div>
          <div className="header-item-value">
            {surfaceMapTypeLabels ? (
              <SurfaceMapTypeSelect
                filterable={false}
                items={surfaceMapTypeLabels}
                itemRenderer={stringRenderer}
                onItemSelect={(surfaceMapType: SurfaceMapTypeString) => {
                  surfaceMapTypeChangeCallback(SurfaceMapType[surfaceMapType]);
                }}
              >
                <Button
                  rightIcon="double-caret-vertical"
                  text={surfaceMapType}
                />
              </SurfaceMapTypeSelect>
            ) : (
              <>{surfaceMapType}</>
            )}
          </div>
        </>
      ) : null}
      {voxelIndex ? (
        <>
          <div className="header-item-label">Voxel</div>
          <div className="header-item-value">{voxelIndex}</div>
        </>
      ) : null}
    </div>
  );
};

export default InfoPanel;
