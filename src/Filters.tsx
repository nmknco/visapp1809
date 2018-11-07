import * as d3 from 'd3';
import * as React from 'react';
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

import { Drop } from './Drop';
import { FilterCard } from './FilterCard';
import { Minimap } from './Minimap';
import { NumericRangeFilterPanel } from './NumericRangeFilterPanel';
import { Panel } from './Panel';
import { StringFilterPanel } from './StringFilterPanel';

import { Filter, FilterList, IdFilter, NumericRangeFilter, StringFilter } from './Filter';

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
import { getDropBackgroundColor } from './commons/util';


interface FiltersProps {
  readonly data: Data,
  readonly filterList: Readonly<FilterList>
  readonly onAddFilter: HandleAddFilter,
  readonly onSetFilter: HandleSetFilter,
  readonly onRemoveFilter: HandleRemoveFilter,
  readonly onHoverFilter: HandleHoverFilter,
  readonly onHoverDrop: HandleHoverDrop,
  readonly isDraggingPoints: boolean,
  readonly minimapScaleMap: Readonly<MinimapScaleMap>,
  readonly xAttrName?: string,
  readonly yAttrName?: string,
}

class Filters extends React.PureComponent<FiltersProps> {

  // TDOD: Prevent creating new objects as props

  private renderPanel(fid: number, filter: Filter) {
    if (filter instanceof StringFilter) {
      return (
        <StringFilterPanel
          { ...{fid, filter} }
          values={new Set(this.props.data.map(d => d[filter.attrName] as string))}
          onSetFilter={this.props.onSetFilter}
        />
      );
    } else if (filter instanceof NumericRangeFilter) {
      const [min, max] = d3.extent(
        this.props.data, d => d[filter.attrName] as number);
      if (!min || !max) {
        throw new NoExtentError(filter.attrName);
      }
      if (max - min <= 0) {
        // Use string filter in special cases
        const strf = new StringFilter({
          attrName: filter.attrName,
          seed: new Set(),
        });
        return (
          <StringFilterPanel
            fid={fid}
            filter={strf}
            values={new Set(this.props.data.map(d => d[filter.attrName] as string))}
            onSetFilter={this.props.onSetFilter}
          />
        );
      } else {
        return (
          <NumericRangeFilterPanel
            { ...{fid, filter} }
            extent={[min, max]}
            onSetFilter={this.props.onSetFilter}
          />
        );
      }
    } else {
      return;
    }
  };

  private renderMinimaps = (idFilterList: FilterList) => (
    <div>
      {idFilterList.length > 0 && 
        <div className="p-1">Filtered points: </div>
      }
      <div className="idfilter-container d-flex flex-wrap">
        {
          idFilterList.map(({fid, filter}) => 
            <Minimap
              key={fid}
              { ...{fid, filter} }
              dataFiltered={this.props.data.filter(filter.filterFn)}
              onRemove={this.props.onRemoveFilter}
              onHover={this.props.onHoverFilter}
              scales={this.props.minimapScaleMap}
              xAttrName={this.props.xAttrName}
              yAttrName={this.props.yAttrName}
            />
          )
        }
      </div>
    </div>
  );

  private renderContent = () => {
    const idFilterList = this.props.filterList.filter(d => (d.filter instanceof IdFilter))
    const valueFilterList = this.props.filterList.filter(d => !(d.filter instanceof IdFilter))
    
    return (
      <div className="filters__container">
        <div className="filters__container-inner p-1">
          <div className="mx-3 pb-1 border-bottom text-center">
            Drag points or attributes here to filter
          </div>

          {this.renderMinimaps(idFilterList)}

          <div className="filter-list">
            {valueFilterList.map(({fid, filter}) =>
              <FilterCard
                key={fid}
                { ...{fid, filter}}
                onSetFilter={this.props.onSetFilter}
                onRemoveFilter={this.props.onRemoveFilter}
                onHoverFilter={this.props.onHoverFilter}
              >
                {this.renderPanel(fid, filter)}
              </FilterCard>
            )}
          </div>
        </div>
      </div>
    );
  };

  render() {
    console.log('Filters panel render');
    return (
      <Panel
        heading="Filters"
        noPadding={true}
      >
        <div>
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