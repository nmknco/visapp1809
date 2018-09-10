import React, { Component } from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { Attributes } from './Attributes';
import { Encodings } from './Encodings'
import { MainPlot } from './MainPlot'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      plotConfig: {},
    }
  }

  componentWillMount() {
    fetch('data/cars.json')
    .then(res => res.json())
    .then(data => {
      data = this._preProcess(data);
      data = data.filter((d, i) => i % 10 === 0);
      console.table(data);
      this.setState({data});
    });
  }

  _preProcess = (data) => {
    return data.filter(d => {
      const v = Object.values(d);
      return !v.includes(null) && !v.includes(undefined); 
    }).map((d, i) => {
      return { ...d, __id_extra__: i };
    });
  }

  setPlotConfig = (key, value) => {
    const plotConfig = { ...this.state.plotConfig };
    plotConfig[key] = value;
    this.setState({plotConfig});
  }

  render() {
    const attributes = this.state.data && this.state.data.length > 0 ? 
      Object.keys(this.state.data[0]).filter(d => d !== '__id_extra__') : [];
    return (
      <div className="App" style={{display:'flex'}}>
        <div style={{width: '300px'}}>
          <div className="my-2 mx-2">-</div>
          <Attributes attributes={attributes} />
          <Encodings setPlotConfig={this.setPlotConfig} />
        </div>
        <MainPlot { ...this.state } />
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
