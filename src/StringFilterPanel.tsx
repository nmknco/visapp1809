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

    const newSeed = new Set(filter.seed) // maybe the excl or incl set depending on .reversed
    if (newSeed.has(str)) {
      newSeed.delete(str);
    } else {
      newSeed.add(str);
    }
    onSetFilter(fid, filter.getStringFilterCopy({seed: newSeed}));
  };

  render() {
    const {filter: {seed, reversed}} = this.props;
    return (
      Array.from(this.props.values).map((str) => 
        <StringFilterItem
          key={str}
          str={str}
          filtered={seed.has(str) !== reversed}
          onToggleValue={this.onToggleValue}
          reversed={reversed}
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
        className={"d-flex align-items-center px-1 rounded filter-card__string-item" + 
            " filter-card__string-item--" + (this.props.filtered ? 'excl' : 'incl')}
        onClick={this.toggleValue}
      >
        {this.props.str}
      </div>
    );
  }
}

export { StringFilterPanel }