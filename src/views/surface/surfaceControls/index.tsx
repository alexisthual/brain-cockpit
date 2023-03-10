import { Button } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";

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
  showKeyDialog?: boolean;
  showKeyDialogCallback?: () => void;
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
  showKeyDialog,
  showKeyDialogCallback = () => {},
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
      <div className="surface-controls-left">
        <Tooltip2 content="Add pane" placement={"top-start"}>
          <Button icon="plus" onClick={addPaneCallback} outlined />
        </Tooltip2>
        <Tooltip2 content="Toggle grid" placement={"top-start"}>
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
        <Tooltip2 content="Threshold surface map" placement={"top-start"}>
          <Button
            active={filterSurface}
            icon={"filter"}
            onClick={filterSurfaceCallback}
            outlined
          />
        </Tooltip2>
      </div>
      <div className="surface-controls-right">
        <Tooltip2 content="Show shortcuts" placement={"top-start"}>
          <Button
            active={showKeyDialog}
            icon={"help"}
            onClick={showKeyDialogCallback}
            outlined
          />
        </Tooltip2>
      </div>
    </div>
  );
};

export default SurfaceControls;
