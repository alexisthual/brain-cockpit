import { Button } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import React from "react";

import { GradientMode, SurfaceMode } from "constants/index";
import "./style.scss";

interface Props {
  addPaneCallback: () => void;
  filterSurface: boolean;
  filterSurfaceCallback: () => void;
  gradientMode?: GradientMode;
  showGradientCallback?: () => void;
  showGridHelper?: boolean;
  showGridHelperCallback?: () => void;
  surfaceMode?: SurfaceMode;
  showSurfaceCallback?: () => void;
}

const SurfaceControls = ({
  addPaneCallback = () => {},
  filterSurface,
  filterSurfaceCallback = () => {},
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
    <div className="surface-controls">
      <Tooltip2 content="Toggle grid" placement={"top-end"}>
        <Button
          active={showGridHelper}
          icon={"grid"}
          onClick={showGridHelperCallback}
          outlined
        />
      </Tooltip2>
      {process.env.REACT_APP_ENABLE_GRADIENTS === "true" ? (
        <>
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
        </>
      ) : null}
      <Tooltip2 content="Normalise surface map" placement={"top-end"}>
        <Button
          active={filterSurface}
          icon={"filter"}
          onClick={filterSurfaceCallback}
          outlined
        />
      </Tooltip2>
      <Tooltip2 content="Add pane" placement={"top-end"}>
        <Button icon="plus" onClick={addPaneCallback} outlined />
      </Tooltip2>
    </div>
  );
};

export default SurfaceControls;
