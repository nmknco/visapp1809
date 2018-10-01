import { ColorUtil } from './util'
import { Classifier } from './Classifier';


class ActiveSelections {
  constructor(len) {
    this.colorByIds = Array(len);
    this.idsByHSL = {};
  }

  getColor = (id) => this.colorByIds[id];

  getAllColorGroups = () => Object.values(this.idsByHSL);

  getAllColorGroupsWithColor = () => this.idsByHSL;

  assignColor = (selectedIds, colorObj) => {
    for (const id of selectedIds) {
      this.colorByIds[id] = colorObj;
    }
    this._updateIdsByHSL();
  };

  resetColor = (selectedIds) => {
    // If no selection (empty or not) passed, reset all color
    if (!selectedIds) {
      this.colorByIds = Array(this.colorByIds.length);
      this.idsByHSL = {};
    } else {
      this.assignColor(selectedIds, undefined);
      this._updateIdsByHSL();
    }
  };

  _updateIdsByHSL = () => {
    this.idsByHSL = {};
    for (let i = 0; i < this.colorByIds.length; i++) {
      const colorObj = this.colorByIds[i];
      if (colorObj) {
        const hsl = ColorUtil.hslToString(colorObj.hsl)
        const group = this.idsByHSL[hsl];
        if (group) {
          group.add(i);
        } else {
          this.idsByHSL[hsl] = new Set([i]);
        }
      }
    }
  };
}

class ActiveSelectionsWithRec {
  // Active selections that computes recommendation and keep it sync-ed
  // Also computes interpolated scales and caches them
  constructor(data, updateRecommendation) {
    this.data = data;
    this.updateRecommendation = updateRecommendation;

    this.as = new ActiveSelections(data.length);
    this.classifier = new Classifier(data);
    this.suggestedAttrList = [];
    this.interpolatedColorScales = {};
  }

  getColor = (id) => this.as.getColor(id);

  getAllColorGroups = () => this.as.getAllColorGroups();

  getAllColorGroupsWithColor = () => this.as.getAllColorGroupsWithColor();

  getInterpolatedColorScale = (color_attr) => this.interpolatedColorScales[color_attr];

  assignColor = (selectedIds, colorObj) => {
    this.as.assignColor(selectedIds, colorObj);
    this._updateRecommendation();
    this._updateInterpolatedColorScales();
  };

  resetColor = (selectedIds) => {
    this.as.resetColor(selectedIds);
    this._updateRecommendation();
    this._updateInterpolatedColorScales();
  }

  _updateRecommendation = () => {
    this.suggestedAttrList = this.classifier.getMostSimilarAttr(
      this.as.getAllColorGroups(), 
      2,
    );
    this.updateRecommendation(this.suggestedAttrList);
  }

  _updateInterpolatedColorScales = () => {
    this.interpolatedColorScales = {};
    let colorScale;
    for (let color_attr of this.suggestedAttrList) {
      colorScale = ColorUtil.interpolateColorScale(
        this.as.getAllColorGroupsWithColor(),
        this.data,
        color_attr,
      );
      this.interpolatedColorScales[color_attr] = colorScale;
    }
  };
}

export { ActiveSelectionsWithRec };