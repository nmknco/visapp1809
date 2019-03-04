import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { App } from './App';
import { Data, DataEntry } from './commons/types';


const INITIAL_FILE = 'cars.json'

interface AppContainerState {
  fileName: string;
  data: Data;
}

class AppContainer extends React.PureComponent<{}, AppContainerState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      fileName: INITIAL_FILE,
      data: [], // instead of null to show the UI without typing issues
    }
  }

  componentDidMount() {
    this.handleUpdateDataFile(this.state.fileName);
  }

  componentWillUnmount() {
    // Should cancel data-loading promise to prevent setState() call
    console.log('App will unmount');
  }

  private handleUpdateDataFile = (fileName: string) => {
    fetch(`data/${fileName}`)
    .then(res => res.json())
    .then(data => {
      // console.log(data);
      data = data.filter((d: object, i: number) => i % 2 === 0); // dev. Do this first so that id_extra is correct
      // console.table(data);
      this.setState({
        fileName,
        data: this.preProcess(data)
      });
    });
  };

  render() {
    return  (
      <div className="app-container">
        <App
          data={this.state.data}
          fileName={this.state.fileName}
          onUpdateDataFile={this.handleUpdateDataFile}
        />
      </div>
    );
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
