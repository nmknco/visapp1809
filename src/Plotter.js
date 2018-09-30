import * as d3 from 'd3';
import { Selector } from './Selector'
import { Resizer } from './Resizer'
import { ColorUtil } from './util'

const DEFAULTSIZE = 7;
const DEFAULTCOLOR = '#999999'

class ActiveSelections {
  constructor(len) {
    this.colorByIds = Array(len);
    this.idsByHSL = {};
  }

  resetColor = () => {
    this.colorByIds = Array(this.colorByIds.length);
    this.idsByHSL = {};
  };

  getColor = (id) => this.colorByIds[id];

  getAllColorGroups = () => Object.values(this.idsByHSL);

  getAllColorGroupsWithColor = () => this.idsByHSL;

  assignColor = (selectedIds, colorObj) => {
    for (const id of selectedIds) {
      this.colorByIds[id] = colorObj;
    }
    this._updateIdsByHSL();
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

class MainPlotter {
  constructor(
    data, 
    container, 
    chartConfig, 
    updateColorPicker,
    onDataPointHover,
  ){
    this.data = data;
    this.chartConfig = chartConfig;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;

    this.activeSelections = new ActiveSelections(data.length);

    this.scales = {x:{}, y:{}, color:{}};

    this.init();
  }

  getActiveSelections = () => this.activeSelections;

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
      this.highlightSelected,
    );
    
    this.resizer = new Resizer(
      chartBg.node(),
      this.selector.getIsSelected,
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

      this.activeSelections.resetColor();

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
        }
      })
      .on('contextmenu', d => {
        d3.event.preventDefault();
        if (this.selector.getIsSelected(d.__id_extra__)) {
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
      .attr('stroke', DEFAULTCOLOR)
      // .on('mousedown', d => this.resizer.handleMouseDown(d3.event, d.__id_extra__))
      // .on('mouseover', d => this.resizer.handleMouseOver(d3.event, d.__id_extra__))
      // .on('mouseout', this.resizer.handleMouseOut);
  
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
      .attr('stroke', d => { return colorScale(d[color_attr]) });
  };

  updateColorByRecommendation = (color_attr, pivot_value, pivot_color_hsl_obj) => {
    const colorScale = this._getColorScale(color_attr, pivot_value, pivot_color_hsl_obj);
    this.updateColorWithScale(color_attr, colorScale);
  };


  assignColor = (colorObj) => {
    this.activeSelections.assignColor(this.selector.getSelection(), colorObj);
    this.updateColorByUserSelection();
  };

  resetAllColor = () => {
    this.activeSelections.resetColor();
    this.updateColorByUserSelection();
  };


  updateColorByUserSelection = () => {
    d3.selectAll('.circle-ring')
      .attr('stroke', d => {
        const colorObj = this.activeSelections.getColor(d.__id_extra__);
        return colorObj ? colorObj.hex : DEFAULTCOLOR;
      });
  }

  highlightSelected = () => {
    const isSelectedOrPending = d => 
      this.selector.getIsSelectedOrPending(d.__id_extra__);

    const selectedDots = d3.selectAll('.dot')
      .classed('selected', d => isSelectedOrPending(d))
      .classed('unselected', d => !isSelectedOrPending(d));
  };

}

export { MainPlotter };