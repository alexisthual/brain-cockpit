import {
  Button,
  Icon,
  NonIdealState,
  Position,
  Tooltip,
} from "@blueprintjs/core";
import React from "react";
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Route,
  Switch,
} from "react-router-dom";

import CutsExplorer from "views/cuts";
import FunctionalDistanceExplorer from "views/functionalDistance";
import KnnExplorer from "views/knn";
import RegressionExplorer from "views/regression";
import SurfaceExplorer from "views/surface";
import "./App.scss";

export const eel = window.eel;

eel.set_host(
  `${process.env.REACT_APP_API_WS_PROTOCOL}://${process.env.REACT_APP_API_URL}`
);

const App = () => {
  return (
    <Router>
      <div id="app-container">
        <div id="navbar">
          {process.env.REACT_APP_CONDITIONS_VIEW === "true" ? (
            <Tooltip
              content="IBC conditions on surface"
              position={Position.RIGHT}
            >
              <NavLink className="view-button" exact to="/">
                <Icon icon="symbol-square" />
              </NavLink>
            </Tooltip>
          ) : null}
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Tooltip content="Cross-species slices" position={Position.RIGHT}>
              <NavLink className="view-button" exact to="/cuts">
                <Icon icon="symbol-circle" />
              </NavLink>
            </Tooltip>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_REGRESSION_VIEW === "true" ? (
            <Tooltip
              content="Regressed MNI coordinates"
              position={Position.RIGHT}
            >
              <NavLink className="view-button" to="/regression">
                <Icon icon="regression-chart" />
              </NavLink>
            </Tooltip>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_KNN_VIEW === "true" ? (
            <Tooltip content="Functional KNN" position={Position.RIGHT}>
              <NavLink className="view-button" to="/knn">
                <Icon icon="graph" />
              </NavLink>
            </Tooltip>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_CORRELATION_VIEW === "true" ? (
            <Tooltip
              content="Functional distance maps"
              position={Position.RIGHT}
            >
              <NavLink className="view-button" to="/functional-distance">
                <Icon icon="heatmap" />
              </NavLink>
            </Tooltip>
          ) : null}
        </div>
        <Switch>
          <Route exact path="/">
            <SurfaceExplorer />
          </Route>
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Route exact path="/cuts">
              <CutsExplorer />
            </Route>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_REGRESSION_VIEW === "true" ? (
            <Route exact path="/regression">
              <RegressionExplorer />
            </Route>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_KNN_VIEW === "true" ? (
            <Route exact path="/knn">
              <KnnExplorer />
            </Route>
          ) : null}
          {process.env.REACT_APP_EXPERIMENT_CORRELATION_VIEW === "true" ? (
            <Route exact path="/functional-distance">
              <FunctionalDistanceExplorer />
            </Route>
          ) : null}
          <Route>
            <NonIdealState
              icon={"warning-sign"}
              title="Page not found"
              description={
                "This page is either under development or does not exist"
              }
              action={
                <Link to="/">
                  <Button outlined>Go to main view</Button>
                </Link>
              }
            />
          </Route>
        </Switch>
      </div>
    </Router>
  );
};

export default App;
