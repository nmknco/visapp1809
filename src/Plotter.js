import * as d3 from 'd3';

const DEFAULTSIZE = 7;
// const DEFAULTCOLOR = '#000000'

class MainPlotter {
  constructor(data, 
    container, 
    chartConfig, 
    updateColorPicker,
    updateRecommendation,
    onDataPointHover,
  ){
    this.data = data;
    this.chartConfig = chartConfig;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.updateRecommendation = updateRecommendation;
    this.onDataPointHover = onDataPointHover;

    this.colorSource = 'selection'; // 'selection | 'encoding' | 'recommendation'

    this.scales = {x:{}, y:{}, color:{}};

    this.init();
  }

  init = () => {
    const c = this.chartConfig;

    d3.select(this.container).selectAll('svg').remove();

    const canvas = d3.select(this.container)
      .append('svg')
      .attr('width', c.svgW)
      .attr('height', c.svgH);
    const chart = canvas.append('g')
      .attr('transform', `translate(${c.pad.l}, ${c.pad.t})`);
    const chartBg = chart.append('rect')
      .classed('chart-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', c.svgW - c.pad.l - c.pad.r)
      .attr('height', c.svgH - c.pad.t - c.pad.b)
      .on('click', () => {
        this.updateColorPicker({display: 'none'})
      });
    this.chart = chart;

    this.selector = new Selector(
      chart.node(),
      chartBg.node(),
      () => this.selectedSize,
      () => this.selectedColor,
      this.updateRecommendation,
      this.getColorSource,
    );
    
    this.resizer = new Resizer(
      chartBg.node(),
      this.selector.isSelected,
      this.setSelectedSize,
    );

    chart.append('g')
      .attr('transform', `translate(0, ${c.svgH - c.pad.t - c.pad.b})`)
      .classed('x-axis', true)
      .append('text')
      .attr('x', 250).attr('y', 80)
      .classed('label', true);
    chart.append('g')
      .classed('y-axis', true)
      .append('text')
      .attr('x', -200).attr('y', -80)
      .attr('transform', 'rotate(-90)')
      .classed('label', true);

  };
  
  update = (plotConfig) => {
    console.log('update called')
    const c = this.chartConfig;
    const data = this.data;

    this.plotConfig = plotConfig; // for dynamic click handlers (colorpicker hover overlay)
    let { x_attr, y_attr, color_attr } = plotConfig;
    x_attr = x_attr.name;
    y_attr = y_attr.name;
  
    const _expand = (extent) => {
      const [lo, hi] = extent;
      const len = hi - lo;
      return [lo - len * 0.05, hi + len * 0.05];
    }

    this.xScale = this.scales.x[x_attr] || (
      (typeof data[0][x_attr] === 'number') ?
        d3.scaleLinear()
          .domain(_expand(d3.extent(data, d => d[x_attr]))) :
        d3.scaleBand()
          .domain(data.map(d => d[x_attr]))
    ).range([0, c.svgW - c.pad.l - c.pad.r]);

    this.yScale = this.scales.y[y_attr] || (
      (typeof data[0][y_attr] === 'number') ?
        d3.scaleLinear()
          .domain(_expand(d3.extent(data, d => d[y_attr]))) :
        d3.scaleBand()
          .domain(data.map(d => d[y_attr]))
    ).range([c.svgH - c.pad.t - c.pad.b, 0]);

    this.scales.x[x_attr] = this.xScale;
    this.scales.y[y_attr] = this.yScale;
    const xg = this.chart.select('.x-axis');
    const yg = this.chart.select('.y-axis');
    xg.call(d3.axisBottom(this.xScale));
    yg.call(d3.axisLeft(this.yScale));
    xg.select('.label').text(x_attr);
    yg.select('.label').text(y_attr);

    if (color_attr) {
      color_attr = color_attr.name;
      this.colorScale = this.scales.color[color_attr] ||
        (typeof data[0][color_attr] === 'number') ?
          d3.scaleSequential(t => d3.interpolateInferno(d3.scaleLinear().domain([0,1]).range([0.9,0.1])(t))).domain(d3.extent(data, d => d[color_attr])) :
          d3.scaleOrdinal(d3.schemeCategory10).domain(d3.map(data, d => d[color_attr]).keys());
      this.scales.color[color_attr] = this.colorScale
    }

    const dots = this.chart
      .selectAll('.dot')
      .data(data, d => d.__id_extra__);
  
    let newDots = dots.enter()
      .append('g')
      .classed('dot unselected', true)
      .on('click', d => {
        const id = d.__id_extra__
        if (!this.resizer.getIsHovering()) {
          if (!d3.event.ctrlKey) {
            this.selector.selectOnlyOne(id);
          } else {
            this.selector.selectToggle(id);
          }
          this.updateRecommendation();
        }
      })
      .on('contextmenu', d => {
        d3.event.preventDefault();
        if (this.selector.isSelected(d.__id_extra__)) {
          const { x_attr, y_attr } = this.plotConfig;
          const left = c.pad.l + this.xScale(d[x_attr.name]) - 18;
          const top = c.pad.t + this.yScale(d[y_attr.name]) + 20;
          
          this.updateColorPicker({left, top, display: undefined});
        }
      })
      
    newDots.on('mouseover', d => {
        this.onDataPointHover(d);
      }).on('mouseout', d => {
        this.onDataPointHover({});
      });
    
    newDots.append('circle')
      .classed('circle circle-bg', true)
      .attr('r', DEFAULTSIZE);
    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', DEFAULTSIZE)
      .on('mousedown', d => this.resizer.handleMouseDown(d3.event, d.__id_extra__))
      .on('mouseover', d => this.resizer.handleMouseOver(d3.event, d.__id_extra__))
      .on('mouseout', this.resizer.handleMouseOut);
  
    const allDots = dots.merge(newDots)
      .transition()
      .duration(1000)
      .attr('transform', d => `translate(${this.xScale(d[x_attr])}, ${this.yScale(d[y_attr])})`)
      .attr('data-x', d => this.xScale(d[x_attr]))
      .attr('data-y', d => this.yScale(d[y_attr]));
    
    if (color_attr) {
      this.colorSource = 'encoding';
      this.updateColorWithScale(color_attr, this.colorScale);
    }

    dots.exit()
      .each(d => this.selector.unselectOne(d.__id_extra__))
      .remove();
  };

  updateColorWithScale = (color_attr, colorScale) => {
    this.chart.selectAll('.circle-ring')
      .style('stroke', d => { return colorScale(d[color_attr]) });
  };

  updateColorWithUserColor = (color_attr, pivot_value, pivot_color_hsl_obj) => {
    const colorScale = this._getColorScale(color_attr, pivot_value, pivot_color_hsl_obj);
    this.updateColorWithScale(color_attr, colorScale);
  };

  _getColorScale = (color_attr, pivot_value, pivot_color_hsl_obj) => {
    const [min, max] = d3.extent(this.data, d => d[color_attr]);
    console.log(pivot_color_hsl_obj)
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
      // console.log(`hsl(${hsl.h},${hsl.s*100}%,${hsl.l*100}%)`)
      return `hsl(${hsl.h},${hsl.s*100}%,${hsl.l*100}%)`;
    };
    return colorScale;
  };

  getColorSource = () => {
    return this.colorSource;
  }

  setColorSource = (source) => {
    this.colorSource = source;
  }

  getSelectedIds = () => {
    return this.selector.selectedIds;
  };

  setUserSelectedColor = (colorObj) => {
    this.colorSource = 'selection';
    this.selector.setSelectedColor(colorObj.hex);
  };

  resetAllColor = () => {
    this.setUserSelectedColor({hex: undefined});
  };

  setSelectedSize = (size) => { 
    this.selector.setSelectedSize(size)
  };
  
}

class Resizer {
  constructor(chartBgNode, isSelected, setSelectedSize) {
    this.chartBgNode = chartBgNode;
    this.isSelected = isSelected;
    this.setSelectedSize = setSelectedSize;

    this.isResizing = false;
    this.isHovering = false;
    this.currentDot = null;

    this.init();
  }

  getIsHovering = () => this.isHovering;

  init = () => {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseDown = (e, id) => {
    if (this.isSelected(id)) {
      e.preventDefault();
      this.currentDot = e.target.parentNode;
      this.isResizing = true;
    }
  };

  handleMouseMove = (e) => {
    if (this.isResizing) {
      const cPos = new Pos(
        this.currentDot.getAttribute('data-x'),
        this.currentDot.getAttribute('data-y')
      );
      const r = SelUtil.calcPos(e, this.chartBgNode).distTo(cPos);
      this.setSelectedSize(r);
    }
  };

  _getCursorStyle = (e) => {
    const {x, y} = SelUtil.calcPos(e, this.chartBgNode);
    const g = e.target.parentNode;
    const dx = x - g.getAttribute('data-x');
    const dy = y - g.getAttribute('data-y');
    const a = Math.abs(Math.atan(dy / dx));
    if (a < Math.PI / 8) {
      return 'ew-resize';
    } else if (a > Math.PI * 3/8) {
      return 'ns-resize';
    } else {
      return dx * dy < 0 ? 'nesw-resize' : 'nwse-resize';
    }
  }

  handleMouseUp = (e) => {
    this.isResizing = false;
  };

  handleMouseOver = (e, id) => {
    if (this.isSelected(id)) {
      this.isHovering = true;
      e.target.style.cursor = this._getCursorStyle(e);
    }
  }

  handleMouseOut = (e) => {
    this.isHovering = false;
  }
}

class Selector {

  // TODO: refactor and limit its responsibility to update selection

  constructor(chartNode, chartBgNode, getSize, getColor, updateRecommendation, getColorSource) {
    this.chartNode = chartNode;
    this.chartBgNode = chartBgNode;

    this.isSelecting = false;
    this.selNode = null;
    this.selRect = null;
    this.origin = null;
    this.selectedIds = new Set();
    this.pendingIds = new Set();

    this.selectedSize = DEFAULTSIZE;
    // this.selectedColor = DEFAULTCOLOR;
    this.selectedColor = undefined;

    this.updateRecommendation = updateRecommendation;
    this.getColorSource = getColorSource;

    this.init();
  }

  setSelectedColor = (color) => {
    this.selectedColor = color;
    this._highlightSelected();
  }
  setSelectedSize = (size) => {
    this.selectedSize = size;
    this._highlightSelected();
  }

  isSelected = (id) => this.selectedIds.has(id);

  _updateRectNode = () => {
    this.selRect.updateToNode(this.selNode);
  };

  _shouldResetColorWithNewSelection = () => {
    return this.getColorSource() === 'selection';
  };

  _highlightSelected = () => {
    const { selectedIds, pendingIds } = this;
    const isSelectedOrPending = d => 
      selectedIds.has(d.__id_extra__) || pendingIds.has(d.__id_extra__);

    const selectedDots = d3.selectAll('.dot')
      .classed('selected', d => isSelectedOrPending(d))
      .classed('unselected', d => !isSelectedOrPending(d));
    const circles = selectedDots.selectAll('.circle');
    circles.attr('r', d => isSelectedOrPending(d) ? this.selectedSize : DEFAULTSIZE);
    if (this._shouldResetColorWithNewSelection()) {
      circles.style('stroke', d => isSelectedOrPending(d) ? this.selectedColor : undefined);
    }
  };

  init = () => {
    this.chartBgNode.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isSelecting = true;
      this.origin = SelUtil.calcPos(e, this.chartBgNode);

      this.selNode = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      this.selNode.classList.add('selection');
      this.selRect = new Rect(this.origin, this.origin);
      this._updateRectNode();
      this.chartNode.insertBefore(this.selNode, this.chartNode.firstChild);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isSelecting) {
        this.selRect = new Rect(this.origin, SelUtil.calcPos(e, this.chartBgNode));
        this._updateRectNode();

        this.pendingIds = new Set();
        if (!e.ctrlKey) {
          this.selectedIds = new Set();
        }

        const { selRect, pendingIds } = this;
        d3.selectAll('.dot').each(function(d) {
          if (selRect.containsCoor(
            this.getAttribute('data-x'), 
            this.getAttribute('data-y')
          )) { 
            pendingIds.add(d.__id_extra__); 
          }
        });
        this._highlightSelected();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isSelecting) {
        for (let id of this.pendingIds) {
          this.selectedIds.add(id);
        }
        this.pendingIds = new Set();
        this.isSelecting = false;
        this.selNode.outerHTML = '';
        this.updateRecommendation();
      }
    });
  };

  selectOnlyOne = (id) => {
    this.selectedIds = new Set();
    this.pendingIds = new Set();
    this.selectedIds.add(id);
    this._highlightSelected();
  }

  selectToggle = (id) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this._highlightSelected();
  }

  unselectOne = (id) => {
    this.selectedIds.delete(id);
  }

}

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

export { MainPlotter }