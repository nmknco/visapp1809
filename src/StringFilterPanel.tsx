import * as React from 'react';

import { StringFilter } from './Filter';

import { HandleSetFilter } from './commons/types';


interface StringFilterPanelProps {
  readonly fid: number,
  readonly filter: StringFilter,
  readonly values: ReadonlySet<string>,
  readonly onSetFilter: HandleSetFilter,
}

class StringFilterPanel extends React.PureComponent<StringFilterPanelProps> {

  private onToggleValue = (str: string) => {
    const { fid, filter, onSetFilter } = this.props;
    const newExcludedSet = new Set<string>(filter.seed);
    if (newExcludedSet.has(str)) {
      newExcludedSet.delete(str);
    } else {
      newExcludedSet.add(str);
    }
    onSetFilter(fid, new StringFilter({
      ...filter,
      seed: newExcludedSet
    }));
  };

  render() {
    const excludedSet = this.props.filter.seed;
    return (
      Array.from(this.props.values).map((str) => 
        <StringFilterItem
          key={str}
          str={str}
          filtered={excludedSet.has(str)}
          onToggleValue={this.onToggleValue}
          reversed={this.props.filter.reversed}
        />
      )
    );
  }
}

interface StringFilterItemProps {
  readonly str: string,
  readonly filtered: boolean,
  readonly onToggleValue: (str: string) => void,
  readonly reversed?: boolean,
}

class StringFilterItem extends React.PureComponent<StringFilterItemProps> {

  private toggleValue = () => this.props.onToggleValue(this.props.str);
  render() {
    return(
      <div
        className={"d-flex align-items-center px-1 rounded filter-card--string-item" + 
            " filter-card--string-item__" + (this.props.filtered ? 'excl' : 'incl')}
        onClick={this.toggleValue}
      >
        {this.props.str}
      </div>
    );
  }
}

export { StringFilterPanel }