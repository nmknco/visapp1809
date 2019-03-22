import * as d3 from 'd3';

import { memoizedGetAttributes } from './commons/memoized';

class Classifier {
  constructor(getData) {
    this.getData = getData;
    this.vars = {};
    this.nested = {};

    this.data = {};
    this.numericAttrList = [];
    this.catAttrList = [];
  }

  _updateDataAndAttrList = () => {
    this.data = this.getData();
    const attrList = memoizedGetAttributes(this.getData());
    this.numericAttrList = attrList.filter(attr => attr.type === 'number').map(attr => attr.name);
    this.catAttrList = attrList.filter(attr => attr.type === 'string').map(attr => attr.name);
  }

  _updateTotalVar = () => {
    for (const attr of this.numericAttrList) {
      this.vars[attr] = d3.variance(this.data, d => d[attr]);
    }
  };

  _F = (attr, groups) => {
    let all = []

    const W = d3.sum(groups,
      g => {
        const vals = this.data.filter(d => g.has(d.__id_extra__)).map(d => d[attr]);
        all = all.concat(vals);
        const m = d3.mean(vals);
        return d3.sum(vals, x => Math.pow((x - m), 2));
      }
    );

    const tm = d3.mean(all);
    const T = d3.sum(all, x => Math.pow((x - tm), 2));
    const B = T - W;

    const N = all.length;
    const k = groups.length;
    
    return (N - k) * B / (W * (k - 1))
  };


  _getMostSimilarCatAttr = (groups, maxNumberOfResult) => {
    // ad hoc measure for ordinal attributes
    // pick only the categories that has the same value in at least <threshold> data points 
    //    in all groups
    // if (groups.length === 0) return [];


    const threshold = 0.8;
    const scores = {};
    for (const ca of this.catAttrList) {
      scores[ca] = 1;
    }
    for (const group of groups) {
      const selected = this.data.filter(d => group.has(d.__id_extra__));
      for (const catAttr of this.catAttrList) {
        const count = {};
        for (const datum of selected) {
          count[datum[catAttr]] = (count[datum[catAttr]] || 0) + 1;
        }
        const maxRatio = d3.max(Object.values(count)) / selected.length;
          scores[catAttr] *= (maxRatio > threshold ? maxRatio : 0);
      }
    }
    // console.log(scores);

    return Object.entries(scores)
      .filter(([ca, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(d => d[0])
      .slice(0, maxNumberOfResult || 2);
  } 


  _getMostSimilarNumAttr = (groups, numberOfResult) => {
    const k = groups.length;
    // if (k === 0) return [];

    // this._updateDataAndAttrList();
    this._updateTotalVar();

    const simi = {};

    if (k === 1) {
      for (const attr of this.numericAttrList) {
        const var_all = this.vars[attr];
        if (var_all) {
          let var_sum = 0;

          // We are doing a for loop so this can be applied to multiple groups
          //  in case that we want
          for (const group of groups) {
            const selected = this.data.filter(d => group.has(d.__id_extra__));
            var_sum += d3.variance(selected, d => d[attr]);
          }
          const var_ratio_sum = var_sum / var_all;
          simi[attr] = var_ratio_sum;
        } else {
          simi[attr] = -1;
        }
      } 
    } else {
      // Two or more groups
      for (const attr of this.numericAttrList) {
        const f = this._F(attr, groups);
        simi[attr] = f;
      }
    }

    // console.log(simi);
    
    return Object.entries(simi)
      .filter(d => typeof d[1] === 'number' && !isNaN(d[1]))
      .sort((a, b)=> (a[1] - b[1]) * (k>1?-1:1))
      .map(d => d[0])
      .slice(0, numberOfResult);
              
  };

  getMostSimilarAttr = (groups, nNum, numericOnly, nCat) => {
    // console.log(groups);
    if (groups.length === 0) return [];
    this._updateDataAndAttrList();
    const numList = this._getMostSimilarNumAttr(groups, nNum);
    const res = numericOnly ? numList : numList.concat(this._getMostSimilarCatAttr(groups, nCat))

    return res;
  }

}

export { Classifier }