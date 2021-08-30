import { Button } from "@blueprintjs/core";
import React from "react";

import { GradientMode, SurfaceMode } from "constants/index";
import "./style.scss";

interface Props {
  addPaneCallback: () => void;
  filterSurface: boolean;
  filterSurfaceCallback: () => void;
  sharedState: boolean;
  sharedStateCallback: () => void;
  gradientMode?: GradientMode;
  showGradientCallback?: () => void;
  showGridHelper?: boolean;
  showGridHelperCallback?: () => void;
  surfaceMode?: SurfaceMode;
  showSurfaceCallback?: () => void;
}

const PanesButtons = ({
  addPaneCallback = () => {},
  filterSurface,
  filterSurfaceCallback = () => {},
  sharedState,
  sharedStateCallback = () => {},
  gradientMode,
  showGradientCallback = () => {},
  showGridHelper,
  showGridHelperCallback = () => {},
  surfaceMode,
  showSurfaceCallback = () => {},
}: Props) => {
  let gradientButtonText;
  switch (gradientMode) {
    case GradientMode.LOCAL:
      gradientButtonText = "Local Gradient";
      break;
    default:
      gradientButtonText = "None";
      break;
  }

  let surfaceButtonText;
  switch (surfaceMode) {
    case SurfaceMode.CONTRAST:
      surfaceButtonText = "Contrast";
      break;
    case SurfaceMode.GRADIENT:
      surfaceButtonText = "Gradient";
      break;
    default:
      surfaceButtonText = "Contrast";
      break;
  }

  return (
    <div className="panes-buttons">
      <Button
        active={showGridHelper}
        icon={"grid"}
        onClick={showGridHelperCallback}
        outlined
      />
      <Button
        icon={"function"}
        onClick={showSurfaceCallback}
        text={surfaceButtonText}
        outlined
      />
      <Button
        icon={"flows"}
        onClick={showGradientCallback}
        text={gradientButtonText}
        outlined
      />
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
