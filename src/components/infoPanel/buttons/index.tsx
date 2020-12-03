import { Button } from "@blueprintjs/core";
import React from "react";
import { Orientation } from "constants/index";
import "./style.scss";

interface Props {
  orientation?: Orientation;
  orientationChangeCallback: () => void;
  meanFingerprint: boolean;
  meanChangeCallback: () => void;
  clickCloseCallback: () => void;
}

const PanelButtons = ({
  orientation,
  orientationChangeCallback,
  meanFingerprint,
  meanChangeCallback,
  clickCloseCallback,
}: Props) => {
  return (
    <div className={`pane-buttons ${orientation}-orientation`}>
      <Button
        active={meanFingerprint}
        icon={meanFingerprint ? "ungroup-objects" : "group-objects"}
        onClick={meanChangeCallback}
        outlined
        title={"Take subjects' mean"}
      />
      <Button
        icon={"rotate-page"}
        onClick={orientationChangeCallback}
        outlined
        title="Change panel orientation"
      />
      <Button
        icon={"cross"}
        onClick={clickCloseCallback}
        outlined
        title="Close panel"
      />
    </div>
  );
};

export default PanelButtons;
