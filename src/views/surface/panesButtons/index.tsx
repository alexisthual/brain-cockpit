import { Button } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  addPaneCallback: () => void;
  filterSurface: boolean;
  filterSurfaceCallback: () => void;
  sharedState: boolean;
  sharedStateCallback: () => void;
  showGradient?: number;
  showGradientCallback?: () => void;
}

const PanesButtons = ({
  addPaneCallback = () => {},
  filterSurface,
  filterSurfaceCallback = () => {},
  sharedState,
  sharedStateCallback = () => {},
  showGradient,
  showGradientCallback = () => {},
}: Props) => {
  return (
    <div className="panes-buttons">
      {showGradient !== undefined ? (
        <Button
          active={showGradient > 0}
          icon={showGradient === 2 ? "flow-review-branch" : "arrow-top-right"}
          onClick={showGradientCallback}
          outlined
        />
      ) : null}
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
