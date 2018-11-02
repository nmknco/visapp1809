import * as React from 'react';

import { Drop } from './Drop';
import { Panel } from './Panel';

import { FilterList } from './Filter';

import {
  HandleHoverDrop,
  HandleHoverFilter,
  HandleRemoveFilter,
  MinimapScaleMap,
} from './commons/types';

interface FiltersProps {
  readonly filterList: Readonly<FilterList>
  readonly minimapScaleMap: Readonly<MinimapScaleMap>,
  readonly onHoverFilter: HandleHoverFilter,
  readonly onRemoveFilter: HandleRemoveFilter,
  readonly onHoverDrop: HandleHoverDrop,
  readonly isDraggingPoints: boolean,
}

class Filters extends React.PureComponent<FiltersProps> {

  private renderContent = () => (<div>
    {this.props.filterList.map(({fid, filter}) => <p key={fid}>[filter placeholder]</p>)}
  </div>);

  render() {
    return (
      <Panel
        heading="Filters"
        noPadding={true}
      >
        <Drop
          isDragging={this.props.isDraggingPoints}
          onHoverDrop={this.props.onHoverDrop}
        >
          {this.renderContent()}
        </Drop>
      </Panel>
    );
  }
}

export { Filters };