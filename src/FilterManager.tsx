import * as d3 from 'd3';

import { Attribute } from './Attribute';
import { Classifier } from './Classifier';
import {
  DiscreteFilter,
  Filter,
  FilterFn,
  FilterList,
  IdFilter,
  NumericRangeFilter,
  RecommendedFilter,
} from './Filter';

import { FilterIdError } from './commons/errors';
import { memoizedGetValueSet } from './commons/memoized';
import {
  Data,
  DataEntry,
  HandleFilterListChange,
  PointState,
  PointStateGetter,
  RFkey,
} from "./commons/types";

class FilterManager {
  private readonly data: Data;
  private readonly onFilterListChange?: HandleFilterListChange;
  private readonly filterList: FilterList;
  private readonly filterCntByPoint: number[];
  private newFilteredIds: string[];

  private fidCounter: number;

  constructor(data: Data, onFilterListChange?: HandleFilterListChange) {
    this.data = data;
    this.onFilterListChange = onFilterListChange;
    
    this.filterList = [];
    this.filterCntByPoint = (new Array(data.length)).fill(0);
    this.fidCounter = 0;
    this.newFilteredIds = [];
  }

  getFilterByFid = (fid: number) => {
    const filter = this.filterList.find(f => f.fid === fid);
    return filter && filter.filter;
  }

  getFilterListCopy = () => [...this.filterList];

  getFilteredIdSet = (): ReadonlySet<string> => new Set(
    this.filterCntByPoint
      .map((d, i) => i.toString())
      .filter(i => this.filterCntByPoint[+i] > 0)
  );
  getIsFiltered = (id: string) => this.filterCntByPoint[id] > 0;

  getNewFilteredIds = () => this.newFilteredIds;


  addFilter = (filter: Filter): this => {
    filter = this.convertToDiscreteIfNecessary(filter);
    this.filterList.unshift({
      fid: this.fidCounter++,
      filter,
    });
    this.countFilter(filter);
    this.updateNewFilteredIds(filter);
    if (this.onFilterListChange) {
      this.onFilterListChange();
    }
    return this;
  }

  setFilter = (fid: number, filter: Filter): this => {
    const entry = this.filterList.find(e => e.fid === fid)
    if (!entry) {
      throw new FilterIdError();
    }
    const oldFilter = entry.filter;
    entry.filter = filter;
    this.countFilter(oldFilter, -1);
    this.countFilter(filter);
    this.updateNewFilteredIds(filter, oldFilter);
    if (this.onFilterListChange) {
      this.onFilterListChange();
    }
    return this;
  };

  removeFilter = (fid: number): this => {
    const iToRemove = this.filterList.findIndex(e => e.fid === fid);
    if (iToRemove === -1) {
      throw new FilterIdError();
    }
    const oldFilter = this.filterList[iToRemove].filter;
    this.filterList.splice(iToRemove, 1);
    this.countFilter(oldFilter, -1);
    this.newFilteredIds = [];
    if (this.onFilterListChange) {
      this.onFilterListChange();
    }
    return this;
  };

  removeAllFilter = (): this => {
    while (this.filterList.length > 0) {
      this.filterList.pop();
    }
    this.filterCntByPoint.fill(0);
    if (this.onFilterListChange) {
      this.onFilterListChange();
    }
    return this;
  }

  getStateGetterOnNoPreview = (): PointStateGetter => 
    (d: DataEntry) => this.getPointState(d);

  getStateGetterOnPreviewAdd = (filterFnToPreview: FilterFn): PointStateGetter =>
    (d: DataEntry) => this.getPointState(d, filterFnToPreview, false);
  
  getStateGetterOnPreviewRemove = (filterFnToPreview: FilterFn): PointStateGetter =>
    (d: DataEntry) => this.getPointState(d, filterFnToPreview, true);

  private countFilter = (filter: Filter, delta: number = 1) => {
    for (const d of this.data) {
      if (filter.filterFn(d)) {
        this.filterCntByPoint[d.__id_extra__] += delta;
      }
    }
  };

  private updateNewFilteredIds = (newFilter: Filter, oldFilter?: Filter) => {
    this.newFilteredIds = this.data.filter(d => 
      newFilter.filterFn(d) && (!oldFilter || !oldFilter.filterFn(d))
    ).map(d => d.__id_extra__);
  };

  private getPointState = (
    d: DataEntry,
    filterFnToPreview?: FilterFn,
    isRemoving?: boolean
  ): PointState => {
    const cnt = this.filterCntByPoint[d.__id_extra__];
    const noPreviewState = cnt > 0 ? PointState.FILTERED : PointState.NORMAL;
    if (!filterFnToPreview) {
      return noPreviewState;
    } else {
      if (isRemoving) {
        return (cnt === 1 && filterFnToPreview(d)) ?
          PointState.TO_RESTORE : noPreviewState
      } else {
        return (cnt === 0 && filterFnToPreview(d)) ?
          PointState.TO_FILTER : noPreviewState
      }
    }
  };

  private convertToDiscreteIfNecessary = (filter: Filter): Filter => {
    if (filter instanceof NumericRangeFilter) {
      const values = memoizedGetValueSet(this.data, filter.attrName);
      if (values.size < 10) {
        return new DiscreteFilter({
          attrName: filter.attrName,
          seed: new Set(),
        });
      }
    }
    return filter;
  }

  static getRecommendedFilters = (args: {
    idSetDroppedToFilter: ReadonlySet<string>,
    data: Data,
    xAttr?: Attribute,
    yAttr?: Attribute,
  }): ReadonlyArray<RecommendedFilter> => {
    const {data, idSetDroppedToFilter, xAttr, yAttr} = args;

    const recommendedFilters: RecommendedFilter[] = [];

    if (!idSetDroppedToFilter) {
      return recommendedFilters;
    }

    const selectedData = data.filter(d => idSetDroppedToFilter.has(d.__id_extra__));
    
    // Filter1: selected only
    recommendedFilters.push(
      new RecommendedFilter(
        new IdFilter({
          seed: new Set(idSetDroppedToFilter),
        }),
        RFkey.SELECTED,
      )
    );
    // Filter2: X range
    if (xAttr && xAttr.type === 'number') {
      const [min, max] = d3.extent(selectedData, d => d[xAttr.name] as number);
      if (min !== undefined && max !== undefined) {
        recommendedFilters.push(new RecommendedFilter(
          new NumericRangeFilter({
            attrName: xAttr.name,
            seed: [min, max],
          }),
          RFkey.X, 
        ));
      }
    }
    // Filter 3: Y range
    if (yAttr && yAttr.type === 'number') {
      const [min, max] = d3.extent(selectedData, d => d[yAttr.name] as number);
      if (min !== undefined && max !== undefined) {
        recommendedFilters.push(new RecommendedFilter(
          new NumericRangeFilter({
            attrName: yAttr.name,
            seed: [min, max],
          }),
          RFkey.Y, 
        ));
      }
    }
    // Filter 4: Range of most similar attribute
    if (idSetDroppedToFilter.size >= 2) {
      const cls = new Classifier(() => data);
      const simiAttrName = cls.getMostSimilarAttr([idSetDroppedToFilter,], 1)[0];
      if (simiAttrName && (!xAttr || simiAttrName !== xAttr.name) && (!yAttr || simiAttrName !== yAttr.name)) {
        const [min, max] = d3.extent(selectedData, d => d[simiAttrName] as number);
        if (min !== undefined && max !== undefined) {
          recommendedFilters.push(new RecommendedFilter(
            new NumericRangeFilter({
              attrName: simiAttrName,
              seed: [min, max],
            }),
            RFkey.SIMILAR_ATTR
          ));
        }
      }
    }
    // TODO: Filter 5: Nearest neighbors

    return recommendedFilters;
  }

  static getBarRecommendedFilters = (args: {
    xSetDroppedToFilter: ReadonlySet<string>,
    xName: string,
    data: Data,
  }): ReadonlyArray<RecommendedFilter> => {
    const {data, xSetDroppedToFilter, xName} = args;

    const recommendedFilters: RecommendedFilter[] = [];

    if (!xSetDroppedToFilter) {
      return recommendedFilters;
    }
    
    // Filter1: selected only
    recommendedFilters.push(
      new RecommendedFilter(
        new IdFilter({
          seed: new Set(
            data
              .filter(d => xSetDroppedToFilter.has(d[xName].toString()))
              .map(d => d.__id_extra__)
          ),
        }),
        RFkey.SELECTED,
      )
    );

    return recommendedFilters;
  }

}

export { FilterManager };