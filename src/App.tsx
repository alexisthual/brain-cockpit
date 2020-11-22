import React, { Component } from 'react';
import Scene from './Scene';
export const eel = window.eel
eel.set_host('ws://localhost:8080')
eel.server_log('In da cockpit')

interface IAppState {
  labels: string[]
  contrasts: number[]
}

class App extends Component {
  public state: IAppState = {
    labels: [],
    contrasts: [],
  }

  componentDidMount() {
    eel.get_contrast_labels()((labels: string[]) => {
      this.setState({
        labels
      })
    })
  }

  public updateContrasts = (voxelIndex: number) => {
    eel.explore_voxel(voxelIndex)((contrasts: number[]) => {
      this.setState({
        contrasts
      })
    })
  }

  render() {
    return (
      <div>
        <Scene />
      </div>
    );
  }
}

export default App;
