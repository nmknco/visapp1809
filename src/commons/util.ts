import * as d3 from 'd3'; 

import { LIT, SAT } from '../ColorPicker';

import { 
  InvalidHSLStringError,
  NoMedianError,
} from './errors';
import { memoizedGetExtent } from './memoized';
import {
  Data, 
  HSLColor,
  StringRangeScale,
} from './types';

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

  clipToRect = (rect: Rect) => {
    // used to clip pos within an arbitrary given Rect in the same refenrece system
    return new Pos(
      Math.max(Math.min(this.x, rect.r), rect.l),
      Math.max(Math.min(this.y, rect.b), rect.t),
    );
  }
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

  static updateNodeByRect = (node: SVGRectElement, rect: Rect) => {
    node.setAttribute('x', rect.l.toString());
    node.setAttribute('y', rect.t.toString());
    node.setAttribute('width', rect.w.toString());
    node.setAttribute('height', rect.h.toString());
  };
}

export class SelUtil {

  static getEventPosRelativeToBox = (
    ev: MouseEvent,
    box: SVGRectElement | HTMLDivElement,
  ) => SelUtil.getPosRelativeToBox(new Pos(ev.clientX, ev.clientY), box);

  static getEventPosRelativeToBoxClipped = (
    ev: MouseEvent,
    box: SVGRectElement | HTMLDivElement,
  ) => SelUtil.getPosRelativeToBoxClipped(new Pos(ev.clientX, ev.clientY), box);

  static getPosRelativeToBoxClipped = (
    pos: Pos,
    box: SVGRectElement | HTMLDivElement,
  ) => {
    // Compute mouse position for events relative to the reference <rect> element
    //     - clipped at the edges
    const relPos = SelUtil.getPosRelativeToBox(pos, box);
    return SelUtil.clipRelativePosition(relPos, box);
  };

  static clipRelativePosition = (
    posRelativeToBox: Pos,
    box: SVGRectElement | HTMLDivElement,
  ) => {
    let w: number;
    let h: number;
    if (box instanceof SVGRectElement) {
      w = Number(box.getAttribute('width') || 0);
      h = Number(box.getAttribute('height') || 0);
    } else {
      w = box.offsetWidth;
      h = box.offsetHeight;
    }
    return posRelativeToBox.clipToRect(
      new Rect(new Pos(0, 0), new Pos(w, h))
    );
  };

  static getPosRelativeToBox = (
    pos: Pos,
    box: SVGRectElement | HTMLDivElement,
  ) => {
    const rect = box.getBoundingClientRect();
    return new Pos(
      pos.x - rect.left,
      pos.y - rect.top
    );
  };

  static getPosAbsoluteFromBox = (
    posRelativeToBox: Pos,
    box: SVGRectElement | HTMLDivElement,
  ) => {
    const rect = box.getBoundingClientRect();
    return new Pos(
      posRelativeToBox.x + rect.left,
      posRelativeToBox.y + rect.top
    );
  }
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
    idsByHSL: {[key: string]: ReadonlySet<number>},
    data: Data,
    colorAttrName: string
  ): StringRangeScale<number> => {
    // Use two colors at most - now use the two with most distant data value

    // console.log(idsByHSL);
    const entries = Object.entries(idsByHSL);
    if (entries.length === 1) {
      // for one group, use median as the pivot to interpolate the color scale
      const [hs, g] = entries[0];
      const med = d3.median(data.filter(d => g.has(d.__id_extra__)), d => d[colorAttrName] as number);
      if (med === undefined) {
        throw new NoMedianError(colorAttrName);
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
        data.filter(d => group.has(d.__id_extra__)), d => d[colorAttrName] as number
      );
    }
    entries.sort((ea, eb) => medians[ea[0]] - medians[eb[0]]);

    const hslStr1 = entries[0][0];
    const hslStr2 = entries[entries.length - 1][0];
    const [hsl1, hsl2] = [hslStr1, hslStr2].map(ColorUtil.stringToHSL);
    const [v1, v2] = [hslStr1, hslStr2].map(hs => medians[hs]);

    const [min, max] = memoizedGetExtent(data, colorAttrName);

    const colorScale: StringRangeScale<number> = (val) => {
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
    const [min, max] = memoizedGetExtent(data, colorAttrName);
    const [lmin, lmax] = [0.7, 0.1]
    const colorScale: StringRangeScale<number> = (val) => {
      const hsl = { ...pivotHSLColor };
      if (min !== max) {
        if (val < pivotValue) {
          // assert pivotValue > min
          hsl.l = lmin + (val - min) / (pivotValue - min) * (hsl.l - lmin);
        } else if (val > pivotValue) {
          // assert pivotValue < max
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


export const subtract = (setA: Set<any> | ReadonlySet<any>, setB: Set<any> | ReadonlySet<any>) => {
  const diff = new Set(setA);
  for (const elem of setB) {
      diff.delete(elem);
  }
  return diff;
}

export const getDropBackgroundColor = (isOver: boolean | undefined, canDrop: boolean | undefined) => {
  /**
   * Both isOver and canDrop are false if not currently dragging
   */
  return isOver ? 
    (canDrop ? '#ccffcc' : '#eecccc') :
    (canDrop ? '#ffff99' : undefined)
}