import * as React from 'react';

import { FAButton } from './FAButton';

interface PanelProps {
  readonly heading: string | JSX.Element,
  readonly noPadding?: boolean,
  readonly noMargin?: boolean
}

class Panel extends React.Component<PanelProps & React.HTMLAttributes<HTMLDivElement>> {
  // Always rerender because of props.children
  
  render() {
    // console.log('Panel render');
    return (
      <div className={`card border-light m-${this.props.noMargin ? 0 : 1} ${this.props.className}`}>
        <div className="card-header"> {this.props.heading} </div>
        <div className={"card-body" + (this.props.noPadding ? " p-0" : " p-1")}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

interface PanelWithDismissProps extends PanelProps {
  readonly onClickDismissAll?: () => void,
}

class PanelWithDismiss extends React.Component<PanelWithDismissProps & React.HTMLAttributes<HTMLDivElement>> {
  // Always rerender because of props.children

  render() {
    const headingWithCancel = (
      <div className="w-100 d-flex justify-content-between align-items-center">
        <div>{this.props.heading}</div>
        <FAButton
            faName="times"
            onClick={this.props.onClickDismissAll}
            hoverEffect={true}
            title="Dismiss All Recommendations"
        />
      </div>
    )

    return (
      <Panel
        className="recommended-filters-panel"
        heading={headingWithCancel}
      >
        {this.props.children}
      </Panel>
    )
  }
}


export { Panel, PanelWithDismiss };