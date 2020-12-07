import React, { Component, RefObject, createRef } from "react";

import { eel } from "App";

import * as d3 from "d3";
import Plot from "react-plotly.js";

import "./style.scss";

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

interface ISliceProps {
  clickedVoxelCallback?: any;
  data: number[][];
  id: string;
}

class Slice extends Component<ISliceProps, {}> {
  data: number[][];
  id: string;
  svgRef: RefObject<SVGSVGElement>;
  // This is poorly typed. We want : ((number * nuber) -> unit) option
  clickedVoxelCallback?: any;

  constructor(props: ISliceProps) {
    super(props);
    this.data = this.props.data;
    this.id = this.props.id;
    this.clickedVoxelCallback = this.props.clickedVoxelCallback;
    this.svgRef = createRef<SVGSVGElement>();
    this.onMouseClick = this.onMouseClick.bind(this);
  }

  componentDidMount() {
    this.renderHeatmap(this.props.data);
  }

  renderHeatmap(data: number[][]) {
    if (this.svgRef.current) {
      const tic = performance.now();
      // Surely we can do better?
      this.svgRef.current.innerHTML = "";
      this.svgRef.current.addEventListener("click", this.onMouseClick, false);
      const height = this.svgRef.current.clientHeight;
      const width = this.svgRef.current.clientWidth;
      const size = Math.min(width, height);
      let range_min = Number.MAX_VALUE;
      let range_max = Number.MIN_VALUE;
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (data[i][j] < range_min) {
            range_min = data[i][j];
          }
          if (data[i][j] > range_max) {
            range_max = data[i][j];
          }
        }
      }
      const toc = performance.now();
      let x = d3.scale
        .linear()
        .range([0, size]) // 200 should change for the width/height
        .domain([0, data[0].length]);

      let y = d3.scale.linear().range([0, size]).domain([0, data.length]);

      let colorScale = d3.scale
        .linear<string>()
        .domain([range_min, range_max])
        .range(["#000000", "#ffffff"]);

      let row = d3
        .select(this.svgRef.current)
        .selectAll(".row")
        .data(data)
        .enter()
        .append("svg:g")
        .attr("class", "row");

      row
        .selectAll(".cell")
        .data(function (d, i) {
          return d.map(function (a: number) {
            return { value: a, row: i };
          });
        })
        .enter()
        .append("svg:rect")
        .attr("class", "cell")
        .attr("y", (d, i) => size - x(i))
        // @ts-ignore but I don't know what I can do here...?
        .attr("x", (d, i) => y(d.row))
        // @ts-ignore but I don't know what I can do here...?
        .attr("data-slicex", (d, i) => d.row)
        .attr("data-slicey", (d, i) => i)
        .attr("width", x(1))
        .attr("height", y(1))
        // @ts-ignore
        .style("fill", function (d) {
          return colorScale(d.value);
        });
      console.log("Delta from call to d3:", toc - tic);
      console.log("d3 render time", performance.now() - toc);
    }
  }

  componentDidUpdate(prevProps: ISliceProps) {
    this.renderHeatmap(this.props.data);
  }

  onMouseClick(event: MouseEvent) {
    if (event.target) {
      const data = (event.target as HTMLElement).dataset;
      const slice_x = data.slicex;
      const slice_y = data.slicey;
      if (slice_x && slice_y) {
        this.clickedVoxelCallback(parseInt(slice_x), parseInt(slice_y));
      } else {
        console.warn("Where did the user click then?", event.target);
      }
    }
  }

  render() {
    return <svg ref={this.svgRef} id={this.id}></svg>;
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
      console.log("Delta to get data from python:", toc - tic);
      console.log(
        "Delta to setState (and presumably render?) id:",
        performance.now() - toc
      );
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
    this.update_coronal(this.slices[0]);
    this.update_sagital(this.slices[1]);
    this.update_horizontal(this.slices[2]);
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
  //<Slice id="sagital"
  //data={this.state.sagital}
  //clickedVoxelCallback={(x : number, y:number) => { this.update_coronal(x) ; this.update_horizontal(y) }}
  ///>
  //<Slice id="coronal"
  //data={this.state.coronal}
  //clickedVoxelCallback={(x : number, y:number) => { this.update_sagital(x) ; this.update_horizontal(y) }}
  ///>
  //<Slice id="horizontal"
  //data={this.state.horizontal}
  //clickedVoxelCallback={(x : number, y:number) => { this.update_coronal(x) ; this.update_sagital(y) }}
  ///>

  render() {
    return (
      <>
        <Plot
          data={this.plotlyDataFromData(this.state.sagital) as any}
          layout={this.defaultLayout as any}
        />
        <Plot
          data={this.plotlyDataFromData(this.state.coronal) as any}
          layout={this.defaultLayout as any}
        />
        <Plot
          data={this.plotlyDataFromData(this.state.horizontal) as any}
          layout={this.defaultLayout as any}
          onClick={(e) => console.log(e)}
        />
      </>
    );
  }
}

export default Slices;
