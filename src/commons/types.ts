import * as d3 from 'd3';
import { Attribute } from '../Attributes';

export interface DataEntry {
  __id_extra__: number,
  [key: string]: any,
}

export type Data = DataEntry[];

export type AttrType = 'number' | 'other';

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

export type CustomColorScale = (val: number) => string;

// Used as Readonly in app states, but may be mutated in other context
export type Scale = d3.ScaleLinear<number, number> | 
    d3.ScalePoint<string> | CustomColorScale

// Used as Readonly in app states, but may be mutated in other context
export interface ColorPickerStyle {
  left: number,
  top: number,
  display: string,
}

// Used as Readonly in app states, but may be mutated in other context
export interface SuggestedAttrListsByField {
  color: string[],
  size: string[],
}

// Used as Readonly in app states, but may be mutated in other context
export interface ScaleMap {
  xScale: Scale | null,
  yScale: Scale | null,
}

// Used as Readonly in app states, but may be mutated in other context
export interface PlotConfig {
  [Field.X]?: PlotConfigEntry,
  [Field.Y]?: PlotConfigEntry,
  [Field.COLOR]?: PlotConfigEntry,
  [Field.SIZE]?: PlotConfigEntry,
}

export class PlotConfigEntry {
  readonly attribute: Attribute;
  readonly useCustomScale?: boolean;
  constructor(attribute: Attribute, useCustomScale: boolean = false) {
    this.attribute = attribute;
    this.useCustomScale = useCustomScale;
  }
}

export interface ColorObj {
  readonly hsl: HSLColor,
}

export interface HSLColor {
  readonly h: number,
  readonly s: number,
  readonly l: number,
  readonly a?: number,
}

export interface IdsByHSL {
  [key: string]: Set<number>
}


export type SetPlotConfig = (
  field: Field | VField, 
  plotConfigEntry?: PlotConfigEntry,
  keepSelection?: boolean, 
  callback?: () => void,
) => void;

export type HandleAcceptEncoding = (
  field: VField,
  attrName: string,
) => void;

export type HandleHoverEncodingCard = (
  ev: MouseEvent,
  field: VField,
  attrName: string,
) => void ;