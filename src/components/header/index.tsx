import { Button, ButtonGroup, MenuItem } from "@blueprintjs/core";
import { ItemRenderer, Select } from "@blueprintjs/select";
import React from "react";
import "./style.scss";

interface IProps {
  subjectLabels?: string[];
  subject?: string;
  contrast?: string;
  contrastIndex?: number;
  voxelIndex?: number;
  subjectChangeCallback?: (subjectIndex: number) => void;
  meanContrastMap?: boolean;
  meanChangeCallback?: () => void;
}

const Header = ({
  subjectLabels,
  subject,
  contrast,
  contrastIndex,
  voxelIndex,
  subjectChangeCallback = () => {},
  meanContrastMap,
  meanChangeCallback = () => {},
}: IProps) => {
  const subjectRenderer: ItemRenderer<string> = (
    subject,
    { handleClick, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        key={`menuitem-subject-${subject}`}
        onClick={handleClick}
        text={subject}
      />
    );
  };

  const SelectSubject = Select.ofType<string>();

  return (
    <div id="header">
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
                  itemRenderer={subjectRenderer}
                  onItemSelect={(item: string) => {
                    console.log(item);
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

export default Header;
