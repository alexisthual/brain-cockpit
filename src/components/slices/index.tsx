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
  canvasRef: RefObject<HTMLCanvasElement>;

  constructor(props: ICanvasSliceProps) {
    super(props);
    this.anat = this.props.anat;
    this.canvasRef = createRef<HTMLCanvasElement>();
    this.clickCallback = this.props.clickCallback;
    this.id = this.props.id;
    this.crosshair = this.props.crosshair;
  }

  componentDidMount() {
    this.updateHeatmap(this.props.anat, this.props.crosshair);
  }
  componentDidUpdate() {
    this.updateHeatmap(this.props.anat, this.props.crosshair);
  }

  updateHeatmap(anat: number[][], crosshair: [number, number]) {
    const canvas = this.canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const [height, width] = [canvas.clientHeight, canvas.clientWidth];
      canvas.height = height;
      canvas.width = width;
      const size = Math.min(height, width);
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        const numVox_x = anat.length;
        const numVox_y = anat[0].length;
        let range_min = Number.MAX_VALUE;
        let range_max = Number.MIN_VALUE;
        const rect_width = size / numVox_x;
        const rect_height = size / numVox_y;
        // Determine range for max contrast
        for (let i = 0; i < numVox_x; i++) {
          for (let j = 0; j < numVox_y; j++) {
            if (anat[i][j] < range_min) {
              range_min = anat[i][j];
            }
            if (anat[i][j] > range_max) {
              range_max = anat[i][j];
            }
          }
        }
        // Paint the brain
        for (let i = 0; i < numVox_x; i++) {
          for (let j = 0; j < numVox_y; j++) {
            const color = Math.floor(
              (255 * (anat[i][j] - range_min)) / (range_max - range_min)
            );
            ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";
            ctx.fillRect(
              i * rect_width,
              size - j * rect_height,
              rect_width,
              rect_height
            );
          }
        }
        // Paint the crosshair
        ctx.fillStyle = "rgba(50, 50, 255, 0.5";
        ctx.fillRect(
          crosshair[0] * rect_width + rect_width / 4,
          0,
          rect_width / 2,
          size
        );
        ctx.fillRect(
          0,
          size - crosshair[1] * rect_height + rect_height / 4,
          size,
          rect_height / 2
        );
        canvas.onclick = (e) => {
          this.clickCallback([
            Math.floor(e.offsetX / rect_width),
            Math.floor((size - e.offsetY) / rect_height),
          ]);
        };
      }
    }
  }

  render() {
    return <canvas ref={this.canvasRef} id={this.id} />;
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

  update_coronal(slice: number) {
    eel.get_slice_coronal(slice)((slices_values: number[][]) => {
      this.setState({ coronal: slices_values });
    });
  }

  update_sagital(slice: number) {
    eel.get_slice_sagital(slice)((slices_values: number[][]) => {
      this.setState({ sagital: slices_values });
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
    if (who === Cuts.Sagital) {
      console.log("sagital");
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
    this.update_all();
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
