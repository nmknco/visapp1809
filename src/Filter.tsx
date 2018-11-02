import * as React from 'react';

import {
  DataEntry,
  RFkey,
} from './commons/types';

export type FilterFn = (d: DataEntry) => boolean;

// Types used for generating and uniquely representing the filters
export type NumericRangeFilterSeed = Readonly<[number, number]>
export type StringFilterSeed = ReadonlySet<string>;
export type IdFilterSeed = ReadonlySet<number>;
export type FilterSeed = NumericRangeFilterSeed | StringFilterSeed | IdFilterSeed



abstract class AbstractFilter {
  // May use Symbols to avoid collision between recommended and fixed filter keys
  readonly attrName: string;
  readonly seed: FilterSeed;
  readonly reversed: boolean;
  filterFn: FilterFn;

  constructor({attrName, seed, reversed}: {
    attrName: string,
    seed: FilterSeed,
    reversed?: boolean,
  }) {
    this.attrName = attrName;
    this.seed = seed;
    this.reversed = reversed || false
  }
}

interface HasDescription {
  getTextDescription(): JSX.Element | string | null;
}

export class NumericRangeFilter extends AbstractFilter implements HasDescription {
  seed: NumericRangeFilterSeed;

  constructor({attrName, seed, reversed}: {
    attrName: string,
    seed: NumericRangeFilterSeed,
    reversed?: boolean,
  }) {
    super({attrName, seed, reversed})
    this.filterFn = (d: DataEntry) => {
      const [min, max] = this.seed;
      return (d[this.attrName] >= min && d[this.attrName] <= max) !== this.reversed;
    }
  }

  getTextDescription = () => null;
}

export class IdFilter extends AbstractFilter implements HasDescription {
  readonly seed: IdFilterSeed;

  constructor({seed, reversed}: {
    seed: IdFilterSeed,
    reversed?: boolean,
  }) {
    super({attrName: '__id_extra__', seed, reversed})
    const idSet = seed;
    this.filterFn = (d: DataEntry) =>
      idSet.has(d.__id_extra__) !== this.reversed;
  }

  getTextDescription = () => null;
}

export type Filter = NumericRangeFilter | IdFilter;

export interface FilterListEntry {
  readonly fid: number,
  filter: Filter,
};

export type FilterList = FilterListEntry[];


const REC_FILTER_TEXTS = {
  [RFkey.SELECTED]: () => <span>the points you <strong>selected</strong></span>,
  [RFkey.X]: () => <span>all points within the <strong>same x range</strong></span>,
  [RFkey.Y]: () => <span>all points within the <strong>same y range</strong></span>,
  [RFkey.SIMILAR_ATTR]: (attrName: string) => <span>points with similar value of <strong>{attrName}</strong></span>,
}

export class RecommendedFilter implements HasDescription {
  readonly key: RFkey;
  readonly filter: Filter;

  constructor(filter: Filter, key: RFkey) {
    this.filter = filter;
    this.key = key;
  }

  getTextDescription = () => {
    return (<div>Filter out {REC_FILTER_TEXTS[this.key](this.filter.attrName)}</div>);
  }
}