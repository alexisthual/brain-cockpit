import { Button } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import React from "react";

import "./style.scss";

interface Props {
  closeCallback: () => void;
  tooltipText?: string;
}

const CloseButton = ({
  closeCallback = () => {},
  tooltipText = "Close",
}: Props) => {
  return (
    <div className="close-button">
      <Tooltip2 content={tooltipText}>
        <Button icon="cross" onClick={closeCallback} minimal />
      </Tooltip2>
    </div>
  );
};

export default CloseButton;
