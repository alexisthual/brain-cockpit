import { Button, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import React from "react";

import { ViewLayout } from "../index";
import SelectContrastLabel from "components/select/selectContrastLabel";
import {
  ContrastLabel,
  highlightText,
  Model,
  stringRenderer,
} from "constants/index";
import "./style.scss";

const modelRenderer = (
  model: Model,
  { handleClick, modifiers, query }: any
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return (
    <MenuItem
      key={`menu-item-${model.name}`}
      active={modifiers.active}
      onClick={handleClick}
      text={highlightText(model.name, query)}
    />
  );
};

interface Props {
  showGridHelper?: boolean;
  showGridHelperCallback?: () => void;
  model?: Model;
  models?: Model[];
  changeModelCallback: (
    newModel: Model,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
  viewLayout?: ViewLayout;
  changeViewLayout: (
    newMode: ViewLayout,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
  contrast?: ContrastLabel;
  contrastLabels: ContrastLabel[];
  changeContrastLabel: (
    newContrastLabel: ContrastLabel,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
}

const AlignmentControls = ({
  showGridHelper,
  showGridHelperCallback,
  model,
  models,
  changeModelCallback = () => {},
  viewLayout,
  changeViewLayout = () => {},
  contrast,
  contrastLabels,
  changeContrastLabel = () => {},
}: Props) => {
  return (
    <div className="surface-controls">
      <Button
        active={showGridHelper}
        icon={"grid"}
        onClick={showGridHelperCallback}
        outlined
      />
      {viewLayout === ViewLayout.CONTRAST ? (
        <SelectContrastLabel
          selectedItem={contrast as ContrastLabel}
          items={contrastLabels}
          onChangeCallback={(
            newItem: ContrastLabel,
            event?: React.SyntheticEvent<HTMLElement>
          ) => {
            changeContrastLabel(newItem, event);
          }}
        />
      ) : null}
      <Select<string>
        filterable={false}
        items={Object.keys(ViewLayout)}
        itemRenderer={stringRenderer}
        onItemSelect={(
          newItem: string,
          event?: React.SyntheticEvent<HTMLElement>
        ) => {
          if (changeViewLayout) {
            changeViewLayout(
              ViewLayout[newItem as keyof typeof ViewLayout],
              event
            );
          }
        }}
      >
        <Button
          rightIcon="double-caret-vertical"
          text={viewLayout}
          minimal
          outlined
        />
      </Select>
      <Select<any>
        filterable={false}
        items={models ?? []}
        itemRenderer={modelRenderer}
        onItemSelect={(
          newItem: Model,
          event?: React.SyntheticEvent<HTMLElement>
        ) => {
          if (changeModelCallback) {
            changeModelCallback(newItem, event);
          }
        }}
      >
        <Button
          rightIcon="double-caret-vertical"
          text={model?.name}
          minimal
          outlined
        />
      </Select>
    </div>
  );
};

export default AlignmentControls;
// <Select<string>
//   filterable={false}
//   items={modelLabels ?? []}
//   itemRenderer={stringRenderer}
//   onItemSelect={(
//     newItem: string,
//     event?: React.SyntheticEvent<HTMLElement>
//   ) => {
//     if (changeModelCallback) {
//       changeModelCallback(newItem, event);
//     }
//   }}
// >
