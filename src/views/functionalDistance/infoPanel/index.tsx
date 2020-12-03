import { Button, ButtonGroup, MenuItem } from "@blueprintjs/core";
import { ItemRenderer, Select } from "@blueprintjs/select";
import React from "react";

import "./style.scss";
import {
  Metric,
  MetricString,
  SurfaceMapType,
  SurfaceMapTypeString,
} from "views/functionalDistance";

interface Props {
  subjectLabels?: string[];
  subject?: string;
  subjectChangeCallback?: (subjectIndex: number) => void;
  meanSurfaceMap?: boolean;
  meanChangeCallback?: () => void;
  voxelIndex?: number;
  metric?: Metric;
  metricLabels?: MetricString[];
  metricChangeCallback?: (metric: Metric) => void;
  surfaceMapType?: SurfaceMapType;
  surfaceMapTypeLabels?: SurfaceMapTypeString[];
  surfaceMapTypeChangeCallback?: (surfaceMapType: SurfaceMapType) => void;
}

const InfoPanel = ({
  subjectLabels,
  subject,
  subjectChangeCallback = () => {},
  meanSurfaceMap,
  meanChangeCallback = () => {},
  voxelIndex,
  metric,
  metricLabels,
  metricChangeCallback = () => {},
  surfaceMapType,
  surfaceMapTypeLabels,
  surfaceMapTypeChangeCallback = () => {},
}: Props) => {
  const stringRenderer: ItemRenderer<string> = (
    s,
    { handleClick, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return <MenuItem key={`menuitem-${s}`} onClick={handleClick} text={s} />;
  };

  const SubjectSelect = Select.ofType<string>();
  const MetricSelect = Select.ofType<MetricString>();
  const SurfaceMapTypeSelect = Select.ofType<SurfaceMapTypeString>();

  return (
    <div className="info-panel">
      {subjectLabels || subject ? (
        <>
          <div className="header-item-label">Subject</div>
          <div className="header-item-value">
            {subjectLabels ? (
              <ButtonGroup>
                <SubjectSelect
                  disabled={meanSurfaceMap}
                  filterable={false}
                  items={subjectLabels}
                  itemRenderer={stringRenderer}
                  onItemSelect={(subject: string) => {
                    subjectChangeCallback(subjectLabels.indexOf(subject));
                  }}
                >
                  <Button
                    disabled={meanSurfaceMap}
                    rightIcon="double-caret-vertical"
                    text={subject}
                  />
                </SubjectSelect>
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
