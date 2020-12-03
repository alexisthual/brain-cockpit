import {
  Button,
  Divider,
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
import RegressionExplorer from "views/regression";
import SurfaceExplorer from "views/surface";
import "./App.scss";

export const eel = window.eel;
export const brainsprite = window.brainsprite;
export const mpld3: any = window.mpld3;
eel.set_host("ws://localhost:9442");

const App = () => {
  return (
    <Router>
      <div id="app-container">
        <div id="navbar">
          <Tooltip
            content="IBC conditions on surface"
            position={Position.RIGHT}
          >
            <NavLink className="view-button" exact to="/">
              <Icon icon="symbol-square" />
            </NavLink>
          </Tooltip>
          <Tooltip content="IBC conditions slices" position={Position.RIGHT}>
            <NavLink className="view-button" exact to="/cuts">
              <Icon icon="symbol-circle" />
            </NavLink>
          </Tooltip>
          <Tooltip content="IBC conditions volume" position={Position.RIGHT}>
            <NavLink className="view-button" to="/volume">
              <Icon icon="cube" />
            </NavLink>
          </Tooltip>
          <Divider />
          <Tooltip
            content="Regressed MNI coordinates"
            position={Position.RIGHT}
          >
            <NavLink className="view-button" to="/regression">
              <Icon icon="regression-chart" />
            </NavLink>
          </Tooltip>
          <Tooltip content="Functional distance maps" position={Position.RIGHT}>
            <NavLink className="view-button" to="/functional-distance">
              <Icon icon="heatmap" />
            </NavLink>
          </Tooltip>
        </div>
        <Switch>
          <Route exact path="/">
            <SurfaceExplorer />
          </Route>
          <Route exact path="/cuts">
            <CutsExplorer />
          </Route>
          <Route exact path="/regression">
            <RegressionExplorer />
          </Route>
          <Route exact path="/functional-distance">
            <FunctionalDistanceExplorer />
          </Route>
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
