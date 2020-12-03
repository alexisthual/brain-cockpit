import { Spinner } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  text?: string;
}

const OverlayLoader = ({ text }: Props) => {
  return (
    <div className="overlay-loader">
      <Spinner size={Spinner.SIZE_SMALL} tagName={"span"} />
    </div>
  );
};

export default OverlayLoader;
