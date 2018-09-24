import * as d3 from 'd3';

class Classifier {
  constructor(data) {
    this.data = data;
    this.attrList = Object.keys(data[0]).filter(a => ((a !== '__id_extra__') && (typeof data[0][a] === 'number')));
    this.stds = {};
    this._init(data)
  }

  _init = (data) => {
    for (const attr of this.attrList) {
      this.stds[attr] = d3.deviation(data, d => d[attr]);
    }
  };

  getMostSimilarAttr = (selectedIds) => {
    const selected = this.data.filter(d => (selectedIds.has(d.__id_extra__)));
    const simi = {};
    let std_sel_ratio_min = Infinity;
    let mostSimilarAttr
    for (const attr of this.attrList) {
      const std_all = this.stds[attr];
      const std_sel_ratio = std_all ? d3.deviation(selected, d => d[attr]) / std_all : 0;
      simi[attr] = std_sel_ratio;
      if (std_sel_ratio < std_sel_ratio_min) {
        mostSimilarAttr = attr;
        std_sel_ratio_min = std_sel_ratio;
      }
    }
    console.log(simi);
    return mostSimilarAttr;
  };

  getSelectedMedian = (selectedIds, attr) => {
    const selected = this.data.filter(d => (selectedIds.has(d.__id_extra__)));
    return d3.median(selected, d => d[attr]);
  }
}

export { Classifier }