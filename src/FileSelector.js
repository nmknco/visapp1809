import React, { Component } from 'react';

class FileSelector extends Component {
  render() {
    return (
      <div className="file_panel card border-light m-1">
        <div className="card-header"> Data </div>
        <div className="card-body p-1"> <div>cars.json</div> </div>
      </div>
    )
  }
}

export { FileSelector }