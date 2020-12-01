import { Button, Icon, NonIdealState } from "@blueprintjs/core";
import React from "react";
import {
  BrowserRouter as Router,
  Link,
  NavLink,
  Route,
  Switch,
} from "react-router-dom";

import SurfaceExplorer from "views/surface";
import RegressionExplorer from "views/regression";
import CutsExplorer from "views/cuts";
import "./App.scss";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");

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
          <NavLink className="view-button" to="/regression">
            <Icon icon="regression-chart" />
          </NavLink>
          <NavLink className="view-button" to="/volume">
            <Icon icon="cube" />
          </NavLink>
        </div>
        <Switch>
          <Route exact path="/">
            <SurfaceExplorer />
          </Route>
          <Route exact path="/regression">
            <RegressionExplorer />
          </Route>
          <Route exact path="/cuts">
            <CutsExplorer />
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
