import { Spinner, SpinnerSize } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  text?: string;
}

const OverlayLoader = ({ text }: Props) => {
  return (
    <div className="overlay-loader">
      <Spinner size={SpinnerSize.SMALL} tagName={"span"} />
    </div>
  );
};

export default OverlayLoader;
