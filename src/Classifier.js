import * as d3 from 'd3';

class Classifier {
  constructor(data) {
    this.data = data;
    this.attrList = Object.keys(data[0]).filter(a => ((a !== '__id_extra__') && (typeof data[0][a] === 'number')));
    this.vars = {};
    this._init(data)
  }

  _init = (data) => {
    for (const attr of this.attrList) {
      this.vars[attr] = d3.variance(data, d => d[attr]);
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

  getMostSimilarAttr = (groups, numberOfResult) => {
    const k = groups.length;
    if (k === 0) return [];

    const simi = {};

    if (k === 1) {
      for (const attr of this.attrList) {
        const var_all = this.vars[attr];
        let var_sum = 0;

        for (const group of groups) {
          const selected = this.data.filter(d => group.has(d.__id_extra__));
          var_sum += var_all ? d3.variance(selected, d => d[attr]) : 0;
        }
        const var_ratio_sum = var_sum / var_all
        simi[attr] = var_ratio_sum;
      } 
    } else {
      // Two or more groups
      for (const attr of this.attrList) {
        const f = this._F(attr, groups);
        simi[attr] = f;
      }
    }
    console.log(simi);
    return Object.entries(simi)
      .filter(d => typeof d[1] === 'number' && !isNaN(d[1]))
      .sort((a, b)=> (a[1] - b[1]) * (k>1?-1:1))
      .map(d => d[0])
      .slice(0, numberOfResult);
              
  };

}

export { Classifier }