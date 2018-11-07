import {
  Data, DataEntry,
} from './commons/types';

class Searcher {
  private readonly data: Data;
  private readonly getIsFiltered: (id: number) => boolean;

  // These are states that are needed for the parts (plot) that are not
  //    controlled by React.
  private currentKeyword: string;
  private currentResults: Readonly<Data> | null;
  private currentResultsIdSet: ReadonlySet<number> | null;
  
  constructor(data: Data, getIsFiltered: (id: number) => boolean) {
    this.data = data;
    this.getIsFiltered = getIsFiltered;
    this.currentKeyword = '';
    this.currentResults = null;
    this.currentResultsIdSet = null;
  }

  private isMatch = (keyword: string, entry: DataEntry): boolean => {
    if (!this.getIsFiltered(entry.__id_extra__)) {
      for (const value of Object.values(entry)) {
        if (typeof value === 'string'
            && value.toLowerCase().includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  };

  private doSearch = (keyword?: string) => {
    // if keyword is not provided, use current keyword. Otherwise update current keyword.
    if (keyword !== undefined) {
      this.currentKeyword = keyword;
    }
    const results = (this.currentKeyword === '') ? null :
      this.data.filter(d => this.isMatch(this.currentKeyword, d));
    this.currentResults = results;
    this.currentResultsIdSet = results && new Set(results.map(d => d.__id_extra__));
  };

  searchAndGetResults = (keyword?: string): Data | null => {
    // returns null for empty search to distinguish from search with no match
    this.doSearch(keyword);
    return this.currentResults;
  };

  searchAndGetResultsIdSet = (keyword?: string): ReadonlySet<number> | null => {
    // returns null for empty search
    this.doSearch(keyword);
    return this.currentResultsIdSet;
  };

  getCurrentSearchResultsIdSet = () => {
    return this.currentResultsIdSet;
  };

}

export { Searcher };