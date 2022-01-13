import { Button } from "@blueprintjs/core";

import "./style.scss";

interface Props {
  addPaneCallback: () => void;
  sharedState: boolean;
  sharedStateCallback: () => void;
}

const PanesButtons = ({
  addPaneCallback = () => {},
  sharedState,
  sharedStateCallback = () => {},
}: Props) => {
  return (
    <div className="panes-buttons">
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
