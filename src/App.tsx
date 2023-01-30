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
import CutsExplorer from "views/cuts";
import FunctionalDistanceExplorer from "views/functionalDistance";
import KnnExplorer from "views/knn";
import RegressionExplorer from "views/regression";
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
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Route path="/cuts" element={<CutsExplorer />} />
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_REGRESSION_VIEW === "true" ? (
            <Route path="/regression" element={<RegressionExplorer />} />
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_KNN_VIEW === "true" ? (
            <Route path="/knn" element={<KnnExplorer />} />
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_CORRELATION_VIEW === "true" ? (
            <Route
              path="/functional-distance"
              element={<FunctionalDistanceExplorer />}
            />
          ) : null}
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
        {process.env.REACT_APP_SLICE_VIEW === "true" ? (
          <Tooltip2 content="Cross-species slices" position={Position.RIGHT}>
            <NavLink className="view-button" to="/cuts">
              <Icon icon="symbol-circle" />
            </NavLink>
          </Tooltip2>
        ) : null}
        {process.env.REACT_APP_EXPERIMENT_REGRESSION_VIEW === "true" ? (
          <Tooltip2
            content="Regressed MNI coordinates"
            position={Position.RIGHT}
          >
            <NavLink className="view-button" to="/regression">
              <Icon icon="regression-chart" />
            </NavLink>
          </Tooltip2>
        ) : null}
        {process.env.REACT_APP_EXPERIMENT_KNN_VIEW === "true" ? (
          <Tooltip2 content="Functional KNN" position={Position.RIGHT}>
            <NavLink className="view-button" to="/knn">
              <Icon icon="graph" />
            </NavLink>
          </Tooltip2>
        ) : null}
        {process.env.REACT_APP_EXPERIMENT_CORRELATION_VIEW === "true" ? (
          <Tooltip2
            content="Functional distance maps"
            position={Position.RIGHT}
          >
            <NavLink className="view-button" to="/functional-distance">
              <Icon icon="heatmap" />
            </NavLink>
          </Tooltip2>
        ) : null}
      </div>

      <Outlet />
    </div>
  );
};

export default App;
