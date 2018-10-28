import * as d3 from 'd3'; 

import { Attribute } from './Attributes'
import { LIT, SAT } from './ColorPicker';

import { InvalidHSLStringError, NoMedianError } from './commons/errors';
import {
  CustomColorScale,
  Data, 
  HSLColor,
  IdsByHSL,
} from './commons/types';
import { memoizeLast } from './memoize';

export class Pos {
  x: number;
  y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  distTo = (pos0: Pos): number => {
    return Math.sqrt((this.x - pos0.x)**2 + (this.y - pos0.y)**2);
  };

  relativeTo = (pos0: Pos): Pos => {
    return new Pos(this.x - pos0.x, this.y - pos0.y);
  };
}

export class Rect {
  l: number;
  t: number;
  r: number;
  b: number;
  w: number;
  h: number;

  constructor(pos0: Pos, pos1: Pos) {
    const {x: x0, y: y0} = pos0;
    const {x: x1, y: y1} = pos1;
    this.l = Math.min(x0, x1);
    this.t = Math.min(y0, y1);
    this.r = Math.max(x0, x1);
    this.b = Math.max(y0, y1);
    this.w = this.r - this.l;
    this.h = this.b - this.t;
  };

  containsCoor = (x: number, y: number): boolean => {
    return x >= this.l && x < this.r && y > this.t && y < this.b;
  };

  updateToNode = (rectNode: SVGRectElement) => {
    rectNode.setAttribute('x', this.l.toString());
    rectNode.setAttribute('y', this.t.toString());
    rectNode.setAttribute('width', this.w.toString());
    rectNode.setAttribute('height', this.h.toString());
  };
}

export class SelUtil {
  static calcPos = (ev: MouseEvent, reference: SVGRectElement) => {
    // Compute mouse position for events relative to reference <rect> element
    //     - clipped at the edges
    const w = reference.getAttribute('width');
    const h = reference.getAttribute('height');
    const rect = reference.getBoundingClientRect();
    let x = ev.clientX - rect.left;
    let y = ev.clientY - rect.top;
    x = Math.max(Math.min(x, Number(w||0)), 0);
    y = Math.max(Math.min(y, Number(h||0)), 0);
    return new Pos(x, y);
  };
}

export class ColorUtil {

  static hslToString = (hsl: HSLColor) => 
    `hsl(${Math.round(hsl.h*100)/100}`
    +`,${Math.round(hsl.s*10000)/100}%`
    +`,${Math.round(hsl.l*10000)/100}%)`;

  static stringToHSL = (hslStr: string) => {
    const strs = hslStr.match(/[.0-9]+/g)
    if (!strs) { 
      throw new InvalidHSLStringError();
    }
    const [h, s100, l100] = strs.map(Number);
    const s = s100 / 100;
    const l = l100 / 100;
    return {h, s, l};
  }

  static interpolateColorScale = (
    idsByHSL: IdsByHSL,
    data: Data,
    colorAttrName: string
  ): CustomColorScale => {
    // Use two colors at most - now use the two with most distant data value

    // console.log(idsByHSL);
    const entries = Object.entries(idsByHSL);
    if (entries.length === 1) {
      // for one group, use median as the pivot to interpolate the color scale
      const [hs, g] = entries[0];
      const med = d3.median(data.filter(d => g.has(d.__id_extra__)), d => d[colorAttrName]);
      if (med === undefined) {
        throw new NoMedianError();
      }
      return ColorUtil.interpolateColorScaleOneGroup(
        med,
        ColorUtil.stringToHSL(hs),
        data,
        colorAttrName,
      ); 
    }

    const medians = {}; // cache for faster sorting
    for (const e of entries) {
      const [color, group] = e;
      medians[color] = d3.median(
        data.filter(d => group.has(d.__id_extra__)), d => d[colorAttrName]
      );
    }
    entries.sort((ea, eb) => medians[ea[0]] - medians[eb[0]]);

    const hslStr1 = entries[0][0];
    const hslStr2 = entries[entries.length - 1][0];
    const [hsl1, hsl2] = [hslStr1, hslStr2].map(ColorUtil.stringToHSL);
    const [v1, v2] = [hslStr1, hslStr2].map(hs => medians[hs]);

    const [min, max] = d3.extent(data, d => d[colorAttrName]);

    const colorScale: CustomColorScale = (val) => {
      let hNew;
      let lNew;
      if (val <= v1) {
          hNew = hsl1.h
          lNew = ColorUtil.interpolate(min, v1, 0.8, hsl1.l, val);
      } else if (val <= v2) {
          hNew = ColorUtil.interpolate(v1, v2, hsl1.h, hsl2.h, val);
          lNew = LIT
      } else {
          hNew = hsl2.h
          lNew = ColorUtil.interpolate(v2, max, hsl2.l, 0.2, val);
      }
      return ColorUtil.hslToString({
        h: hNew, s: SAT, l: lNew,
      });
    };

    return colorScale;
  };

  static interpolateColorScaleOneGroup = (pivotValue: number, pivotHSLColor: HSLColor, data: Data, colorAttrName: string) => {
    const [min, max] = d3.extent(data, d => d[colorAttrName]);
    const [lmin, lmax] = [0.7, 0.1]
    const colorScale: CustomColorScale = (val) => {
      const hsl = { ...pivotHSLColor };
      if (min !== max) {
        if (val <= pivotValue) {
          hsl.l = lmin + (val - min) / (pivotValue - min) * (hsl.l - lmin);
        } else {
          hsl.l = lmax - (max - val) / (max - pivotValue) * (lmax - hsl.l);
        }
      }
      // console.log(val)
      return ColorUtil.hslToString(hsl);
    };

    return colorScale;
  };

  static interpolate = (x0: number, x1: number, y0: number, y1: number, x: number) => {
    if (x0 === x1) {
      return y0;
    };
    const k = (y1 - y0) / (x1 - x0);
    return y0 + k * (x - x0);
  }
}

export const expandRange = (extent: [number, number]) => {
  const [lo, hi] = extent;
  const len = hi - lo;
  return [lo - len * 0.05, hi + len * 0.05];
};

const getAttributes = (data: Data) => {
  console.log('Recomputing attributes')
  let attrList: Readonly<Attribute[]>
  if (data && data.length > 0) {
    const d0 = data[0];
    attrList = Object.keys(d0)
      .filter(attrName => attrName !== '__id_extra__')
      .map(attrName => new Attribute(
        attrName,
        (typeof d0[attrName] === 'number') ? 'number' : 'other'
      ));
  } else {
    attrList = [];
  };
  return attrList;
};

export const memoizedGetAttributes = memoizeLast(getAttributes);