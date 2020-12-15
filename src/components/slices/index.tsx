import React, { Component, RefObject, createRef } from "react";

import { eel } from "App";

import "./style.scss";

enum Cuts {
  Sagital,
  Coronal,
  Horizontal,
}

interface ISlicesProps {
  contrast: string;
  tThreshold: number;
  subject: string;
  task: string;
  mni: [number, number, number];
  slices: [number, number, number];
}

interface ISlicesState {
  sagital: number[][];
  coronal: number[][];
  horizontal: number[][];
}

interface ICanvasSliceProps {
  anat: number[][];
  id: string;
  crosshair: [number, number];
  clickCallback?: any;
}

class CanvasSlice extends Component<ICanvasSliceProps, {}> {
  anat: number[][];
  clickCallback?: any;
  id: string;
  crosshair: [number, number];
  divRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasCrossRef: RefObject<HTMLCanvasElement>;
  currentlyClicked: boolean;
  rectSize: [number, number];

  constructor(props: ICanvasSliceProps) {
    super(props);
    this.anat = this.props.anat;
    this.canvasRef = createRef<HTMLCanvasElement>();
    this.divRef = createRef<HTMLDivElement>();
    this.canvasCrossRef = createRef<HTMLCanvasElement>();
    this.clickCallback = this.props.clickCallback;
    this.id = this.props.id;
    this.currentlyClicked = false;
    this.crosshair = this.props.crosshair;
    this.rectSize = [NaN, NaN];
  }

  componentDidMount() {
    this.updateHeatmap(this.props.anat, this.props.crosshair, true);
    this.anat = this.props.anat;
  }
  componentDidUpdate() {
    this.updateHeatmap(
      this.props.anat,
      this.props.crosshair,
      this.props.anat !== this.anat
    );
    this.anat = this.props.anat;
  }

  updateHeatmap(
    anat: number[][],
    crosshair: [number, number],
    updateAnat: boolean
  ) {
    const canvas = this.canvasRef.current;
    const canvasCross = this.canvasCrossRef.current;
    const div = this.divRef.current;
    if (canvas && canvasCross && div) {
      const ctxCross = canvasCross.getContext("2d");

      const [height, width] = [div.clientHeight, div.clientWidth];
      canvas.height = height;
      canvas.width = width;
      canvasCross.height = height;
      canvasCross.width = width;
      const size = Math.min(height, width);
      if (updateAnat) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const numVox_x = anat.length;
          const numVox_y = anat[0].length;
          this.rectSize = [size / numVox_x, size / numVox_y];

          for (let i = 0; i < numVox_x; i++) {
            for (let j = 0; j < numVox_y; j++) {
              const color = anat[i][j];
              ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";
              ctx.fillRect(
                i * this.rectSize[0] - 0.5, // 0.5 to slightly overlap at borders
                size - j * this.rectSize[1] - 0.5,
                this.rectSize[0] + 0.5,
                this.rectSize[1] + 0.5
              );
            }
          }
        }
      }
      if (ctxCross) {
        // Paint the crosshair
        ctxCross.clearRect(0, 0, width, height);
        ctxCross.fillStyle = "rgba(50, 50, 255, 0.75)";
        ctxCross.fillRect(
          crosshair[0] * this.rectSize[0] + this.rectSize[0] / 4,
          0,
          this.rectSize[0] / 2,
          size
        );
        ctxCross.fillRect(
          0,
          size - crosshair[1] * this.rectSize[1] + this.rectSize[1] / 4,
          size,
          this.rectSize[1] / 2
        );
        canvasCross.onmousedown = (e) => {
          this.currentlyClicked = true;
          this.clickCallback([
            Math.floor(e.offsetX / this.rectSize[0]),
            Math.floor((size - e.offsetY) / this.rectSize[1]),
          ]);
        };
        canvasCross.onmouseup = (e) => {
          this.currentlyClicked = false;
        };
        canvasCross.onmousemove = (e) => {
          if (this.currentlyClicked) {
            this.clickCallback([
              Math.floor(e.offsetX / this.rectSize[0]),
              Math.floor((size - e.offsetY) / this.rectSize[1]),
            ]);
          }
        };
      }
    }
  }

  render() {
    return (
      <div id={this.id} ref={this.divRef} style={{ position: "relative" }}>
        <canvas
          ref={this.canvasRef}
          style={{ position: "absolute", top: "0", left: "0" }}
        />
        <canvas
          ref={this.canvasCrossRef}
          style={{ position: "absolute", top: "0", left: "0" }}
        />
      </div>
    );
  }
}

class Slices extends Component<ISlicesProps, ISlicesState> {
  container?: any;
  contrast: string;
  tThreshold: number;
  task: string;
  subject: string;
  mni: [number, number, number];
  slices: [number, number, number];

  constructor(props: ISlicesProps) {
    super(props);
    this.state = { sagital: [[]], coronal: [[]], horizontal: [[]] };
    this.contrast = this.props.contrast;
    this.tThreshold = this.props.tThreshold;
    this.task = this.props.task;
    this.subject = this.props.subject;
    this.mni = this.props.mni;
    this.slices = this.props.slices;
  }

  componentDidMount() {
    eel.update_glm(
      this.subject,
      this.task
    )((success: string) => {
      if (success === "Loaded") {
        eel.update_contrast(
          this.contrast,
          this.tThreshold
        )((success: string) => {
          if (success === "Updated") {
            this.update_all();
          }
        });
      }
    });
  }

  update_sagital(slice: number) {
    eel.get_slice_sagital(slice)((slices_values: number[][]) => {
      this.setState({ sagital: slices_values });
    });
  }
  update_coronal(slice: number) {
    eel.get_slice_coronal(slice)((slices_values: number[][]) => {
      this.setState({ coronal: slices_values });
    });
  }
  update_horizontal(slice: number) {
    eel.get_slice_horizontal(slice)((slices_values: number[][]) => {
      this.setState({ horizontal: slices_values });
    });
  }
  update_all() {
    this.update_sagital(this.slices[0]);
    this.update_coronal(this.slices[1]);
    this.update_horizontal(this.slices[2]);
  }

  handle_click(who: Cuts, event: [number, number]) {
    const [clicked_x, clicked_y] = event;
    //Assess to what extent we could hope to send the whole brain
    //const tic = performance.now();
    //eel.get_brain()((slices_values: any) => {
    //console.log(slices_values);
    //console.log(performance.now() - tic)
    //});
    if (who === Cuts.Sagital) {
      this.slices[1] = clicked_x;
      this.slices[2] = clicked_y;
      this.update_coronal(clicked_x);
      this.update_horizontal(clicked_y);
    }
    if (who === Cuts.Coronal) {
      this.slices[0] = clicked_x;
      this.slices[2] = clicked_y;
      this.update_sagital(clicked_x);
      this.update_horizontal(clicked_y);
    }
    if (who === Cuts.Horizontal) {
      this.slices[0] = clicked_x;
      this.slices[1] = clicked_y;
      this.update_sagital(clicked_x);
      this.update_coronal(clicked_y);
    }
  }

  componentDidUpdate(prevProps: ISlicesProps) {
    if (
      this.props.contrast !== prevProps.contrast ||
      this.props.tThreshold !== prevProps.tThreshold
    ) {
      this.contrast = this.props.contrast;
      this.tThreshold = this.props.tThreshold;
      eel.update_glm(
        this.subject,
        this.task
      )((success: string) => {
        if (success === "Loaded") {
          eel.update_contrast(
            this.contrast,
            this.tThreshold
          )((success: string) => {
            if (success === "Updated") {
              this.update_all();
            }
          });
        }
      });
    } else if (
      this.props.subject !== prevProps.subject ||
      this.props.task !== prevProps.task
    ) {
      eel.update_glm(
        this.subject,
        this.task
      )((success: string) => {
        if (success === "Loaded") {
          eel.update_contrast(
            this.contrast,
            this.tThreshold
          )((success: string) => {
            if (success === "Updated") {
              this.update_all();
            }
          });
        }
      });
    }
  }

  render() {
    return (
      <>
        <CanvasSlice
          anat={this.state.sagital}
          crosshair={[this.slices[1], this.slices[2]]}
          id={"sagital"}
          clickCallback={(e: [number, number]) =>
            this.handle_click(Cuts.Sagital, e)
          }
        />
        <CanvasSlice
          anat={this.state.coronal}
          crosshair={[this.slices[0], this.slices[2]]}
          id={"coronal"}
          clickCallback={(e: [number, number]) =>
            this.handle_click(Cuts.Coronal, e)
          }
        />
        <CanvasSlice
          anat={this.state.horizontal}
          crosshair={[this.slices[0], this.slices[1]]}
          id={"horizontal"}
          clickCallback={(e: [number, number]) =>
            this.handle_click(Cuts.Horizontal, e)
          }
        />
      </>
    );
  }
}

export default Slices;
