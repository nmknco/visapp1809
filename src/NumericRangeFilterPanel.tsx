import * as React from 'react';

import { DoubleSlider } from './DoubleSlider';
import { NumericRangeFilter } from './Filter';

import { HandleSetFilter } from './commons/types';


interface NumericRangeFilterPanelProps {
  readonly fid: number,
  readonly filter: NumericRangeFilter,
  readonly extent: Readonly<[number, number]>,
  readonly onSetFilter: HandleSetFilter,
}

class NumericRangeFilterPanel extends React.PureComponent<NumericRangeFilterPanelProps> {

  private onChangeRange = (range: Readonly<[number, number]>) => {
    const { fid, filter, onSetFilter } = this.props;
    onSetFilter(fid, new NumericRangeFilter({
      ...filter,
      seed: range,
    }));
  };

  render() {
    console.log('Numeric filter panel render')
    return (
      <DoubleSlider
        extent={this.props.extent}
        range={this.props.filter.seed}
        onChangeRange={this.onChangeRange}
        reversed={this.props.filter.reversed}
      />
    );
  }
}



export { NumericRangeFilterPanel }