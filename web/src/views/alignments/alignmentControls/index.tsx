import { Button } from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import React from "react";

import { ViewLayout } from "../index";
import SelectContrastLabel from "components/select/selectContrastLabel";
import { ContrastLabel, stringRenderer } from "constants/index";
import "./style.scss";

interface Props {
  showGridHelper?: boolean;
  showGridHelperCallback?: () => void;
  model?: string;
  modelLabels?: string[];
  changeModelCallback: (
    newModel: string,
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
  modelLabels,
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
      <Select2<string>
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
      </Select2>
      <Select2<string>
        filterable={false}
        items={modelLabels ?? []}
        itemRenderer={stringRenderer}
        onItemSelect={(
          newItem: string,
          event?: React.SyntheticEvent<HTMLElement>
        ) => {
          if (changeModelCallback) {
            changeModelCallback(newItem, event);
          }
        }}
      >
        <Button
          rightIcon="double-caret-vertical"
          text={model}
          minimal
          outlined
        />
      </Select2>
    </div>
  );
};

export default AlignmentControls;
