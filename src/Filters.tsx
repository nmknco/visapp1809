import * as React from 'react';
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

import { DiscreteFilterPanel } from './DiscreteFilterPanel';
import { Drop } from './Drop';
import {
  DiscreteFilter,
  Filter,
  FilterList,
  IdFilter,
  IdFilterList,
  NumericRangeFilter
} from './Filter';
import { FilterCard } from './FilterCard';
import { Minimap, PointFilterMinimap } from './Minimap';
import { NumericRangeFilterPanel } from './NumericRangeFilterPanel';
import { Panel } from './Panel';

import { Attribute } from './Attribute';

import { memoizedGetExtent, memoizedGetValueSet } from './commons/memoized';
import {
  Data,
  DraggableType,
  HandleAddFilter,
  HandleHoverDrop,
  HandleHoverFilter,
  HandleRemoveFilter,
  HandleSetFilter,
} from './commons/types';
import { getDropBackgroundColor } from './commons/util';


interface FiltersProps {
  readonly data: Data,
  readonly filterList: Readonly<FilterList>,
  readonly filteredIds: ReadonlySet<string>,
  readonly onAddFilter: HandleAddFilter,
  readonly onSetFilter: HandleSetFilter,
  readonly onRemoveFilter: HandleRemoveFilter,
  readonly onHoverFilter: HandleHoverFilter,
  readonly onHoverDrop: HandleHoverDrop,
  readonly isDragging: boolean,
  readonly xAttr?: Attribute,
  readonly yAttr?: Attribute,
  random: number,
}

class Filters extends React.PureComponent<FiltersProps> {

  // TDOD: Prevent creating new objects as props

  private renderValueFilterPanel(fid: number, filter: Filter) {
    if (filter instanceof DiscreteFilter) {
      return (
        <DiscreteFilterPanel
          { ...{fid, filter} }
          values={memoizedGetValueSet(this.props.data, filter.attrName)}
          onSetFilter={this.props.onSetFilter}
        />
      );
    } else if (filter instanceof NumericRangeFilter) {
      return (
        <NumericRangeFilterPanel
          { ...{fid, filter} }
          extent={memoizedGetExtent(this.props.data, filter.attrName)}
          onSetFilter={this.props.onSetFilter}
        />
      );
    } else {
      return;
    }
  };

  private renderValueFilterPanels = (valueFilterList: FilterList) => (
    <div>
      {valueFilterList.length > 0 && 
        <div className="p-1">Value filters: </div>
      }
      <div className="filters__filterlist filters__filterlist--value">
        {valueFilterList.map(({fid, filter}) =>
          <FilterCard
            key={fid}
            { ...{fid, filter}}
            onSetFilter={this.props.onSetFilter}
            onRemoveFilter={this.props.onRemoveFilter}
            onHoverFilter={this.props.onHoverFilter}
          >
            {this.renderValueFilterPanel(fid, filter)}
          </FilterCard>
        )}
      </div>
    </div>
  )

  private renderIdFilterMinimaps = (idFilterList: IdFilterList) => (
    <div>
      {idFilterList.length > 0 && 
        <div className="p-1">Custom point-filters: </div>
      }
      <div className="filters__filterlist filters__filterlist--id d-flex flex-wrap">
        {
          idFilterList.map(({fid, filter}) => 
            <PointFilterMinimap
              key={fid}
              data={this.props.data}
              fid={fid}
              filter={filter}
              onRemove={this.props.onRemoveFilter}
              onHover={this.props.onHoverFilter}
              xAttr={this.props.xAttr}
              yAttr={this.props.yAttr}
            />
          )
        }
      </div>
    </div>
  );


  private renderFilteredPointsMinimap = (filteredIds: ReadonlySet<string>) => (
    <div className="flex">
      <div id="filtered-point-minimap" className="d-flex justify-content-center">
        <Minimap
          filteredIds={filteredIds}
          data={this.props.data}
          xAttr={this.props.xAttr}
          yAttr={this.props.yAttr}
        />
      </div>
    </div>
  );

  private renderContent = () => {
    const idFilterList = 
      this.props.filterList.filter(d => (d.filter instanceof IdFilter)) as IdFilterList;
    const valueFilterList = this.props.filterList.filter(d => !(d.filter instanceof IdFilter))

    return (
      <div className="filters__container">
        <div className="filters__container-inner p-1">
          <div className="d-flex align-items-center mx-3 pb-1 border-bottom">
            {this.renderFilteredPointsMinimap(this.props.filteredIds)}
            <div className="text-center p-2">Drag points or attributes here to filter</div>
          </div>

          {this.renderIdFilterMinimaps(idFilterList)}
          {this.renderValueFilterPanels(valueFilterList)}
          
        </div>
      </div>
    );
  };

  render() {
    // console.log('Filters panel render');
    return (
      <Panel
        heading="Filters"
        className="filters-panel"
        noPadding={true}
      >
        <div>
          <Drop
            isDragging={this.props.isDragging}
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
      const [min, max] = memoizedGetExtent(data, attrName);
      onAddFilter(new NumericRangeFilter({
        attrName,
        seed: [min, max],
        reversed: true // exclude points outside [min, max]
      }));
    } else if (type === 'string') {
      onAddFilter(new DiscreteFilter({
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

class FiltersAttributeDropContainer extends React.Component<FiltersAttributeDropProps> {
    // Always rerender because of props.children
  
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;
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