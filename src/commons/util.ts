import * as d3 from 'd3'; 

import { LIT, SAT } from '../ColorPicker';

import { DEFAULT_DOT_SIZE, MAX_DOT_SIZE_RANGE, ORD_COLORS } from './constants';
import { 
  CustomError,
  InvalidHSLStringError,
  NoStatError,
} from './errors';
import {
  memoizedGetExtent,
  memoizedGetUniqueValueList,
  memoizedGetValueList,
} from './memoized';
import {
  Data,
  GeneralData,
  GeneralDataEntry,
  NestedDataEntry,
  NumericRangeScale,
  Stat,
  StringRangeScale,
} from './types';

export class Pos {
  readonly x: number;
  readonly y: number;
  
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

export class ColorObj {
  // only need hsl field
  readonly hsl: HSLColor;

  constructor(hsl: HSLColor) {
    this.hsl = hsl;
  }
}

export class HSLColor {
  // note this is different from the d3 HSLColor type
  readonly h: number;
  readonly s: number; // between 0 and 1
  readonly l: number; // between 0 and 1
  readonly a?: number;

  constructor(h: number, s: number, l: number, a?: number) {
    this.h = h;
    this.s = s;
    this.l = l;
    this.a = a;
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
    return new HSLColor(h, s, l);
  }

  static interpolateColorScale = (
    extent: Readonly<[number, number]>,
    pivots: Readonly<[number, number]>,
    pivotColors: Readonly<[HSLColor, HSLColor]>,
  ): StringRangeScale<number> => {

    const [min, max] = extent;
    const [v1, v2] = pivots;
    const [hsl1, hsl2] = pivotColors;

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

    colorScale.domain = () => [min, max];
    colorScale.range = () => ([min, max]).map(colorScale);

    return colorScale;
  };


  static interpolateOrdinalColorScaleWithData = (
    idsByHSL: {[key: string]: ReadonlySet<string>},
    data: GeneralData,
    colorAttrName: string,
  ): StringRangeScale<string> => {
    const colorByValue: {[key: string]: string} = {};
    const customColors: string[] = [];
    for (const [color, idGroup] of Object.entries(idsByHSL)) {
      // assuming threshold > 0.5, just use mid value as the majority
      const vals = data.filter(d => idGroup.has(d.__id_extra__))
        .map(d => d[colorAttrName] as string)
        .sort((a, b) => (a).localeCompare(b));
      const majVal = vals[Math.floor(vals.length / 2)];
      colorByValue[majVal] = color;
      customColors.push(color);
    }
    let customValIndex = 0;
    for (const val of memoizedGetValueList(data, colorAttrName)) {
      if (!colorByValue.hasOwnProperty(val)) {
        colorByValue[val] = ORD_COLORS[customValIndex++ % ORD_COLORS.length];
      }
    }
    const scale = (val: string) => colorByValue[val];
    scale.range = () => ORD_COLORS.concat(customColors);
    scale.domain = () => memoizedGetUniqueValueList(data, colorAttrName) as string[];

    return scale;
  }


  static interpolateColorScaleWithData = (
    idsByHSL: {[key: string]: ReadonlySet<string>},
    data: GeneralData,
    colorAttrName: string,
  ): StringRangeScale<number> => {
    // Use two colors at most - now use the two with most distant data value

    // console.log(idsByHSL);
    const entries = Object.entries(idsByHSL);
    if (entries.length === 1) {
      // for one group, use median as the pivot to interpolate the color scale
      const [hs, g] = entries[0];
      const med = d3.median(data.filter(d => g.has(d.__id_extra__)), d => d[colorAttrName] as number);
      if (med === undefined) {
        throw new NoStatError(colorAttrName, 'median');
      }
      return ColorUtil.interpolateColorScaleWithDataOneGroup(
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
        data.filter(d => group.has(d.__id_extra__.toString())), d => d[colorAttrName] as number
      );
    }
    entries.sort((ea, eb) => medians[ea[0]] - medians[eb[0]]);

    const hslStr1 = entries[0][0];
    const hslStr2 = entries[entries.length - 1][0];
    const [hsl1, hsl2] = [hslStr1, hslStr2].map(ColorUtil.stringToHSL);
    const [v1, v2] = [hslStr1, hslStr2].map(hs => medians[hs]);

    const [min, max] = memoizedGetExtent(data, colorAttrName);

    return ColorUtil.interpolateColorScale(
      [min, max],
      [v1, v2],
      [hsl1, hsl2],
    );
  };

  static interpolateColorScaleWithDataOneGroup = (pivotValue: number, pivotHSLColor: HSLColor, data: Data, colorAttrName: string) => {
    const [min, max] = memoizedGetExtent(data, colorAttrName);
    const [lmin, lmax] = [0.7, 0.1]
    const colorScale: StringRangeScale<number> = (val) => {
      let l: number = pivotHSLColor.l;
      if (min !== max) {
        if (val < pivotValue) {
          // assert pivotValue > min
          l = lmin + (val - min) / (pivotValue - min) * (pivotHSLColor.l - lmin);
        } else if (val > pivotValue) {
          // assert pivotValue < max
          l = lmax - (max - val) / (max - pivotValue) * (lmax - pivotHSLColor.l);
        }
      }
      // console.log(val)
      return (ColorUtil.hslToString(new HSLColor(pivotHSLColor.h, pivotHSLColor.s, l)));
    };
    colorScale.domain = () => [min, max];
    colorScale.range = () => ([min, max]).map(colorScale);

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


export const interpolateSizeScaleWithData = (
  idsBySize: {[key: string]: ReadonlySet<string>},
  data: GeneralData,
  sizeAttrName: string,
): NumericRangeScale<number> => {

  let [z0, z1] = d3.extent(Object.keys(idsBySize).map(Number));
  if (z0 === undefined || z1 === undefined) {
    throw new CustomError('Cannot get extent from idsBySize');
  }

  // use the medians in the min and max group as value for creating the linear scale
  let [med0, med1] = ([z0, z1])
    .map(z => idsBySize[z.toString()])
    .map(s => data.filter(d => s.has(d.__id_extra__)).map(d => d[sizeAttrName]) as number[])
    .map(vals => d3.median(vals));

  if (med0 === undefined || med1 === undefined) {
    throw new CustomError('Cannot get medians from extreme size groups');
  }

  // global min/max. We use 00 and 11 instead of min/max to emphasize
  //  that the mapping might be reversed
  const [v00, v11] = memoizedGetExtent(data, sizeAttrName);

  if (z0 === z1) {
    // this implies med0 === med1
    const z2 = DEFAULT_DOT_SIZE;
    let med2 = d3.median(data, d => d[sizeAttrName] as number);
    if (med2 === undefined) {
      throw new NoStatError(sizeAttrName, 'median');
    }
    if (med2 === med0) {
      // if median doesn't work, use extreme values (choose the one further from med0 and med1)
      med2 = Math.abs(v00 - med0) > Math.abs(v11 - med0) ? v00 : v11;
    }
    if (z2 < z0) {
      z0 = z2;
      med0 = med2;
    } else {
      z1 = z2;
      med1 = med2;
    }
  }



  const unrestrictedScale = d3.scaleLinear().domain([med0, med1]).range([z0, z1]);


  let [z00, z11] = ([v00, v11]).map(unrestrictedScale);

  // console.log([v00, v11], [z00, z11]);
  if (z00 < z11) {
    z00 = Math.max(MAX_DOT_SIZE_RANGE[0], z00);
    z11 = Math.min(MAX_DOT_SIZE_RANGE[1], z11);
  } else {
    z00 = Math.min(MAX_DOT_SIZE_RANGE[1], z00);
    z11 = Math.max(MAX_DOT_SIZE_RANGE[0], z11);   
  }

  // console.log([v00, v11], [z00, z11]);
  return d3.scaleLinear().domain([v00, v11]).range([z00, z11]);
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
};

export const getDropBackgroundColor = (isOver: boolean | undefined, canDrop: boolean | undefined) => {
  /**
   * Both isOver and canDrop are false if not currently dragging
   */
  return isOver ? 
    (canDrop ? '#ccffcc' : '#eecccc') :
    (canDrop ? '#ffff99' : undefined)
};

export const sumTo = (a: number[], count: number) => {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += a[i];
  }
  return sum;
}

export const getNestedExtent = (
  nestedData: NestedDataEntry[],
  attrName: string,
  depth: 1 | 2 = 1,
): Readonly<[number, number]> => {
  const [min, max] = d3.extent(nestedData, e => 
    depth === 1 ? e.value![attrName] : 
    d3.sum(e.values.map((e2: NestedDataEntry) => e2.value![attrName]))
  );
  if (min === undefined || max === undefined) {
    throw new NoStatError(attrName, 'extent');
  }
  return [min, max];
};

export const getStat = (
  values: Data,
  attrName: string,
  stat: Stat,
) => {
  // @ts-ignore
  const m = d3[stat](values, (d: GeneralDataEntry) => d[attrName] as number);
  if (m === undefined) {
    throw new NoStatError(attrName, stat);
  }
  return m;
};


export const replaceWhiteSpaceWith = (str: string, repl: string) => 
  str.replace(/\s/g, repl);