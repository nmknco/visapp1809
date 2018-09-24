import React, { Component } from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { Attributes } from './Attributes';
import { MainPlot } from './MainPlot';
import { FileSelector } from './FileSelector';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      activeEntry: {},
    }
    
    this.attributes = [];
  }

  componentWillMount() {
    fetch('data/cars.json')
    .then(res => res.json())
    .then(data => {
      data = this._preProcess(data);
      this._updateAttributesInfo(data);
      
      data = data.filter((d, i) => i % 10 === 0);
      // console.table(data);
      
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

  _updateAttributesInfo = (data) => {
    if (data && data.length > 0) {
      const d0 = data[0];
      for (const attr of Object.keys(d0)) {
        if (attr !== '__id_extra__') {
          this.attributes.push({
            name: attr,
            type: (typeof d0[attr] === 'number') ? 'number' : 'other',
          });
        }
      }
    }
  }

  setActiveEntry = (entry) => {
    this.setState((prevState) => ({ activeEntry: entry, }));
  };

  render() {
    return (
      <div className="app d-flex m-2">
        <div className="left_panel">
          <FileSelector />
          <Attributes 
            attributes={this.attributes}  
            activeEntry={this.state.activeEntry}
          /> 
        </div>
        <div className="">
          <MainPlot
            data={this.state.data}
            onDataPointHover={this.setActiveEntry}
          />
        </div>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
