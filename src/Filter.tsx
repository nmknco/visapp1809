import * as React from 'react';

import {
  DataEntry,
  RFkey,
} from './commons/types';

export type FilterFn = (d: DataEntry) => boolean;

// Types used for generating and uniquely representing the filters
export type NumericRangeFilterSeed = Readonly<[number, number]>
export type DiscreteFilterSeed = ReadonlySet<string|number>;
export type IdFilterSeed = ReadonlySet<string>;
export type FilterSeed = NumericRangeFilterSeed | DiscreteFilterSeed | IdFilterSeed

interface FilterConstructorArgs<T extends FilterSeed> {
  attrName: string,
  seed: T,
  reversed?: boolean,
}

interface FilterUpdate<T extends FilterSeed> {
  attrName?: string,
  seed?: T,
  reversed?: boolean,
}


abstract class AbstractFilter<T extends FilterSeed> {
  // May use Symbols to avoid collision between recommended and fixed filter keys
  readonly attrName: string;
  seed: T;
  readonly reversed: boolean;
  filterFn: FilterFn;

  constructor({attrName, seed, reversed}: FilterConstructorArgs<T>) {
    this.attrName = attrName;
    this.seed = seed;
    this.reversed = reversed || false
  }

  mergeUpdates = ({attrName, seed, reversed}: FilterUpdate<T>): FilterConstructorArgs<T> => {
    attrName = (attrName !== undefined) ? attrName : this.attrName;
    seed = seed || this.seed;
    reversed = (reversed !== undefined) ? reversed : this.reversed;
    return ({attrName, seed, reversed})
  }
  
  getReversedCopy: () => void

}
interface HasDescription {
  getTextDescription(): JSX.Element | string | null;
}

export class NumericRangeFilter extends AbstractFilter<NumericRangeFilterSeed> implements HasDescription {
  constructor({attrName, seed, reversed}: FilterConstructorArgs<NumericRangeFilterSeed>) {
    super({attrName, seed, reversed})
    this.filterFn = (d: DataEntry) => {
      const [min, max] = this.seed;
      return (d[this.attrName] >= min && d[this.attrName] <= max) !== this.reversed;
    }
  }

  getReversedCopy = () =>
    new NumericRangeFilter(this.mergeUpdates({reversed: !this.reversed}));

  getNumericFilterCopy = (update: FilterUpdate<NumericRangeFilterSeed>) => 
    new NumericRangeFilter(this.mergeUpdates(update));

  getTextDescription = () => null;
}

export class DiscreteFilter extends AbstractFilter<DiscreteFilterSeed> implements HasDescription {
  constructor({attrName, seed, reversed}: FilterConstructorArgs<DiscreteFilterSeed>) {
    super({attrName, seed, reversed})
    const stringSet = seed;
    this.filterFn = (d: DataEntry) => {
      return stringSet.has(d[attrName]) !== this.reversed;
    }
  }

  getReversedCopy = () =>
    new DiscreteFilter(this.mergeUpdates({reversed: !this.reversed}));

  getDiscreteFilterCopy = (update: FilterUpdate<DiscreteFilterSeed>) =>
    new DiscreteFilter(this.mergeUpdates(update));

  getTextDescription = () => null;
}

export class IdFilter extends AbstractFilter<IdFilterSeed> implements HasDescription {
  readonly seed: IdFilterSeed;

  constructor({seed, reversed}: Pick<FilterConstructorArgs<IdFilterSeed>, 'seed' | 'reversed'>) {
    super({attrName: '__id_extra__', seed, reversed})
    const idSet = seed;
    this.filterFn = (d: DataEntry) =>
      idSet.has(d.__id_extra__) !== this.reversed;
  }

  getReversedCopy = () =>
    new IdFilter(this.mergeUpdates({reversed: !this.reversed}));

  

  getTextDescription = () => null;
}

export type Filter = NumericRangeFilter | DiscreteFilter | IdFilter;

export interface FilterListEntry {
  readonly fid: number,
  filter: Filter,
};

export type FilterList = FilterListEntry[];

export interface IdFilterListEntry {
  readonly fid: number,
  filter: IdFilter,
};

export type IdFilterList = IdFilterListEntry[];


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