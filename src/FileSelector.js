import React, { Component } from 'react';

import { Panel } from './Panel';

class FileSelector extends Component {
  render() {
    return (
      <Panel 
        className="file_selector"
        heading="Data"
      >
        <div className="card-body p-1"> <div>cars.json</div> </div>
      </Panel>
    );
  }
}

export { FileSelector }