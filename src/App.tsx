import { Button, Icon, NonIdealState, Position } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import axios from "axios";
import React from "react";
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import AlignmentsExplorer from "views/alignments";
import CutsExplorer from "views/cuts";
import FunctionalDistanceExplorer from "views/functionalDistance";
import KnnExplorer from "views/knn";
import RegressionExplorer from "views/regression";
import SurfaceExplorer from "views/surface";
import "./App.scss";

export const server = axios.create({
  baseURL: `${process.env.REACT_APP_API_HTTP_PROTOCOL}://${process.env.REACT_APP_API_URL}`,
});

const App = () => {
  const indexPage = (
    <NonIdealState
      icon={"predictive-analysis"}
      title="brain-cockpit"
      description={
        "Select a section from the navigation bar to start using the app."
      }
      action={
        <Link to="/ibc">
          <Button intent={"primary"} outlined>
            Explore IBC dataset
          </Button>
        </Link>
      }
    />
  );

  const pageNotFound = (
    <NonIdealState
      icon={"warning-sign"}
      title="Page not found"
      description={"This page is either under development or does not exist"}
      action={
        <Link to="/">
          <Button intent={"primary"} outlined>
            Go to main view
          </Button>
        </Link>
      }
    />
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={indexPage} />
          {process.env.REACT_APP_CONDITIONS_VIEW === "true" ? (
            <Route path="/ibc" element={<SurfaceExplorer />} />
          ) : null}
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Route path="/cuts" element={<CutsExplorer />} />
          ) : null}
          {process.env.REACT_APP_ALIGNMENTS_VIEW === "true" ? (
            <Route path="/alignments" element={<AlignmentsExplorer />} />
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
        {process.env.REACT_APP_CONDITIONS_VIEW === "true" ? (
          <Tooltip2 content="IBC dataset explorer" position={Position.RIGHT}>
            <NavLink className="view-button" to="/ibc">
              <Icon icon="database" />
            </NavLink>
          </Tooltip2>
        ) : null}
        {process.env.REACT_APP_ALIGNMENTS_VIEW === "true" ? (
          <Tooltip2 content="IBC subject alignments" position={Position.RIGHT}>
            <NavLink className="view-button" to="/alignments">
              <Icon icon="swap-horizontal" />
            </NavLink>
          </Tooltip2>
        ) : null}
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
