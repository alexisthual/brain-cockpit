import React, { Component } from "react";

import { eel } from "App";

interface IBSCutsProps {
  clickedVoxelCallback?: any;
  contrast: string;
  tThreshold: number;
  subject: string;
  task: string;
}

interface BrainSpriteParams {
  canvas: string;
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
  contrast: string;
  tThreshold: number;
  task: string;
  subject: string;

  constructor(props: IBSCutsProps) {
    super(props);
    this.state = {};
    this.brainsprite_object = {};
    this.contrast = this.props.contrast;
    this.tThreshold = this.props.tThreshold;
    this.task = this.props.task;
    this.subject = this.props.subject;
    this.onMouseClick = this.onMouseClick.bind(this);
  }

  componentDidMount() {
    const canvas = document.getElementById("3Dviewer") as HTMLCanvasElement;
    if (canvas !== undefined) {
      canvas.addEventListener("click", this.onMouseClick, false);
    }
    eel.update_glm(this.subject, this.task)((success: string) => {
      if (success === "Loaded") {
        this.updateAnat();
        this.updateTMap();
        this.updateCMap();
        this.updateBrainsprite();
      }
    });
  }

  updateAnat() {
    console.log("updating anat");
    eel.get_brainsprite_anat()((bg_base64: string) => {
      const bg = document.getElementById("spriteImg") as HTMLImageElement;
      bg.src = "data:image/png;base64," + bg_base64
    });
  }
  updateCMap() {
    eel.get_brainsprite_cmap()((cm_base64: string) => {
      const cm = document.getElementById("colorMap") as HTMLImageElement;
      cm.src = "data:image/png;base64," + cm_base64
    });
  }
  updateTMap() {
    eel.get_brainsprite_tmap()((stat_map_base64: string) => {
      const stat_map = document.getElementById("overlayImg") as HTMLImageElement;
      stat_map.src = "data:image/png;base64," + stat_map_base64
    });
  }
  updateBrainsprite() {
    eel.get_brainsprite_params()((params: BrainSpriteParams) => {
      setTimeout(() => this.brainsprite_object = brainsprite(params), 100);
    });

  }

  componentDidUpdate(prevProps: IBSCutsProps) {
    if (this.props.contrast !== prevProps.contrast ||
      this.props.tThreshold !== prevProps.tThreshold) {
      this.contrast = this.props.contrast;
      this.tThreshold = this.props.tThreshold;
      eel.update_contrast(this.contrast, this.tThreshold)((success: string) => {
        if (success === "Updated") {
          this.updateTMap();
          this.updateCMap();
          this.updateBrainsprite();
        }
      });
    } else if (this.props.subject !== prevProps.subject ||
                  this.props.task !== prevProps.task) {
      this.subject = this.props.subject;
      this.task = this.props.task;
      eel.update_glm(this.subject, this.task)((success: string) => {
        if (success === "Loaded") {
          this.updateAnat();
          this.updateTMap();
          this.updateCMap();
          this.updateBrainsprite();
        }
      });
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
