import { Button, Icon, NonIdealState, Position } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import axios from "axios";
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import HomeView from "views/home";
import AlignmentsExplorer from "views/alignments";
import SurfaceExplorer from "views/surface";

import "./App.scss";
let config = require("../config.yaml").default;

export const server = axios.create({
  baseURL: `${process.env.REACT_APP_API_HTTP_PROTOCOL}://${process.env.REACT_APP_API_URL}`,
});

const App = () => {
  const pageNotFound = (
    <NonIdealState
      icon={"warning-sign"}
      title="Page not found"
      description={"This page is either under development or does not exist."}
      action={
        <Link to="/">
          <Button intent={"primary"} large icon="home">
            Go to home page
          </Button>
        </Link>
      }
    />
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<HomeView />} />
          {Object.entries(config.surfaces.datasets).map(
            ([datasetId, dataset]: any) => (
              <Route
                key={`alignments-route-${datasetId}`}
                path={`/datasets/${datasetId}`}
                element={<SurfaceExplorer datasetId={datasetId} />}
              />
            )
          )}
          {Object.entries(config.alignments.datasets).map(
            ([datasetId, dataset]: any) => (
              <Route
                key={`alignments-route-${datasetId}`}
                path={`/alignments/${datasetId}`}
                element={<AlignmentsExplorer datasetId={datasetId} />}
              />
            )
          )}
          <Route path="*" element={pageNotFound} />
        </Route>
      </Routes>
    </Router>
  );
};

const Layout = () => {
  return (
    <div id="app-container">
      <div id="navbar">
        <Tooltip2 content="Home" position={Position.RIGHT}>
          <NavLink className="view-button" to="/">
            <Icon icon="home" />
          </NavLink>
        </Tooltip2>
        <span className="bp4-navbar-divider"></span>
        {config.surfaces !== undefined && config.surfaces.datasets !== undefined
          ? Object.entries(config.surfaces.datasets).map(
              ([datasetId, dataset]: any) => (
                <Tooltip2
                  key={`surface-dataset-${datasetId}`}
                  content={dataset.name}
                  position={Position.RIGHT}
                >
                  <NavLink
                    className="view-button"
                    to={`/datasets/${datasetId}`}
                  >
                    <Icon icon="database" />
                  </NavLink>
                </Tooltip2>
              )
            )
          : null}
        {config.alignments !== undefined &&
        config.alignments.datasets !== undefined
          ? Object.entries(config.alignments.datasets).map(
              ([datasetId, dataset]: any) => (
                <Tooltip2
                  key={`alignment-dataset-${datasetId}`}
                  content={dataset.name}
                  position={Position.RIGHT}
                >
                  <NavLink
                    className="view-button"
                    to={`/alignments/${datasetId}`}
                  >
                    <Icon icon="swap-horizontal" />
                  </NavLink>
                </Tooltip2>
              )
            )
          : null}
      </div>

      <Outlet />
    </div>
  );
};

export default App;
