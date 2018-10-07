import * as d3 from 'd3';
import { Selector } from './Selector'
import { Resizer } from './Resizer'
import { ActiveSelectionsWithRec } from './ActiveSelections'

const DEFAULTSIZE = 7;
const DEFAULTCOLOR = '#999999'


class MainPlotter {
  constructor(
    data, 
    container, 
    chartConfig, 
    updateColorPicker,
    onDataPointHover,
    updateRecommendation,
  ){
    this.data = data;
    this.chartConfig = chartConfig;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;

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

  updateXY = (plotConfig) => {

    console.log('update called')
    const c = this.chartConfig;
    const data = this.data;

    this.plotConfig = plotConfig; // for dynamic click handlers (colorpicker menu)
    const { x, y } = plotConfig;

    if (!x || !y) {
      this.chart.selectAll('.dot').remove();
      this.selector.clearSelection();
      this.activeSelections.resetColor();
      return;
    }

    const x_attr = x.attribute.name;
    const y_attr = y.attribute.name;
  

    this.xScale = this.scales.x[x_attr] || (
      (typeof data[0][x_attr] === 'number') ?
        d3.scaleLinear()
          .domain(_expand(d3.extent(data, d => d[x_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[x_attr]))
          .padding(0.2)
    ).range([0, c.svgW - c.pad.l - c.pad.r]);

    this.yScale = this.scales.y[y_attr] || (
      (typeof data[0][y_attr] === 'number') ?
        d3.scaleLinear()
          .domain(_expand(d3.extent(data, d => d[y_attr]))) :
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
      .attr('r', DEFAULTSIZE);
    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', DEFAULTSIZE)
      .attr('stroke', DEFAULTCOLOR)
      // .on('mousedown', d => this.resizer.handleMouseDown(d3.event, d.__id_extra__))
      // .on('mouseover', d => this.resizer.handleMouseOver(d3.event, d.__id_extra__))
      // .on('mouseout', this.resizer.handleMouseOut);
  
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

  updateFields = (fields, plotConfig, keepSelection) => {

    const data = this.data;

    this.plotConfig = plotConfig; // see update()
    let colorScale, sizeScale;
    let color_attr, size_attr;

    if (fields.includes('color')) {
      const { color } = plotConfig;

      if (color) {
        console.log(color)
        color_attr = color.attribute.name;
        if (color.useCustomScale) {
          colorScale = this.customScales.color || this.activeSelections.getInterpolatedColorScale(color_attr);
          this.customScales.color = colorScale;
        } else {
          colorScale = this.scales.color[color_attr] || (
            (color.attribute.type === 'number') ?
              d3.scaleSequential(t => d3.interpolateInferno(d3.scaleLinear().domain([0,1]).range([0.9,0.1])(t))).domain(d3.extent(data, d => d[color_attr])) :
              d3.scaleOrdinal(d3.schemeCategory10).domain(d3.map(data, d => d[color_attr]).keys())
          );
          this.scales.color[color_attr] = colorScale;
          this.customScales.color = null;
        }
      } else {
        // reset color
        colorScale = (x) => DEFAULTCOLOR;
        this.customScales.color = null;
      }
    }

    if (fields.includes('size')) {
      const { size } = plotConfig;

      if (size) {
        size_attr = size.attribute.name;
        if (size.useCustomScale) {
          // TODO
        } else {
          sizeScale = this.scales.size[size_attr] ||
            d3.scaleLinear().domain(_expand(d3.extent(data, d => d[size_attr]))).range([3, 15]);
          this.customScales.size = null;
        }
      } else {
        // reset size
        sizeScale = (x) => DEFAULTSIZE;
        this.customScales.size = null;
      }
    }

    // Clear both colored groups and selection before applying color/size
    if (!keepSelection) {
      this.clearSelection();
    }
    this.activeSelections.resetColor();
    if (fields.includes('size')) { this.updateSizeWithScale(size_attr, sizeScale); }
    if (fields.includes('color')) { this.updateColorWithScale(color_attr, colorScale) };
  }

  updateColorWithScale = (color_attr, colorScale) => {
    this.chart.selectAll('.circle-ring')
      .attr('stroke', d => { return colorScale(color_attr ? d[color_attr] : d) });
  };

  updateSizeWithScale = (size_attr, sizeScale) => {
    this.chart.selectAll('.dot').selectAll('circle')
      .attr('r', d => { return sizeScale(size_attr ? d[size_attr] : d) });
  };

  updateColorWithRecommendation = (color_attr) => {
    // This is only used by hovering
    this.updateColorWithScale(
      color_attr, 
      this.activeSelections.getInterpolatedColorScale(color_attr),
    );
  };

  // updateColorWithRecommendationAndResetColorGroup = (color_attr) => {
  //   this.updateColorWithRecommendation(color_attr);
  //   this.activeSelections.resetColor();
  // }

  assignColor = (colorObj) => {
    this.activeSelections.assignColor(this.selector.getSelectedIds(), colorObj);
    this.syncColorToUserSelection();
  };

  uncolorAll = () => {
    // this will clear ALL color (including ones generated by encoding box)
    this.activeSelections.resetColor();
    this.syncColorToUserSelection();
  };

  uncolorSelected = () => {
    // this also update all color but is only enabled in user-selection-color mode
    this.activeSelections.resetColor(this.selector.getSelectedIds());
    this.syncColorToUserSelection();
  };

  syncColorToUserSelection = () => {
    // Displayed color is sync-ed with active groups
    d3.selectAll('.circle-ring')
      .attr('stroke', d => {
        const colorObj = this.activeSelections.getColor(d.__id_extra__);
        return colorObj ? colorObj.hex : DEFAULTCOLOR;
      });
  };

  highlightSelected = () => {
    d3.selectAll('.dot')
      .classed('selected', d => 
        this.selector.getIsSelectedOrPending(d.__id_extra__)
      );
  };

  clearSelection = () => {
    this.selector.clearSelection();
  };

}

const _expand = (extent) => {
  const [lo, hi] = extent;
  const len = hi - lo;
  return [lo - len * 0.05, hi + len * 0.05];
};

export { MainPlotter };