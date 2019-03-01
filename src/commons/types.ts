// import * as d3 from 'd3';
import { Filter } from '../Filter';
import { PlotConfigEntry } from '../PlotConfigEntry';

import { ColorObj } from './util';

export interface GeneralDataEntry {
  readonly __id_extra__: string,
  readonly [key: string]: number | string,
}

export type DataEntry = GeneralDataEntry

export interface GroupDataEntry extends GeneralDataEntry {
  readonly __is_group__: number,
}

export type Data = ReadonlyArray<DataEntry>;

export type GroupData = ReadonlyArray<GroupDataEntry>;

export type GeneralData = ReadonlyArray<GeneralDataEntry>;

export interface NestedDataEntry {
  key: string;
  values: any;
  value: {} | undefined; // seems unavoidable
}

export type AttrType = 'number' | 'string';

export enum DraggableType {
  ATTRIBUTE = 'attribute',
};

export enum PField {
  X = 'x',
  Y = 'y',
}

export enum VField {
  COLOR = 'color',
  SIZE = 'size',
}

export enum GField {
  GROUP = 'group',
}

export type Field = PField | VField | GField;
export const Fields = 
  Object.values(PField)
    .concat(Object.values(GField))
    .concat(Object.values(VField));

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

export enum ChartType {
  SCATTER_PLOT = 'scatterplot',
  BAR_CHART = 'barchart',
  BAR_STACK = 'barstack',
}

export enum OverlayMenu {
  COLOR_NUM = 'color_num',
  COLOR_ORD = 'color_ord',
  SIZE = 'size',
}

export enum ResizingDirection {
  X = 'x',
  Y = 'y',
}

export enum VisualScaleType {
  COLOR_NUM = 'color_num',
  COLOR_ORD = 'color_ord',
  SIZE = 'size',
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
export interface NumericRangeScale<Domain> {
  (val: Domain): number;
  range: () => number[];
  domain: () => Domain[];
}

export interface StringRangeScale<Domain> {
  (val: Domain): string;
  range: () => string[];
  domain: () => Domain[];
}



// Used as Readonly in props/states, but may be mutated in other context
export interface PlotConfig {
  [PField.X]?: PlotConfigEntry;
  [PField.Y]?: PlotConfigEntry;
  [VField.COLOR]?: PlotConfigEntry;
  [VField.SIZE]?: PlotConfigEntry;
  [GField.GROUP]?: PlotConfigEntry;
}

// Used as Readonly in props/states, but may be mutated in other context
export interface ColorPickerStyle {
  left?: number;
  top?: number;
  display?: 'none' | 'initial';
}

// Used as Readonly in props/states, but may be mutated in other context
export interface RecommendedAttrListsByField {
  [VField.COLOR]: string[]; // A list of attributes
  [VField.SIZE]: string[];
}

// Used as Readonly in props/states, but may be mutated in other context
export interface MinimapScaleMap {
  xScale: NumericRangeScale<number | string> | null;
  yScale: NumericRangeScale<number | string> | null;
}

export interface VisualScaleMap {
  [VisualScaleType.COLOR_NUM]: StringRangeScale<number> | null;
  [VisualScaleType.COLOR_ORD]: StringRangeScale<string> | null;
  [VisualScaleType.SIZE]: NumericRangeScale<number> | null;
}

export enum Stat {
  SUM = 'sum',
  MEAN = 'mean',
}

export enum D3Interpolate {
  VIRIDIS = 'Viridis',
  INFERNO = 'Inferno',
  WARM = 'Warm',
  COOL = 'Cool',
  REDS = 'Reds',
  BLUES = 'Blues',
  GREENS = 'Greens',
  GREYS = 'Greys',
  PUBUGN = 'PuBuGn',
  RDPU = 'RdPu',
  YLGRBU = 'YlGnBu',
  YLORRD = 'YlOrRd',
};

export enum D3Scheme {
  CATEGORY10 = 'Category10',
  SET1 = 'Set1',
  SET2 = 'Set2',
  ACCENT = 'Accent',
  DARK2 = 'Dark2',
  PASTEL1 = 'Pastel1',
};

// export type ColorNumRange = Readonly<[ColorObj, ColorObj]>
export type ColorNumRange = Readonly<[string, string]>

export interface VisualScaleRanges {
  [VisualScaleType.COLOR_NUM]: ColorNumRange; // the d3 interplotates
  [VisualScaleType.COLOR_ORD]: D3Scheme; // d3.schemeCategory10, etc.
  [VisualScaleType.SIZE]: Readonly<[number, number]>;
}

export interface DefaultVisualValues {
  [VField.COLOR]: string;
  [VField.SIZE]: number;
}


export type HandlePickColor = (
  colorObj: ColorObj,
) => void;

export type HandlePickSize = (
  size: number,
) => void;

export type SetPlotConfig = (
  field: Field | VField, 
  plotConfigEntry?: PlotConfigEntry,
  callback?: () => void,
) => void;



export interface RecommendedEncoding {
  readonly field: Field;
  readonly attrName: string;
}

export type ToggleColorPicker = (
  ev: MouseEvent,
  on: boolean,
) => void;


export type HandleAcceptRecCard = () => void;

export type HandleHoverRecCard = (
  ev: React.MouseEvent<Element>,
) => void;

export type HandleDismissRecCard = () => void;

export type HandleAcceptRecommendedEncoding = (
  field: Field,
  attrName: string,
) => void;

export type HandleDismissRecommendedEncoding = (
  field: Field,
  attrName: string,
) => void;

export type HandleHoverRecommendedEncoding= (
  ev: React.MouseEvent<Element>,
  field: Field,
  attrName: string,
) => void;


export interface Order {
  readonly attrName: string;
  readonly asce: boolean;
}

export type HandleAcceptRecommendedOrder = (
  order: Order,
) => void;

export type HandleDismissRecommendedOrder = (
  order: Order,
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


export type HandleFilterListChange = () => void;

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
  selection: ReadonlySet<string>,
  pending: ReadonlySet<string>,
) => void;

export type HandleSelectionChange = (
  selection: ReadonlySet<string>,
) => void;


export type HandleInputChange = (
  value: string,
) => void;

export type HandleSearchInputChange = HandleInputChange;


export type HandleSetColorNumRange = (
  range: ColorNumRange,
) => void;

export type HandleSetColorOrdRange = (
  palette: D3Scheme,
) => void;

export type HandleSetSizeRange = (
  range: Readonly<[number, number]>,
) => void;


export interface AnimationConfig {
  readonly dragSpeed: number;
  readonly startDelay: number;
  readonly endDelay: number;
}

export type HandleSelectChartType = (
  chartType: ChartType,
) => void;


export type GetVisualScaleRange = (
  type: VisualScaleType,
) => ColorNumRange | D3Scheme | Readonly<[number, number]>;

export type SetVisualScales = (
  visualScaleType: VisualScaleType,
  value: StringRangeScale<number> | StringRangeScale<string> | NumericRangeScale<number> | null,
  resetRange?: boolean,
) => void;

export type GetDefaultVisualValue = (
  vfield: VField,
) => number | string;

export type HandleActiveSelectionChange = (
  vfield: VField,
) => void;

export type UpdateRecommendedEncodings = (
  recommendedEncodings: ReadonlyArray<RecommendedEncoding>
) => void;

export type UpdateRecommendedOrders = (
  recommendedOrders: ReadonlyArray<Order>
) => void;

export type HandleResize = (
  size: number,
) => void;

export type HandleResizeFinish = (
  size: number,
) => void;

export type HandleChangeVisualByUser = (
  vfield: VField,
  value: string,
  options?: {
    clearSelection?: boolean,
    preventUpdateRecommendation?: boolean,
  },
) => void;

export type SetIsDragging = (
  isDragging: boolean,
) => void;

export type HandleDragEnd = (
  idSetDroppedToFilter: ReadonlySet<string>,
) => void;