import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { App } from './App';
import { Data, DataEntry } from './commons/types';

interface AppContainerState {
  data: Data,
}

class AppContainer extends React.PureComponent<{}, AppContainerState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: [], // instead of null to show the UI without typing issues
    }
  }

  componentDidMount() {
    fetch('data/cars.json')
    .then(res => res.json())
    .then(data => {
      data = data.filter((d: object, i: number) => i % 2 === 0); // dev. Do this first so that id_extra is correct
      // console.table(data);
      this.setState({data: this.preProcess(data)});
    });
  }

  componentWillUnmount() {
    // Should cancel data-loading promise to prevent setState() call
    console.log('App will unmount');
  }

  render() {
    return <div><App data={this.state.data} /></div>;
  }

  private preProcess = (data: object[]): Data => {
    return data.filter(d => {
      // remove entries with missing values
      const v = Object.values(d);
      return !v.includes(null) && !v.includes(undefined); 
    }).map((d) => {
      // stringify non-number fields
      const dcopy = {};
      for (let [k, v] of Object.entries(d)) {
        if (typeof v !== 'number' && typeof v !== 'string') {
          v = v.toString();
        }
        dcopy[k] = v;
      }
      return dcopy;
    }).map((d, i): DataEntry => {
      // add an integer index
      return { ...d, __id_extra__: i.toString() } as DataEntry;
    });
  };
  
}

export default DragDropContext(HTML5Backend)(AppContainer);
