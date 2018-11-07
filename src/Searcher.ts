import {
  Data, DataEntry,
} from './commons/types';

class Searcher {
  private readonly data: Data;
  private readonly getIsFiltered: (id: number) => boolean;

  private currentKeyword: string
  
  constructor(data: Data, getIsFiltered: (id: number) => boolean) {
    this.data = data;
    this.getIsFiltered = getIsFiltered;
    this.currentKeyword = '';
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

  getSearchResults = (keyword?: string): Data | null => {
    // returns null for empty search to distinguish from search with no match

    // if keyword is not provided, use current keyword. Otherwise update current keyword.
    if (keyword !== undefined) {
      this.currentKeyword = keyword;
    }
    const results = (this.currentKeyword === '') ? null :
      this.data.filter(d => this.isMatch(this.currentKeyword, d));
    return results;
  };

  getSearchResultsIdSet = (keyword?: string): ReadonlySet<number> | null => {
    // returns null for empty search
    const results = this.getSearchResults(keyword);
    return results && new Set(results.map(d => d.__id_extra__));
  }

}

export { Searcher };