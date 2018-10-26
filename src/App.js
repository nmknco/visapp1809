import React, { Component } from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { MainPlot } from './MainPlot';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
    }
  }

  componentWillMount() {
    fetch('data/cars.json')
    .then(res => res.json())
    .then(data => {
      data = data.filter((d, i) => i % 5 === 0); // dev. Do this first so that id_extra is correct
      // console.table(data);

      data = this._preProcess(data);
      
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
  };

  render() {
    return (
      <div className="app d-flex m-2">
          <MainPlot data={this.state.data} />
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
