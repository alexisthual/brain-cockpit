import { Button } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import React from "react";

import { GradientMode, stringRenderer, SurfaceMode } from "constants/index";
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
}

const AlignmentControls = ({
  showGridHelper,
  showGridHelperCallback,
  model,
  modelLabels,
  changeModelCallback = () => {},
}: Props) => {
  return (
    <div className="surface-controls">
      <Button
        active={showGridHelper}
        icon={"grid"}
        onClick={showGridHelperCallback}
        outlined
      />
      <Select<string>
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
        <Button rightIcon="double-caret-vertical" text={model} />
      </Select>
    </div>
  );
};

export default AlignmentControls;
