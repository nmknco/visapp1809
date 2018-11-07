import * as React from 'react';

import { DiscreteFilter } from './Filter';

import { HandleSetFilter } from './commons/types';


interface DiscreteFilterPanelProps {
  readonly fid: number,
  readonly filter: DiscreteFilter,
  readonly values: ReadonlySet<number|string>,
  readonly onSetFilter: HandleSetFilter,
}

class DiscreteFilterPanel extends React.PureComponent<DiscreteFilterPanelProps> {

  private onToggleValue = (str: string) => {
    const { fid, filter, onSetFilter } = this.props;

    const newSeed = new Set(filter.seed) // maybe the excl or incl set depending on .reversed
    if (newSeed.has(str)) {
      newSeed.delete(str);
    } else {
      newSeed.add(str);
    }
    onSetFilter(fid, filter.getDiscreteFilterCopy({seed: newSeed}));
  };

  render() {
    console.log('Discrete filter panel render');
    const {filter: {seed, reversed}} = this.props;
    return (
      <div className="filter-card__discrete-panel">
        {Array.from(this.props.values).map((value) => 
          <DiscreteFilterItem
            key={value}
            value={value}
            filtered={seed.has(value) !== reversed}
            onToggleValue={this.onToggleValue}
            reversed={reversed}
          />
        )}
      </div>
    );
  }
}

interface DiscreteFilterItemProps {
  readonly value: number|string,
  readonly filtered: boolean,
  readonly onToggleValue: (value: number|string) => void,
  readonly reversed?: boolean,
}

class DiscreteFilterItem extends React.PureComponent<DiscreteFilterItemProps> {

  private toggleValue = () => this.props.onToggleValue(this.props.value);
  render() {
    return(
      <div
        className={"d-flex align-items-center px-1 rounded filter-card__discrete-item" + 
            " filter-card__discrete-item--" + (this.props.filtered ? 'excl' : 'incl')}
        onClick={this.toggleValue}
      >
        {this.props.value}
      </div>
    );
  }
}

export { DiscreteFilterPanel }