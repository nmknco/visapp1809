import * as d3 from 'd3';

import { Classifier } from './Classifier';

import { DEFAULT_DOT_SIZE_RANGE } from './commons/constants';
import { CustomError } from './commons/errors';
import { memoizedGetExtent } from './commons/memoized';
import {
  GeneralData,
  HandleActiveSelectionChange,
  NumericRangeScale,
  RecommendedAttrListsByField,
  RecommendedEncoding,
  StringRangeScale,
  UpdateRecommendation,
  VField,
} from './commons/types';
import { ColorUtil, expandRange } from './commons/util';


class ActiveSelections {
  private readonly valueById: {
    [VField.COLOR]: {[key: string]: string | undefined},
    [VField.SIZE]: {[key: string]: string | undefined},
  };
  private readonly idsByValue: {
    [VField.COLOR]: {[key: string]: Set<string>},
    [VField.SIZE]: {[key: string]: Set<string>},
  };

  private readonly onActiveSelectionChange: HandleActiveSelectionChange;

  constructor(
    onActiveSelectionChange: HandleActiveSelectionChange,
  ){
    this.valueById = { [VField.COLOR]: {}, [VField.SIZE]: {} };
    this.idsByValue = { [VField.COLOR]: {}, [VField.SIZE]: {} };

    this.onActiveSelectionChange = onActiveSelectionChange;
  }

  getValue = (vfield: VField, id: string) => this.valueById[vfield][id];

  getAllGroups = (vfield: VField) => Object.values(this.idsByValue[vfield]);

  getAllGroupsWithValue = (vfield: VField) => this.idsByValue[vfield];

  hasActiveSelection = (vfield: VField) => Object.keys(this.idsByValue[vfield]).length > 0;

  assignValue = (
    vfield: VField,
    selectedIds?: ReadonlySet<string>,
    value?: string,
  ) => {
    // If no selectedIds passed, reset all
    if (!selectedIds) {
      this.valueById[vfield] = {};
      this.idsByValue[vfield] = {};
    } else {
      for (const id of selectedIds) {
        this.valueById[vfield][id] = value;
      }
      this.updateIdsByValue(vfield);
    }
    this.onActiveSelectionChange(vfield);
  };

  private updateIdsByValue = (vfield: VField) => {
    this.idsByValue[vfield] = {};
    for (const [key, value] of Object.entries(this.valueById[vfield])) {
      if (value) {
        const group = this.idsByValue[vfield][value];
        if (group) {
          group.add(key);
        } else {
          this.idsByValue[vfield][value] = new Set([key]);
        }
      }
    }
  };

}

class ActiveSelectionsWithRec {
  // Active selections that computes recommendation and keep it sync-ed
  // Also computes interpolated scales and caches them
  private readonly getData: () => GeneralData;
  private readonly updateRecommendation: UpdateRecommendation;

  private readonly as: ActiveSelections;
  private readonly classifier: Classifier;
  private readonly recommendedAttrListsByField: RecommendedAttrListsByField;
  private readonly interpolatedScales: {
    [VField.COLOR]: {[key: string]: StringRangeScale<number>},
    [VField.SIZE]: {[key: string]: NumericRangeScale<number>},
  }

  constructor(
    getData: () => GeneralData,
    updateRecommendation: UpdateRecommendation,
    onActiveSelectionChange: HandleActiveSelectionChange,
  ){
    this.getData = getData;
    this.updateRecommendation = updateRecommendation;

    this.as = new ActiveSelections(onActiveSelectionChange);
    this.classifier = new Classifier(getData);
    this.recommendedAttrListsByField = {[VField.COLOR]: [], [VField.SIZE]: []};

    this.interpolatedScales = {[VField.COLOR]: {}, [VField.SIZE]: {}};
  }

  getValue = (vfield: VField, id: string) => this.as.getValue(vfield, id);

  getAllGroups = (vfield: VField) => this.as.getAllGroups(vfield);

  getAllGroupsWithValue = (vfield: VField) => this.as.getAllGroupsWithValue(vfield);

  getInterpolatedScale = (vfield: VField, attrName: string) => this.interpolatedScales[vfield][attrName];

  hasActiveSelection = (vfield: VField) => this.as.hasActiveSelection(vfield);

  assignValue = (
    vfield: VField,
    selectedIds?: ReadonlySet<string>,
    value?: string,
  ) => {
    this.as.assignValue(vfield, selectedIds, value);
    this.computeAndUpdateRecommendation(vfield);
    this.updateInterpolatedScales(vfield);
  };

  resetValue = (vfield: VField, selectedIds?: ReadonlySet<string>) => {
    this.assignValue(vfield, selectedIds);
  };

  private computeAndUpdateRecommendation = (vfield: VField) => {
    this.recommendedAttrListsByField[vfield] = this.classifier.getMostSimilarAttr(
      this.getAllGroups(vfield),
      2,
    );
    this.updateRecommendation(this.flatten(this.recommendedAttrListsByField));
  };

  private updateInterpolatedScales = (vfield: VField) => {
    const data = this.getData();
    this.interpolatedScales[vfield] = {};
    let scale;
    for (const attrName of this.recommendedAttrListsByField[vfield]) {
      if (vfield === VField.COLOR) {
        scale = ColorUtil.interpolateColorScaleWithData(
          this.as.getAllGroupsWithValue(VField.COLOR),
          data,
          attrName,
        );
      } else if (vfield === VField.SIZE) {
        // We do not actually interpolate size scales. Using the generic one instead
        scale = d3.scaleLinear()
          .domain(expandRange(memoizedGetExtent(data, attrName)))
          .range(DEFAULT_DOT_SIZE_RANGE) as NumericRangeScale<number>;
      }
      if (!scale) {
        throw new CustomError('Error generating custom scale');
      }
      this.interpolatedScales[vfield][attrName] = scale;
    }
  };

  private flatten = (recommendedAttrListsByField: RecommendedAttrListsByField): RecommendedEncoding[] => {
    const flat: RecommendedEncoding[] = [];
    for (const [vfield, list] of Object.entries(recommendedAttrListsByField)) {
      for (const attrName of list) {
        flat.push({field: vfield as VField, attrName});
      }
    }
    return flat;
  };

}

export { ActiveSelectionsWithRec };