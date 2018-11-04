import * as d3 from 'd3';
import { ColorUtil, expandRange } from './util';
import { Classifier } from './Classifier';


class ActiveSelections {
  constructor(len, onActiveSelectionChange) {
    this.len = len;
    this.valueByIds = { color: Array(len), size: Array(len) };
    this.idsByValue = { color: {}, size: {} };

    this.onActiveSelectionChange = onActiveSelectionChange;
  }

  getValue = (field, id) => this.valueByIds[field][id];

  getAllGroups = (field) => Object.values(this.idsByValue[field]);

  getAllGroupsWithValue = (field) => this.idsByValue[field];

  hasActiveSelection = (field) => Object.keys(this.idsByValue[field]).length > 0;

  assignValue = (field, selectedIds, value) => {
    // If no selectedIds passed, reset all
    if (!selectedIds) {
      this.valueByIds[field] = Array(this.len);
      this.idsByValue[field] = {};
    } else {
      for (let id of selectedIds) {
        this.valueByIds[field][id] = value;
      }
      this._updateIdsByValue(field);
    }
    this.onActiveSelectionChange(field, this);
  };

  _updateIdsByValue = (field) => {
    this.idsByValue = { color: {}, size: {} };
    for (let i = 0; i < this.len; i++) {
      const value = this.valueByIds[field][i];
      if (value) {
        const group = this.idsByValue[field][value];
        if (group) {
          group.add(i);
        } else {
          this.idsByValue[field][value] = new Set([i]);
        }
      }
    }
  };

}

class ActiveSelectionsWithRec {
  // Active selections that computes recommendation and keep it sync-ed
  // Also computes interpolated scales and caches them
  constructor(data, updateRecommendation, onActiveSelectionChange) {
    this.data = data;
    this.updateRecommendation = updateRecommendation;

    this.as = new ActiveSelections(data.length, onActiveSelectionChange);
    this.classifier = new Classifier(data);
    this.recommendedAttrListsByField = {color: [], size: []};

    this.interpolatedScales = {color: {}, size: {}};
  }

  getValue = (field, id) => this.as.getValue(field, id);

  getAllGroups = (field) => this.as.getAllGroups(field);

  getAllGroupsWithValue = (field) => this.as.getAllGroupsWithValue(field);

  getInterpolatedScale = (field, attrName) => this.interpolatedScales[field][attrName];

  hasActiveSelection = (field) => this.as.hasActiveSelection(field);

  assignValue = (field, selectedIds, value) => {
    this.as.assignValue(field, selectedIds, value);
    this._updateRecommendation(field);
    this._updateInterpolatedScales(field);
  };

  resetValue = (field, selectedIds) => {
    this.assignValue(field, selectedIds);
  };

  _updateRecommendation = (field) => {
    this.recommendedAttrListsByField[field] = this.classifier.getMostSimilarAttr(
      this.getAllGroups(field),
      2,
    );
    this.updateRecommendation(this.flatten(this.recommendedAttrListsByField));
  };

  _updateInterpolatedScales = (field) => {
    this.interpolatedScales[field] = {};
    let scale;
    for (let attrName of this.recommendedAttrListsByField[field]) {
      if (field === 'color') {
        scale = ColorUtil.interpolateColorScale(
          this.as.getAllGroupsWithValue('color'),
          this.data,
          attrName,
        );
      } else if (field === 'size') {
        // We do not actually interpolate size scales. Using the generic one instead
        scale = d3.scaleLinear()
        .domain(expandRange(d3.extent(this.data, d => d[attrName]))).range([3, 15]);
      }
      this.interpolatedScales[field][attrName] = scale;
    }
  };

  flatten = (recommendedAttrListsByField) => {
    const flat = [];
    for (const [field, list] of Object.entries(recommendedAttrListsByField)) {
      for (const attrName of list) {
        flat.push({field: field, attrName: attrName});
      }
    }
    return flat;
  };

}

export { ActiveSelectionsWithRec };