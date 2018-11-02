import * as React from 'react';

import { Panel } from './Panel'

interface RecommendedPanelProps {
  readonly heading: string | JSX.Element,
  readonly onClickDismissAll?: () => void,
}

class RecommendedPanel extends React.PureComponent<RecommendedPanelProps & React.HTMLAttributes<HTMLDivElement>> {

  render() {
    const headingWithCancel = (
      <div className="w-100 d-flex justify-content-between align-items-center">
        <div>{this.props.heading}</div>
        <i className="fas fa-times mr-1" title="Cancel" onClick={this.props.onClickDismissAll} />
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

export { RecommendedPanel };