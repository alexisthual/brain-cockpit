import { Button, Divider, Icon, NonIdealState } from "@blueprintjs/core";
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
eel.set_host("ws://localhost:9442");

const App = () => {
  return (
    <Router>
      <div id="app-container">
        <div id="navbar">
          <NavLink className="view-button" exact to="/">
            <Icon icon="symbol-square" />
          </NavLink>
          <NavLink className="view-button" exact to="/cuts">
            <Icon icon="symbol-circle" />
          </NavLink>
          <NavLink className="view-button" to="/volume">
            <Icon icon="cube" />
          </NavLink>
          <Divider />
          <NavLink className="view-button" to="/regression">
            <Icon icon="regression-chart" />
          </NavLink>
          <NavLink className="view-button" to="/functional-distance">
            <Icon icon="heatmap" />
          </NavLink>
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
