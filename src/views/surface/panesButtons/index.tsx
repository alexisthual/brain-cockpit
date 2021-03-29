import { Button } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  addPaneCallback: () => void;
  filterSurface: boolean;
  filterSurfaceCallback: () => void;
  sharedState: boolean;
  sharedStateCallback: () => void;
}

const PanesButtons = ({
  addPaneCallback = () => {},
  filterSurface,
  filterSurfaceCallback = () => {},
  sharedState,
  sharedStateCallback = () => {},
}: Props) => {
  return (
    <div className="panes-buttons">
      <Button
        active={filterSurface}
        icon={"filter"}
        onClick={filterSurfaceCallback}
        outlined
      />
      <Button
        active={sharedState}
        icon={sharedState ? "lock" : "unlock"}
        onClick={sharedStateCallback}
        outlined
      />
      <Button icon="plus" onClick={addPaneCallback} outlined />
    </div>
  );
};

export default PanesButtons;
