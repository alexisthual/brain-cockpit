import React, { Component } from "react";
import Scene from "./Scene";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import HorizontalBar from "./components/horizontalBar";
import "./App.css";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");
eel.server_log("In da cockpit");

interface IAppState {
  labels: string[];
  contrasts: number[];
}

class App extends Component {
  public state: IAppState = {
    labels: [],
    contrasts: [],
  };

  componentDidMount() {
    eel.get_contrast_labels()((labels: string[]) => {
      this.setState({
        labels,
      });
    });
  }

  public updateContrasts = (voxelIndex: number) => {
    eel.explore_voxel(voxelIndex)((contrasts: number[]) => {
      this.setState({
        contrasts,
      });
    });
  };

  render() {
    return (
      <div id="main-container">
        <div id="webgl">
          <ParentSize className="scene-container" debounceTime={10}>
            {({ width: sceneWidth, height: sceneHeight }) => (
              <Scene
                clickedVoxelCallback={this.updateContrasts}
                width={sceneWidth}
                height={sceneHeight}
              />
            )}
          </ParentSize>
        </div>
        <div id="metrics">
          <ParentSize className="metrics-container" debounceTime={10}>
            {({ width: visWidth, height: visHeight }) => (
              <HorizontalBar
                labels={this.state.labels}
                values={this.state.contrasts}
                width={visWidth}
                height={visHeight}
              />
            )}
          </ParentSize>
        </div>
      </div>
    );
  }
}

export default App;
