import { Spinner, SpinnerSize } from "@blueprintjs/core";

import "./style.scss";

interface Props {
  text?: string;
}

const TextualLoader = ({ text }: Props) => {
  return (
    <div className="textual-loader-container">
      <div className="textual-loader">
        <Spinner size={SpinnerSize.SMALL} tagName={"span"} />
        {text ?? "Loading..."}
      </div>
    </div>
  );
};

export default TextualLoader;
