import { Button } from "@blueprintjs/core";
import { Orientation } from "constants/index";
import "./style.scss";

interface Props {
  orientation?: Orientation;
  orientationChangeCallback: () => void;
  clickCloseCallback: () => void;
}

const PaneButtons = ({
  orientation,
  orientationChangeCallback,
  clickCloseCallback,
}: Props) => {
  return (
    <div className={`pane-buttons ${orientation}-orientation`}>
      <Button
        icon={"rotate-page"}
        onClick={orientationChangeCallback}
        outlined
        title="Change pane orientation"
      />
      <Button
        icon={"cross"}
        onClick={clickCloseCallback}
        outlined
        title="Close pane"
      />
    </div>
  );
};

export default PaneButtons;
