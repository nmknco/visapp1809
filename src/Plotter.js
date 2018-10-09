import * as d3 from 'd3';
import { Selector } from './Selector';
import { Resizer } from './Resizer';
import { ActiveSelectionsWithRec } from './ActiveSelections';
import { expandRange } from './util';

const SVGATTR_BY_FIELD = {color: 'stroke', size: 'r'};
const DEFAULT_BY_FIELD = {color: '#999999', size: 7};


class MainPlotter {
  constructor(
    data, 
    container, 
    chartConfig, 
    updateColorPicker,
    onDataPointHover,
    updateRecommendation,
    handleChangeVisualByUser,
  ){
    this.data = data;
    this.chartConfig = chartConfig;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;
    this.handleChangeVisualByUser = handleChangeVisualByUser;

    this.activeSelections = new ActiveSelectionsWithRec(data, updateRecommendation);

    this.scales = {x:{}, y:{}, color:{}, size: {}};
    this.customScales = {color: null, size: null}; // preserve this for toggle on and off x/y axis 
                                         // (as active selection is cleared and can't be used for restoration)

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
      this.handleResizing,
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

  updatePosition = (plotConfig) => {
    console.log('update position called');

    const c = this.chartConfig;
    const data = this.data;

    this.plotConfig = plotConfig; // for dynamic click handlers (colorpicker menu)
    const { x, y } = plotConfig;

    if (!x || !y) {
      this.chart.selectAll('.dot').remove();
      this.selector.clearSelection();
      for (let field of ['color', 'size']) {
        this.activeSelections.resetValue(field);
      }
      return;
    }

    const x_attr = x.attribute.name;
    const y_attr = y.attribute.name;
  

    this.xScale = this.scales.x[x_attr] || (
      (typeof data[0][x_attr] === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[x_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[x_attr]))
          .padding(0.2)
    ).range([0, c.svgW - c.pad.l - c.pad.r]);

    this.yScale = this.scales.y[y_attr] || (
      (typeof data[0][y_attr] === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[y_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[y_attr]))
          .padding(0.2)
    ).range([c.svgH - c.pad.t - c.pad.b, 0]);

    this.scales.x[x_attr] = this.xScale;
    this.scales.y[y_attr] = this.yScale;
    const xg = this.chart.select('.x-axis');
    const yg = this.chart.select('.y-axis');
    xg.call(d3.axisBottom(this.xScale));
    yg.call(d3.axisLeft(this.yScale));
    xg.select('.label').text(x_attr);
    yg.select('.label').text(y_attr);

    const dots = this.chart
      .selectAll('.dot')
      .data(data, d => d.__id_extra__);
  
    // event listeners are bound only once when each dot enters
    let newDots = dots.enter()
      .append('g')
      .classed('dot', true)
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
          const { x, y } = this.plotConfig;
          const left = c.pad.l + this.xScale(d[x.attribute.name]) - 18;
          const top = c.pad.t + this.yScale(d[y.attribute.name]) + 20;
          
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
      .attr('r', DEFAULT_BY_FIELD.size);
    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', DEFAULT_BY_FIELD.size)
      .attr('stroke', DEFAULT_BY_FIELD.color)
      .on('mousedown', d => this.resizer.handleMouseDown(d3.event, d.__id_extra__))
      .on('mouseover', d => this.resizer.handleMouseOver(d3.event, d.__id_extra__))
      .on('mouseout', () => this.resizer.handleMouseOut(d3.event));
  
    dots.merge(newDots)
      .transition()
      .duration(1000)
      .attr('transform', d => `translate(${this.xScale(d[x_attr])}, ${this.yScale(d[y_attr])})`)
      // Save position data in attributes for selection funcitons
      .attr('data-x', d => this.xScale(d[x_attr]))
      .attr('data-y', d => this.yScale(d[y_attr]));

    // this shouldn't happen in current setting (no points excluded in individual plots)
    dots.exit()
      .each(d => this.selector.unselectOne(d.__id_extra__))
      .remove();

  };

  updateVisual = (fields, plotConfig, keepSelection) => {
    console.log('update visual called');

    const data = this.data;
    this.plotConfig = plotConfig; // see updatePosition() for motivation

    for (let field of fields) {
      const entry = plotConfig[field];
      let attrName, visualScale;
      
      if (entry) {
        attrName = entry.attribute.name;
        if (entry.useCustomScale) {
          visualScale = this.customScales[field] || this.activeSelections.getInterpolatedScale(field, attrName);
          this.customScales[field] = visualScale;
        } else {
          if (field === 'color') {
            visualScale = this.scales[field][attrName] || (
              (entry.attribute.type === 'number') ?
                d3.scaleSequential(t => d3.interpolateInferno(d3.scaleLinear().domain([0,1]).range([0.9,0.1])(t))).domain(d3.extent(data, d => d[attrName])) :
                d3.scaleOrdinal(d3.schemeCategory10).domain(d3.map(data, d => d[attrName]).keys())
            );
          } else if (field === 'size') {
            visualScale = this.scales.size[attrName] ||
              d3.scaleLinear().domain(expandRange(d3.extent(data, d => d[attrName]))).range([3, 15]);
          }
          this.scales[field] = visualScale;
          this.customScales[field] = null;
        }
      } else {
        // reset visual upon empty plotConfig entry
        visualScale = () => DEFAULT_BY_FIELD[field];
        this.customScales[field] = null;
      }

      // Clear both colored groups and selection, then applying visual
      if (!keepSelection) { this.clearSelection(); }
      this.activeSelections.resetValue(field);
      
      this.updateVisualWithScale(field, attrName, visualScale);
    }
  }

  _getD3SelectionByField = (field) => {
    if (field === 'color') {
      return this.chart.selectAll('.circle-ring');
    } else if (field === 'size') {
      return this.chart.selectAll('.dot').selectAll('circle');
    }
  };

  updateVisualWithScale = (field, attrName, scale) => {
    // When attr is not passed we are using a default scale (i.e. constant), in which case we just pass d
    const getValue = attrName ? (d => scale(d[attrName])) : (d => scale(d));
    this._getD3SelectionByField(field).attr(SVGATTR_BY_FIELD[field], getValue);
  };

  updateVisualWithRecommendation = (field, attr) => {
    // This is only used by hovering on recommendation cards to show temporary visual changes
    this.updateVisualWithScale(
      field,
      attr, 
      this.activeSelections.getInterpolatedScale(field, attr),
    );
  };

  syncVisualToUserSelection = (field) => {
    // Displayed visual (color, size, etc.) is sync-ed with active groups
    this._getD3SelectionByField(field).attr(
      SVGATTR_BY_FIELD[field], 
      d => this.activeSelections.getValue(field, d.__id_extra__) || DEFAULT_BY_FIELD[field]
    );
  };

  assignVisual = (field, value) => {
    this.activeSelections.assignValue(field, this.selector.getSelectedIds(), value);
    this.syncVisualToUserSelection(field);
  };

  unVisualSelected = (field) => {
    // this also update all visual but is only enabled in user-selection mode
    this.activeSelections.resetValue(field, this.selector.getSelectedIds());
    this.syncVisualToUserSelection(field);
  };

  unVisualAll = (field) => {
    // this will clear ALL visual (including ones generated by encoding box)
    // NOW this is also only enabled in user-selection mode since we can
    // clear encoding directly in the encoding fields.
    this.activeSelections.resetValue(field);
    this.syncVisualToUserSelection(field);
  };

  highlightSelected = () => {
    d3.selectAll('.dot')
      .classed('selected', d => this.selector.getIsSelectedOrPending(d.__id_extra__));
  };

  clearSelection = () => {
    this.selector.clearSelection();
  };

  handleResizing = (r) => {
    this.handleChangeVisualByUser('size', r);
  }

}

export { MainPlotter };