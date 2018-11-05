import * as React from 'react';

import { Filter } from './Filter';

import {
  HandleHoverFilter,
  HandleRemoveFilter,
  HandleSetFilter,
} from './commons/types';
import { FAButton } from './FAButton';


interface FilterCardProps {
  readonly fid: number,
  readonly filter: Filter,
  readonly onSetFilter: HandleSetFilter,
  readonly onRemoveFilter: HandleRemoveFilter,
  readonly onHoverFilter: HandleHoverFilter,
}

interface FilterCardState {
  readonly expanded: boolean,
}

class FilterCard extends React.PureComponent<FilterCardProps, FilterCardState> {
  
  constructor(props: FilterCardProps) {
    super(props);
    this.state = {
      expanded: true,
    }
  }

  private toggleExpand = () => {
    this.setState((prevState) => ({
      expanded: !prevState.expanded,
    }));
  };

  private handleRemove = () => this.props.onRemoveFilter(this.props.fid);

  private handleReverse = () => this.props.onSetFilter(
    this.props.fid,
    this.props.filter.getReversedCopy()
  );

  private handleHover = (ev: React.MouseEvent<Element>) =>
    this.props.onHoverFilter(ev, this.props.filter);

  private renderHeader = () => {
    return (
      <div 
        className='filter-card--header d-flex justify-content-between align-items-center p-1'
      >
          <div>
            <span className="pr-1">
              <FAButton
                faName={`angle-${this.state.expanded?'up':'down'}`}
                onClick={this.toggleExpand}
                title={this.state.expanded?'Collapse':'Expand'}
              />
            </span>
            {this.props.filter.attrName}
          </div>
          <div>
            <FAButton
              faName="filter"
              onHover={this.handleHover}
              title="Toggle on/off"
            />
            <FAButton
              faName="recycle"
              onClick={this.handleReverse}
              onHover={this.handleHover}
              hoverEffect={true}
              title="Reverse"
            />
            <FAButton
              faName="times"
              onClick={this.handleRemove}
              onHover={this.handleHover}
              hoverEffect={true}
              title="Remove"
            />
          </div>
      </div>
    );
  }
  
  render() {
    return (
      <div className="filter-card my-1 border border-light rounded">
        {this.renderHeader()}
        <div className={this.state.expanded ? "filter-card--body p-1" : "d-none"}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export { FilterCard };