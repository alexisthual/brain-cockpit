import { Spinner, SpinnerSize } from "@blueprintjs/core";

import "./style.scss";

const OverlayLoader = () => {
  return (
    <div className="overlay-loader">
      <Spinner size={SpinnerSize.SMALL} tagName={"span"} />
    </div>
  );
};

export default OverlayLoader;
