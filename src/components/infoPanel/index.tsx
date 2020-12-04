import { Button, ButtonGroup, MenuItem } from "@blueprintjs/core";
import { ItemRenderer, Select } from "@blueprintjs/select";
import React from "react";

import { MeshType, MeshTypeString } from "constants/index";
import "./style.scss";

interface IProps {
  subject?: string;
  subjectLabels?: string[];
  subjectChangeCallback?: (subjectIndex: number) => void;
  contrast?: string;
  contrastIndex?: number;
  voxelIndex?: number;
  meanContrastMap?: boolean;
  meanChangeCallback?: () => void;
  meshType?: MeshType;
  meshTypes?: MeshTypeString[];
  meshTypeChangeCallback?: (meshType: MeshType) => void;
}

const InfoPanel = ({
  subject,
  subjectLabels,
  subjectChangeCallback = () => {},
  contrast,
  contrastIndex,
  voxelIndex,
  meanContrastMap,
  meanChangeCallback = () => {},
  meshType,
  meshTypes,
  meshTypeChangeCallback = () => {},
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

  const SelectSubject = Select.ofType<string>();
  const MeshTypeSelect = Select.ofType<MeshTypeString>();

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
                  disabled={meanContrastMap}
                  filterable={false}
                  items={subjectLabels}
                  itemRenderer={stringRenderer}
                  onItemSelect={(item: string) => {
                    subjectChangeCallback(subjectLabels.indexOf(item));
                  }}
                >
                  <Button
                    disabled={meanContrastMap}
                    rightIcon="double-caret-vertical"
                    text={subject}
                  />
                </SelectSubject>
                <Button
                  active={meanContrastMap}
                  icon={meanContrastMap ? "ungroup-objects" : "group-objects"}
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
