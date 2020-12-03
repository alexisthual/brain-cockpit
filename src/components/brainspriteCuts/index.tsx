import React, { Component } from "react";

import { eel } from "App";

interface IBSCutsProps {
  clickedVoxelCallback?: any;
  contrast: string;
  tThreshold: number;
}

interface BrainSpriteParams {
  canvas: string;
}

interface BrainSpriteJson {
  bg_base64?: string;
  cm_base64?: string;
  stat_map_base64?: string;
  params?: BrainSpriteParams;
}

interface BrainCoordinates {
  X: number;
  Y: number;
  Z: number;
}

interface BrainSpriteObject {
  coordinatesSlice?: BrainCoordinates;
  numSlice?: BrainCoordinates;
}

class BSCuts extends Component<IBSCutsProps, {}> {
  container?: any;
  brainsprite_object: BrainSpriteObject;
  brainsprite_json: BrainSpriteJson;
  contrast: string;
  tThreshold: number;

  constructor(props: IBSCutsProps) {
    super(props);
    this.state = {};
    this.brainsprite_json = {};
    this.brainsprite_object = {};
    this.contrast = this.props.contrast;
    this.tThreshold = this.props.tThreshold;
    this.onMouseClick = this.onMouseClick.bind(this);
  }

  componentDidMount() {
    this.updateBrainsprite();
    const canvas = document.getElementById("3Dviewer") as HTMLCanvasElement;
    if (canvas !== undefined) {
      canvas.addEventListener("click", this.onMouseClick, false);
    }
  }

  updateBrainsprite() {
    eel.get_brainsprite(this.contrast, this.tThreshold)((bs_json: BrainSpriteJson) => {
      const bg = document.getElementById("spriteImg") as HTMLImageElement;
      const cm = document.getElementById("colorMap") as HTMLImageElement;
      const stat_map = document.getElementById("overlayImg") as HTMLImageElement;
      bg.src = "data:image/png;base64," + (bs_json.bg_base64)
      cm.src = "data:image/png;base64," + (bs_json.cm_base64)
      stat_map.src = "data:image/png;base64," + (bs_json.stat_map_base64)
      this.brainsprite_json = bs_json;
      // This is a hack around a proper event that images are loaded:
      setTimeout(() => this.brainsprite_object = brainsprite(bs_json.params), 100);
    });

  }

  componentDidUpdate(prevProps: IBSCutsProps) {
    if (this.props.contrast !== prevProps.contrast ||
      this.props.tThreshold !== prevProps.tThreshold) {
      this.contrast = this.props.contrast;
      this.tThreshold = this.props.tThreshold;
      this.updateBrainsprite();
    }
  }

  onMouseClick(event: MouseEvent) {
    this.props.clickedVoxelCallback(this.brainsprite_object);
  }

  render() {
    return (
      <canvas id="3Dviewer">
        <img id="spriteImg" alt=""/>
        <img id="colorMap" alt=""/>
        <img id="overlayImg" alt=""/>
      </canvas>
    );
  }
}

export default BSCuts;
export type { BrainSpriteObject };
