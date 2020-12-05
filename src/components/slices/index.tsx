import React, { Component } from "react";

import { eel } from "App";

import * as d3 from "d3";

import "./style.scss";

interface BrainSlices {
  sagital: number[][];
  coronal: number[][];
  horizontal: number[][];
}

interface ISlicesProps {
  clickedVoxelCallback?: any;
  contrast: string;
  tThreshold: number;
  subject: string;
  task: string;
  mni: [number, number, number]
  slices: [number, number, number]
}

interface ISliceProps {
  data: number[][];
  id: string;
}

class Slice extends Component<ISliceProps, {}> {
  data: number[][];
  id: string;

  constructor(props: ISliceProps) {
    super(props);
    this.data = this.props.data;
    this.id = this.props.id;
  }

  componentDidMount() {
    this.renderHeatmap();
  }

  renderHeatmap() {
    let x = d3.scale.linear()
        .range([0, 200]) // 200 should change for the width/height
        .domain([0,this.data[0].length]);

    let y = d3.scale.linear()
        .range([0, 200])
        .domain([0,this.data.length]);

    let colorScale = d3.scale.linear<string>()
                     .domain([0, 1000])
                     .range(["#000000", "#ffffff"]);

    let row = d3.select("#"+this.id).selectAll(".row")
               .data(this.data)
             .enter().append("svg:g")
               .attr("class", "row");

    row.selectAll(".cell")
          .data(function (d,i) {return d.map(function(a:number){return {value: a, row: i};})})
        .enter().append("svg:rect")
          .attr("class", "cell")
          .attr("y", function(d, i) { return 200 - x(i); })
          // @ts-ignore but I don't know what I can do here...?
          .attr("x", function(d, i) { return y(d.row); })
          .attr("width", x(1))
          .attr("height", y(1))
          // @ts-ignore
          .style("fill", function(d) { return colorScale(d.value); });
  }

  componentDidUpdate(prevProps: ISliceProps) {
    this.data = this.props.data;
    this.id = this.props.id;
    if (this.data[0].length === 0) {
      console.log("How come?! It's not empty on the other side, when I update :-(");
    }
    this.renderHeatmap();
  }

  render() {
    return (
      <canvas id={this.id}> </canvas>
    )
  }
}

class Slices extends Component<ISlicesProps, {}> {
  container?: any;
  contrast: string;
  tThreshold: number;
  task: string;
  subject: string;
  mni: [number, number, number]
  slices: [number, number, number]
  slices_content: BrainSlices

  constructor(props: ISlicesProps) {
    super(props);
    this.state = {};
    this.contrast = this.props.contrast;
    this.tThreshold = this.props.tThreshold;
    this.task = this.props.task;
    this.subject = this.props.subject;
    this.mni = this.props.mni;
    this.slices = this.props.slices;
    this.slices_content = {sagital: [[]], coronal: [[]], horizontal: [[]]}
    this.onMouseClick = this.onMouseClick.bind(this);
  }

  componentDidMount() {
    eel.update_glm(this.subject, this.task)((success: string) => {
      if (success === "Loaded") {
        eel.update_contrast(this.contrast, this.tThreshold)((success: string) => {
          if (success === "Updated") {
            this.update_canvases();
          }
        });
      }
    });
  }

  update_canvases() {
    eel.get_slices(this.slices)((slices_values: BrainSlices) => {
      this.slices_content.sagital = slices_values.sagital;
      this.slices_content.coronal = slices_values.coronal;
      this.slices_content.horizontal = slices_values.horizontal;
      if (this.slices_content.sagital[0].length > 0) {
        console.log("Yup, not empty here");
        console.log("OK, so this means that the assignements up there don't trigger an update; but I don't know why");
        console.log("There's some (im)mutability issue going on. I want setters and useState for these properties :-(");
      }
    })
  }

  componentDidUpdate(prevProps: ISlicesProps) {
    if (this.props.contrast !== prevProps.contrast ||
      this.props.tThreshold !== prevProps.tThreshold) {
      this.contrast = this.props.contrast;
      this.tThreshold = this.props.tThreshold;
      eel.update_glm(this.subject, this.task)((success: string) => {
        if (success === "Loaded") {
          eel.update_contrast(this.contrast, this.tThreshold)((success: string) => {
            if (success === "Updated") {
              this.update_canvases();
            }
          });
        }
      });
    } else if (this.props.subject !== prevProps.subject ||
                  this.props.task !== prevProps.task) {
      eel.update_glm(this.subject, this.task)((success: string) => {
        if (success === "Loaded") {
          eel.update_contrast(this.contrast, this.tThreshold)((success: string) => {
            if (success === "Updated") {
              this.update_canvases();
            }
          });
        }
      });
    }
  }

  onMouseClick(event: MouseEvent) {
    console.log(event);
  }

  render() {
    return (
      <>
        <Slice id="sagital" data={this.slices_content.sagital}/>
        <Slice id="coronal" data={this.slices_content.coronal}/>
        <Slice id="horizontal" data={this.slices_content.horizontal}/>
      </>
    );
  }
}

export default Slices;
