import React, { Component } from 'react';

import { Panel } from './Panel';

class FileSelector extends Component {
  render() {
    return (
      <Panel 
        className="file_selector"
        heading="Data"
      >
        <div>cars.json</div>
      </Panel>
    );
  }
}

export { FileSelector }