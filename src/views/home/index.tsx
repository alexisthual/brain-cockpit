import { Callout, Card, Elevation, Icon } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";

import "./style.scss";
let config = require("../../../config.yaml").default;

const HomeView = () => {
  const navigate = useNavigate();

  let warningDiv = null;
  let surfaceDatasetsDiv = null;
  let alignmentDatasetsDiv = null;

  if (config.allow_very_unsafe_file_sharing) {
    warningDiv = (
      <div className="app-warnings">
        <Callout intent="warning" title="Granted unsafe file access">
          You set{" "}
          <code className="bp4-code">allow_very_unsafe_file_sharing</code> to{" "}
          <code className="bp4-code">true</code> in the configuration file.
          While this is ok for staging instances of brain-cockpit, you should
          absolutely set this parameters to{" "}
          <code className="bp4-code">false</code> on production instances.
        </Callout>
      </div>
    );
  }

  if (
    config.surfaces &&
    config.surfaces.datasets &&
    Object.keys(config.surfaces.datasets).length > 0
  ) {
    surfaceDatasetsDiv = (
      <div className="home-section">
        <div className="home-section-title">
          <Icon icon="database" size={24} />
          <h2 className="bp4-heading">Available surface datasets</h2>
        </div>
        <div className="home-section-items">
          {Object.entries(config.surfaces.datasets).map(([key, value]: any) => (
            <Card
              interactive={true}
              elevation={Elevation.TWO}
              onClick={() => navigate(`/datasets/${key}`)}
            >
              <h3>{value.name}</h3>
              <p className="bp4-monospace-text">{value.path}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (
    config.alignments &&
    config.alignments.datasets &&
    Object.keys(config.alignments.datasets).length > 0
  ) {
    alignmentDatasetsDiv = (
      <div className="home-section">
        <div className="home-section-title">
          <Icon icon="swap-horizontal" size={24} />
          <h2 className="bp4-heading">Available alignments datasets</h2>
        </div>
        <div className="home-section-items">
          {Object.entries(config.alignments.datasets).map(
            ([key, value]: any) => (
              <Card
                interactive={true}
                elevation={Elevation.TWO}
                onClick={() => navigate(`/alignments/${key}`)}
              >
                <h3>{value.name}</h3>
                <p className="bp4-monospace-text">{value.path}</p>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="home">
      <div className="home-title">
        <Icon icon="predictive-analysis" size={60} />
        <h1 className="bp4-heading">Brain-cockpit</h1>
      </div>
      {warningDiv}
      {surfaceDatasetsDiv}
      {alignmentDatasetsDiv}
    </div>
  );
};

export default HomeView;
