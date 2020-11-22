import React, { Component } from 'react';
import Scene from './Scene';
export const eel = window.eel
eel.set_host('ws://localhost:8080')
eel.server_log('In da cockpit')

class App extends Component {
  render() {
    return (
      <div>
        <Scene />
      </div>
    );
  }
}

export default App;
