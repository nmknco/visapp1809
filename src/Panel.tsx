import * as React from 'react';

interface PanelProps {
  readonly heading: string,
  readonly noPadding?: boolean,
}

class Panel extends React.Component<PanelProps & React.HTMLAttributes<HTMLDivElement>> {
  render() {
    return (
      <div className={"card border-light m-1 " + this.props.className}>
        <div className="card-header"> {this.props.heading} </div>
        <div className={"card-body" + (this.props.noPadding ? " p-0" : " p-1")}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export { Panel };