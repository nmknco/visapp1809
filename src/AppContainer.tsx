import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { App } from './App';
import { Data } from './commons/types';

interface AppContainerState {
  data: Data,
}

class AppContainer extends React.Component<{}, AppContainerState> {
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
      // data = data.filter((d: object, i: number) => i % 5 === 0); // dev. Do this first so that id_extra is correct
      // console.table(data);

      data = this.preProcess(data);
      this.setState({data});
    });
  }

  componentWillUnmount() {
    // Should cancel data-loading promise to prevent setState() call
    console.log('App will unmount');
  }

  render() {
    return <div><App data={this.state.data} /></div>;
  }

  private preProcess = (data: Data): Data => {
    return data.filter(d => {
      const v = Object.values(d);
      return !v.includes(null) && !v.includes(undefined); 
    }).map((d, i) => {
      return { ...d, __id_extra__: i };
    });
  };
  
}

export default DragDropContext(HTML5Backend)(AppContainer);
