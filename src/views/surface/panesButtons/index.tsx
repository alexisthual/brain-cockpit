import { Button } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  addPaneCallback: () => void;
}

const PanesButtons = ({ addPaneCallback = () => {} }: Props) => {
  return (
    <div className="panes-buttons">
      <Button icon="plus" onClick={addPaneCallback} />
    </div>
  );
};

export default PanesButtons;
