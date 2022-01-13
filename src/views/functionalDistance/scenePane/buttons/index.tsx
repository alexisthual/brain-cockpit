import { Button } from "@blueprintjs/core";

import "./style.scss";

interface Props {
  closeCallback: () => void;
}

const PaneButtons = ({ closeCallback = () => {} }: Props) => {
  return (
    <div className="scene-pane-buttons">
      <Button icon="cross" onClick={closeCallback} outlined />
    </div>
  );
};

export default PaneButtons;
