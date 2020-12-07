import React, { Component } from "react";

import { eel } from "App";

import Plot from "react-plotly.js";

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
  index_sagital: number;
  index_coronal: number;
  index_horizontal: number;
}

class Slices extends Component<ISlicesProps, ISlicesState> {
  container?: any;
  contrast: string;
  tThreshold: number;
  task: string;
  subject: string;
  mni: [number, number, number];
  slices: [number, number, number];
  defaultLayout: Object;

  constructor(props: ISlicesProps) {
    super(props);
    this.state = {
      sagital: [[]],
      coronal: [[]],
      horizontal: [[]],
      index_coronal: this.props.slices[0],
      index_sagital: this.props.slices[1],
      index_horizontal: this.props.slices[2],
    };
    this.contrast = this.props.contrast;
    this.tThreshold = this.props.tThreshold;
    this.task = this.props.task;
    this.subject = this.props.subject;
    this.mni = this.props.mni;
    this.slices = this.props.slices;
    this.defaultLayout = {
      margin: { l: 0, r: 0, b: 0, t: 0 },
      yaxis: { scaleanchor: "x", scaleratio: 1 },
      plot_bgcolor: "#000000",
    };
  }

  plotlyDataFromData(data: number[][]) {
    return [
      { z: data, type: "heatmap", colorscale: "Greys", showscale: false },
    ];
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
    const tic = performance.now();
    eel.get_slice_coronal(slice)((slices_values: number[][]) => {
      const toc = performance.now();
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

  handle_click(who: Cuts, event: any) {
    const [clicked_y, clicked_x] = event.points[0].pointIndex;
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
        <Plot
          data={this.plotlyDataFromData(this.state.sagital) as any}
          layout={this.defaultLayout as any}
          onClick={(e) => this.handle_click(Cuts.Sagital, e)}
        />
        <Plot
          data={this.plotlyDataFromData(this.state.coronal) as any}
          layout={this.defaultLayout as any}
          onClick={(e) => this.handle_click(Cuts.Coronal, e)}
        />
        <Plot
          data={this.plotlyDataFromData(this.state.horizontal) as any}
          layout={this.defaultLayout as any}
          onClick={(e) => this.handle_click(Cuts.Horizontal, e)}
        />
      </>
    );
  }
}

export default Slices;
