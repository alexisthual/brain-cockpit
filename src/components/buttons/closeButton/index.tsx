import { Button } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  closeCallback: () => void;
}

const CloseButton = ({ closeCallback = () => {} }: Props) => {
  return (
    <div className="close-button">
      <Button icon="cross" onClick={closeCallback} outlined />
    </div>
  );
};

export default CloseButton;
