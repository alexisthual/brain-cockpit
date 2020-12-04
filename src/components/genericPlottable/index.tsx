import React, { Component } from "react";

import Plot from 'react-plotly.js';

import "./style.scss";

interface Plottable {
  engine: string;
  content_raw: string;
}

interface IGenericPlottableProps {
  plottableList: Plottable[];
}


interface IMplD3Props {
  content: Object;
}

class MplD3 extends Component<IMplD3Props, {}> {
  content: Object;

  constructor(props: IMplD3Props) {
    super(props);
    this.content = this.props.content;
  }

  componentDidMount() {
    const fig = document.getElementById("fig");
    if (fig !== null) {
      fig.innerHTML = "";
    }
    this.content = this.props.content;
    mpld3.draw_figure("fig", this.content)
  }

  componentDidUpdate(prevProps: IMplD3Props) {
    const fig = document.getElementById("fig");
    if (fig !== null) {
      fig.innerHTML = "";
    }
    this.content = this.props.content;
    mpld3.draw_figure("fig", this.content)
  }

  render() {
    return (
      <div id="fig">
      </div>
    )
  }
}

class GenericPlottable extends Component<IGenericPlottableProps, {}> {
  plottableList: Plottable[];

  constructor(props: IGenericPlottableProps) {
    super(props);
    this.state = {};
    this.plottableList = this.props.plottableList.filter(e => e !== null);
  }

  componentDidMount() {
    this.plottableList = this.props.plottableList.filter(e => e !== null);
  }

  componentDidUpdate(prevProps: IGenericPlottableProps) {
    this.plottableList = this.props.plottableList.filter(e => e !== null);
  }

  render() {
    const plots = this.plottableList.map((e,i) => {
      if (e.engine === "plotly") {
        const content = JSON.parse(e.content_raw);
        content.layout.plot_bgcolor="rgba(0, 0, 0, 0)";
        content.layout.paper_bgcolor="rgba(0, 0, 0, 0)";
        content.layout.margin={l:5, r:5, t:5, b:5};
        content.layout.font={color:"white", size:16};
        return (
          <Plot
            data={content.data}
            layout={content.layout}
            key={"callback-" + i}
          />
        );
      } else if (e.engine === "mpld3") {
        return (
          <MplD3
            content={e.content_raw}
            key={"callback-" + i}
          />
        );
      }
      else {
        return (
          <div><p>Not implemented yet</p></div>
        )
      }
    });

    return (
      <>{plots}</>
    );
  }
}

export default GenericPlottable;
export type { Plottable };
