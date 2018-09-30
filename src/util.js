import * as d3 from 'd3'; 
import { HUES, SAT, LIT} from './ColorPicker';

class Pos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distTo(pos0) {
    return Math.sqrt((this.x - pos0.x)**2 + (this.y - pos0.y)**2);
  }
}

class Rect {
  constructor(pos0, pos1) {
    const {x: x0, y: y0} = pos0;
    const {x: x1, y: y1} = pos1;
    this.l = Math.min(x0, x1);
    this.t = Math.min(y0, y1);
    this.r = Math.max(x0, x1);
    this.b = Math.max(y0, y1);
    this.w = this.r - this.l;
    this.h = this.b - this.t;
  };

  containsCoor = (x, y) => {
    return x >= this.l && x < this.r && y > this.t && y < this.b;
  };

  updateToNode = (rectNode) => {
    rectNode.setAttribute('x', this.l);
    rectNode.setAttribute('y', this.t);
    rectNode.setAttribute('width', this.w);
    rectNode.setAttribute('height', this.h);
  };
}

class SelUtil {
  static calcPos = (e, relativeBg) => {
    // Compute mouse position for events - clipped at the edges
    const rect = relativeBg.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(Math.min(x, relativeBg.getAttribute('width')), 0);
    y = Math.max(Math.min(y, relativeBg.getAttribute('height')), 0);
    return new Pos(x, y);
  };
}

class ColorUtil {

  static hslToString = (hsl) => 
    `hsl(${Math.round(hsl.h*100)/100}`
    +`,${Math.round(hsl.s*10000)/100}%`
    +`,${Math.round(hsl.l*10000)/100}%)`;

  static stringToHSL = (hslStr) => {
    const [h, s100, l100] = hslStr.match(/[.0-9]+/g).map(Number);
    const s = s100 / 100, l = l100 / 100;
    return {h, s, l};
  }

  static interpolateColorScale = (idsByHSL, data, color_attr) => {
    // Use two colors at most
    // console.log(idsByHSL);
    const [e1, e2] = Object.entries(idsByHSL);
    const [hslStr1, group1] = e1;
    if (!e2) {
      return ColorUtil.interpolateColorScaleOneGroup(
        d3.median(data.filter(d => group1.has(d.__id_extra__)), d => d[color_attr]),
        ColorUtil.stringToHSL(hslStr1),
        data,
        color_attr,
      );
    }

    const [hslStr2, group2] = e2;
    let [hsl1, hsl2] = [hslStr1, hslStr2].map(ColorUtil.stringToHSL)
    let [v1, v2] = [group1, group2].map(
      s => d3.median(
        data.filter(d => s.has(d.__id_extra__)), 
        d => d[color_attr]
      )
    );

    if (v1 === v2) return null;
    if (v1 > v2) {
      [v1, v2] = [v2, v1];
      [hsl1, hsl2] = [hsl2, hsl1]
    }

    const [min, max] = d3.extent(data, d => d[color_attr]);

    const colorScale = (val) => {
      let h_new, l_new;
      if (val <= v1) {
          h_new = hsl1.h
          l_new = ColorUtil.interpolate(min, v1, 0.8, hsl1.l, val);
      } else if (val <= v2) {
          h_new = ColorUtil.interpolate(v1, v2, hsl1.h, hsl2.h, val);
          l_new = LIT
      } else {
          h_new = hsl2.h
          l_new = ColorUtil.interpolate(v2, max, hsl2.l, 0.2, val);
      }
      return ColorUtil.hslToString({
        h: h_new, s: SAT, l: l_new,
      });
    };

    return colorScale;
  };

  static interpolateColorScaleOneGroup = (pivot_value, pivot_color_hsl_obj, data, color_attr) => {
    const [min, max] = d3.extent(data, d => d[color_attr]);
    const [min_l, max_l] = [0.7, 0.1]
    const colorScale = (val) => {
      const hsl = { ...pivot_color_hsl_obj };
      if (min !== max) {
        if (val <= pivot_value) {
          hsl.l = min_l + (val - min) / (pivot_value - min) * (hsl.l - min_l);
        } else {
          hsl.l = max_l - (max - val) / (max - pivot_value) * (max_l - hsl.l);
        }
      }
      // console.log(val)
      return ColorUtil.hslToString(hsl);
    };

    return colorScale;
  };

  static interpolate = (x0, x1, y0, y1, x) => {
    if (x0 === x1) return null;
    const k = (y1 - y0) / (x1 - x0);
    return y0 + k * (x - x0);
  }
}

export { Pos, Rect, SelUtil, ColorUtil };