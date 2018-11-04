// import * as d3 from 'd3';
import { Filter } from '../Filter';
import { FilterManager } from '../FilterManager';

export interface DataEntry {
  readonly __id_extra__: number,
  readonly [key: string]: number | string,
}

export type Data = Readonly<DataEntry[]>;

export type AttrType = 'number' | 'string';

export class Attribute {
  readonly name: string;
  readonly type: AttrType;
  constructor(name: string, type: AttrType) {
    this.name = name;
    this.type = type;
  }
}

export enum DraggableType {
  ATTRIBUTE = 'attribute',
};

export enum Field {
  X = 'x',
  Y = 'y',
  COLOR = 'color',
  SIZE = 'size',
}

export enum VField {
  COLOR = 'color',
  SIZE = 'size',
}

export enum RFkey { // recommended filter keys
  SELECTED = 'selected',
  X = 'x',
  Y = 'y',
  SIMILAR_ATTR = 'similar_attr',
  SIMILAR = 'similar',
}

export enum PointState {
  NORMAL,
  FILTERED,
  TO_FILTER,
  TO_RESTORE,
}

// Can't call range() on this type as there's no common signature.
// See Issue#7294 https://github.com/Microsoft/TypeScript/issues/7294
// export type NumericRangeScaleNative = 
//   d3.ScaleContinuousNumeric<number, number> | 
//   d3.ScalePoint<string>;

// Override the native scale types as a workaround so that
//    we can call range()
// This type must be general enough so that we can cast native
//    scales generated by d3 methods, such as ScaleLinear or ScalePoint
export interface NumericRangeScale {
  (val: number | string): number,
  range: (range: ReadonlyArray<number>) => this,
  copy: () => this,
}

export type StringRangeScale<Domain> = (val: Domain) => string;


export class PlotConfigEntry {
  readonly attribute: Attribute;
  readonly useCustomScale?: boolean;
  constructor(attribute: Attribute, useCustomScale: boolean = false) {
    this.attribute = attribute;
    this.useCustomScale = useCustomScale;
  }
}

// Used as Readonly in props/states, but may be mutated in other context
export interface PlotConfig {
  [Field.X]?: PlotConfigEntry,
  [Field.Y]?: PlotConfigEntry,
  [Field.COLOR]?: PlotConfigEntry,
  [Field.SIZE]?: PlotConfigEntry,
}

// Used as Readonly in props/states, but may be mutated in other context
export interface ColorPickerStyle {
  left?: number,
  top?: number,
  display?: string,
}

// Used as Readonly in props/states, but may be mutated in other context
export interface RecommendedAttrListsByField {
  color: string[], // A list of attributes
  size: string[],
}

// Used as Readonly in props/states, but may be mutated in other context
export interface MinimapScaleMap {
  xScale: NumericRangeScale | null,
  yScale: NumericRangeScale | null,
}


export interface ColorObj {
  // only need hsl field
  readonly hsl: HSLColor,
}

export interface HSLColor {
  // note this is different from the d3 HSLColor type
  readonly h: number,
  readonly s: number,
  readonly l: number,
  readonly a?: number,
}

export type HandlePickColor = (
  colorObj: ColorObj,
) => void;

export type SetPlotConfig = (
  field: Field | VField, 
  plotConfigEntry?: PlotConfigEntry,
  keepSelection?: boolean, 
  callback?: () => void,
) => void;

export interface RecommendedEncoding {
  readonly field: VField,
  readonly attrName: string,
}


export type HandleAcceptRecCard = () => void;

export type HandleHoverRecCard = (
  ev: React.MouseEvent<Element>,
) => void;

export type HandleDismissRecCard = () => void;

export type HandleAcceptRecommendedEncoding = (
  field: VField,
  attrName: string,
) => void;

export type HandleDismissRecommendedEncoding = (
  filed: VField,
  attrName: string,
) => void;

export type HandleHoverRecommendedEncoding = (
  ev: React.MouseEvent<Element>,
  field: VField,
  attrName: string,
) => void;

export type HandleAcceptRecommendedFilter = (
  filter: Filter,
) => void;

export type HandleHoverRecommendedFilter = (
  ev: React.MouseEvent<Element>,
  filter: Filter,
) => void;

export type HandleDismissRecommendedFilter = (
  key: RFkey,
) => void;

export type HandleDismissAllRecommendations = () => void;


export type HandleHoverFilter = (
  ev: React.MouseEvent<Element>,
  filter: Filter,
) => void;


export type HandleFilterListChange = (
  fm: FilterManager,
) => void;

export type HandleAddFilter = (
  filter: Filter,
) => void;

export type HandleSetFilter = (
  fid: number,
  filter: Filter,
) => void;

export type HandleRemoveFilter = (
  fid: number,
) => void


export type PointStateGetter = (
  d: DataEntry,
) => PointState;


export type HandleHoverDrop = (
  ev: React.MouseEvent<Element>,
) => void;


export type HandlePendingSelectionChange = (
  selection: ReadonlySet<number>,
  pending: ReadonlySet<number>,
) => void;

export type HandleSelectionChange = (
  selection: ReadonlySet<number>,
) => void;