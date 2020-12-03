import { Spinner } from "@blueprintjs/core";
import React from "react";

import "./style.scss";

interface Props {
  text?: string;
}

const TextualLoader = ({ text }: Props) => {
  return (
    <div className="textual-loader">
      <Spinner size={Spinner.SIZE_SMALL} tagName={"span"} />
      {text ?? "Loading..."}
    </div>
  );
};

export default TextualLoader;
