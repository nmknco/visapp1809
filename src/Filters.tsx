import * as d3 from 'd3';
import * as React from 'react';
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

import { Drop } from './Drop';
import { Panel } from './Panel';

import { FilterList, NumericRangeFilter, StringFilter } from './Filter';

import { NoExtentError } from './commons/errors';
import {
  Data,
  DraggableType,
  HandleAddFilter,
  HandleHoverDrop,
  HandleHoverFilter,
  HandleRemoveFilter,
  HandleSetFilter,
  MinimapScaleMap,
} from './commons/types';
import { getDropBackgroundColor } from './util';

interface FiltersProps {
  readonly data: Data,
  readonly filterList: Readonly<FilterList>
  readonly minimapScaleMap: Readonly<MinimapScaleMap>,
  readonly onAddFilter: HandleAddFilter,
  readonly onSetFilter: HandleSetFilter,
  readonly onRemoveFilter: HandleRemoveFilter,
  readonly onHoverFilter: HandleHoverFilter,
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
        <div className="filters__container">
          <Drop
            isDragging={this.props.isDraggingPoints}
            onHoverDrop={this.props.onHoverDrop}
          >
            <FiltersAttributeDrop
              data={this.props.data}
              onAddFilter={this.props.onAddFilter}
            >
              {this.renderContent()}
            </FiltersAttributeDrop>
          </Drop>
        </div>
      </Panel>
    );
  }
}

const filterTarget = {
  drop: (
    props: FiltersAttributeDropProps,
    monitor: DropTargetMonitor,
  ): void => {
    const { data, onAddFilter } = props;
    const { sourceAttribute: {name: attrName, type} } = monitor.getItem();
    if (type === 'number') {
      const [min, max] = d3.extent(data, d => d[attrName] as number);
      if (min === undefined || max === undefined) {
        throw new NoExtentError(attrName);
      }
      onAddFilter(new NumericRangeFilter({
        attrName,
        seed: [min, max],
        reversed: true // exclude points outside [min, max]
      }));
    } else if (type === 'string') {
      onAddFilter(new StringFilter({
        attrName,
        seed: new Set(), 
      }));
    }
  },

  canDrop: (
    props: FiltersAttributeDropProps,
    monitor: DropTargetMonitor,
  ): boolean => true,
}

const collect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

interface FiltersAttributeDropProps {
  readonly data: Data,
  readonly onAddFilter: HandleAddFilter,
  readonly connectDropTarget?: ConnectDropTarget,
  readonly isOver?: boolean,
  readonly canDrop?: boolean,
}

class FiltersAttributeDropContainer extends React.PureComponent<FiltersAttributeDropProps> {
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    console.log(isOver);
    return connectDropTarget!(
      <div
        className="drop"
        style={{ backgroundColor: getDropBackgroundColor(isOver, canDrop) }}
      >
        {this.props.children}
      </div>
    );
  }
}

const FiltersAttributeDrop = DropTarget(
  DraggableType.ATTRIBUTE,
  filterTarget,
  collect,
)(FiltersAttributeDropContainer);

export { Filters };