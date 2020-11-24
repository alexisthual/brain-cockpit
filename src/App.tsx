import React, { Component } from "react";
import Scene from "./Scene";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import HorizontalBar from "./components/horizontalBar";
import "./App.scss";

export const eel = window.eel;
eel.set_host("ws://localhost:8080");

interface IAppState {
  labels: string[];
  contrasts: number[];
  surfaceMap?: number[];
}

class App extends Component {
  public state: IAppState = {
    labels: [],
    contrasts: [],
    surfaceMap: undefined,
  };

  componentDidMount() {
    eel.get_contrast_labels()((labels: string[]) => {
      this.setState({
        labels,
      });
    });

    eel.get_left_contrast(0)((contrastMap: number[]) => {
      this.setState({
        surfaceMap: contrastMap,
      });
    });
  }

  public updateContrast = (contrastIndex: number) => {
    eel.get_left_contrast(contrastIndex)((contrastMap: number[]) => {
      this.setState({
        surfaceMap: contrastMap,
      });
    });
  };

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
                surfaceMap={this.state.surfaceMap}
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
                clickedLabelCallback={(contrastIndex: number) => {
                  this.updateContrast(contrastIndex);
                }}
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
