import { Button, ButtonGroup, MenuItem } from "@blueprintjs/core";
import { ItemRenderer, Select } from "@blueprintjs/select";
import React from "react";

import {
  MeshType,
  MeshTypeString,
  Metric,
  MetricString,
  SurfaceMapType,
  SurfaceMapTypeString,
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
  meshTypes?: MeshTypeString[];
  meshTypeChangeCallback?: (meshType: MeshType) => void;
  metric?: Metric;
  metricLabels?: MetricString[];
  metricChangeCallback?: (metric: Metric) => void;
  surfaceMapType?: SurfaceMapType;
  surfaceMapTypeLabels?: SurfaceMapTypeString[];
  surfaceMapTypeChangeCallback?: (surfaceMapType: SurfaceMapType) => void;
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
  meshTypes,
  meshTypeChangeCallback = () => {},
  metric,
  metricLabels,
  metricChangeCallback = () => {},
  surfaceMapType,
  surfaceMapTypeLabels,
  surfaceMapTypeChangeCallback = () => {},
}: IProps) => {
  const stringRenderer: ItemRenderer<string> = (
    str,
    { handleClick, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem key={`menuitem-${str}`} onClick={handleClick} text={str} />
    );
  };

  const MeshTypeSelect = Select.ofType<MeshTypeString>();
  const SelectSubject = Select.ofType<string>();
  const MetricSelect = Select.ofType<MetricString>();
  const SurfaceMapTypeSelect = Select.ofType<SurfaceMapTypeString>();

  return (
    <div id="header">
      {meshType ? (
        <>
          <div className="header-item-label">Mesh type</div>
          <div className="header-item-value">
            {meshTypes ? (
              <ButtonGroup>
                <MeshTypeSelect
                  filterable={false}
                  items={meshTypes}
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
