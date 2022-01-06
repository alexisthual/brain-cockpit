import { Button, Icon, NonIdealState, Position } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import axios from "axios";
import React from "react";
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Redirect,
  Route,
  Switch,
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
  let defaultUrl = "/";
  // Change default url depending on available modules
  if (process.env.REACT_APP_CONDITIONS_VIEW === "true") {
    defaultUrl = "/ibc";
  } else if (process.env.REACT_APP_ALIGNMENTS_VIEW === "true") {
    defaultUrl = "/alignments";
  }

  return (
    <Router>
      <div id="app-container">
        <div id="navbar">
          {process.env.REACT_APP_CONDITIONS_VIEW === "true" ? (
            <Tooltip2 content="IBC dataset explorer" position={Position.RIGHT}>
              <NavLink className="view-button" exact to="/ibc">
                <Icon icon="database" />
              </NavLink>
            </Tooltip2>
          ) : null}
          {process.env.REACT_APP_ALIGNMENTS_VIEW === "true" ? (
            <Tooltip2
              content="IBC subject alignments"
              position={Position.RIGHT}
            >
              <NavLink className="view-button" exact to="/alignments">
                <Icon icon="swap-horizontal" />
              </NavLink>
            </Tooltip2>
          ) : null}
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Tooltip2 content="Cross-species slices" position={Position.RIGHT}>
              <NavLink className="view-button" exact to="/cuts">
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
        <Switch>
          <Route exact path="/">
            <Redirect to={defaultUrl} />
          </Route>
          {process.env.REACT_APP_CONDITIONS_VIEW === "true" ? (
            <Route exact path="/ibc">
              <SurfaceExplorer />
            </Route>
          ) : null}
          {process.env.REACT_APP_SLICE_VIEW === "true" ? (
            <Route exact path="/cuts">
              <CutsExplorer />
            </Route>
          ) : null}
          {process.env.REACT_APP_ALIGNMENTS_VIEW === "true" ? (
            <Route exact path="/alignments">
              <AlignmentsExplorer />
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
