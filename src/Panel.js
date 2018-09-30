import React, { Component } from 'react';

class Panel extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={"card border-light m-1 " + this.props.className}>
        <div className="card-header"> {this.props.heading} </div>
        <div className="card-body p-1">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export { Panel };