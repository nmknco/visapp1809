import * as d3 from 'd3';

import {
  BAR_PADDING,
  CHARTCONFIG, 
} from './commons/constants';
import {
  NoStatError, 
} from './commons/errors';
import {
  Data,
  DataEntry,
  GetDefaultVisualValue,
  GetVisualScaleRange,
  NestedDataEntry,
  PlotConfig,
  SetVisualScales,
  VField,
  VisualScaleType,
} from './commons/types';
import { ColorUtil } from './commons/util';



class BarPlotter {
  private readonly data: Data;
  private readonly container: HTMLDivElement;
  private readonly getVisualScaleRange: GetVisualScaleRange;
  private readonly setVisualScales: SetVisualScales;
  private readonly getDefaultVisualValue: GetDefaultVisualValue;

  // core fields, externally provided
  private fdata: Data;
  private xName: string | null;
  private zName: string | null;

  // derived fields, used for plotting
  private fdataNested: NestedDataEntry[];
  private xDomain: ReadonlyArray<string>;
  private sizes: {[key: string]: number};
  private xScale: d3.ScaleOrdinal<string, {}>;

  private canvas: d3.Selection<d3.BaseType, {}, null, undefined>;
  private chart: d3.Selection<d3.BaseType, {}, null, undefined>;
  

  
  constructor(
    data: Data,
    container: HTMLDivElement,
    setVisualScales: SetVisualScales,
    getVisualScaleRange: GetVisualScaleRange,
    getDefaultVisualValue: GetDefaultVisualValue,
  ){
    this.data = data;
    this.container = container;
    this.getVisualScaleRange = getVisualScaleRange;
    this.setVisualScales = setVisualScales;
    this.getDefaultVisualValue = getDefaultVisualValue;
    
    this.xName = null;
    this.zName = null; // important to not left this undefined - see updateVisualSize()

    this.init();
    this.setFilteredData(new Set());

  }


  private setXName = (xName: string | null) => {
    this.xName = xName;
    this.updateDerivedFields();
  };

  private setZName = (zName: string | null) => {
    this.zName = zName;
    this.updateSizes();
  }

  private updateDerivedFields = () => {
    const {xName} = this;
    
    if (!xName) {
      // in principle should reset the derived fields, but to avoid typing we just
      //  check xName before using the derived fields.
      return;
    }
    this.fdataNested = d3.nest()
      .key(d => d[xName])
      .sortKeys(d3.ascending)
      .entries(this.fdata);
    this.xDomain = this.fdataNested.map(d => d.key);
    this.updateSizes();
  };

  private updateSizes = (customSizes?: {[key: string]: number}) => {
    // size only makes sense when there is an x attribute
    if (!this.xName) {
      return;
    }
    const {zName} = this;
    if (customSizes) {
      console.log(0)
    } else if (!zName) {
      this.sizes = {};
      for (const x of this.xDomain) {
        this.sizes[x] = this.getDefaultVisualValue(VField.SIZE) as number;
      };
    } else {
      this.sizes = {};
      const [zmin, zmax] = this.getExtent(zName);
      const zScale = d3.scaleLinear()
        .domain([zmin, zmax])
        .range(this.getVisualScaleRange(VisualScaleType.SIZE) as [number, number]);
      this.setVisualScales(VisualScaleType.SIZE, zScale);
      for (const {key, values} of this.fdataNested) {
        const m = this.getMean(values, zName);
        this.sizes[key] = zScale(m);
      }
    }

    // reset x-dimension
    const {pad: {r, l}, svgW} = CHARTCONFIG;
    const {xRange, xRight} = this.getXRange();
    
    // expand/reset if necessary
    const w = xRight + l + r;
    if (w > svgW) {
      this.canvas.attr('width', w)
    } else {
      this.canvas.attr('width', CHARTCONFIG.svgW);
    }
    this.xScale = d3.scaleOrdinal()
      .domain(this.xDomain)
      .range(xRange);
  };

  private getExtent = (attrName: string): Readonly<[number, number]> => {
    const [min, max] = d3.extent(this.fdataNested, e => d3.mean(e.values, d => d[attrName] as number));
    if (min === undefined || max === undefined) {
      throw new NoStatError(`AVG(${attrName})`, 'extent');
    }
    return [min, max];
  };

  private getMean = (values: DataEntry[], attrName: string) => {
    const m = d3.mean(values, d => d[attrName] as number);
    if (m === undefined) {
      throw new NoStatError(attrName, 'average');
    }
    return m;
  };

  private getXRange = () => {
    // get the mid points
    const xRange: number[] = [];
    const len = this.xDomain.length;
    for (let i = 0; i < len; i++) {
      xRange.push((i === 0 ? 0 : (xRange[i - 1] + this.sizes[this.xDomain[i - 1]] / 2))
        + BAR_PADDING + this.sizes[this.xDomain[i]] / 2);
    }
    const xRight = xRange[len - 1] + this.sizes[this.xDomain[len - 1]] / 2 + BAR_PADDING;
    return {xRange, xRight};
  };

  // public
  setFilteredData = (filteredIds: ReadonlySet<number>) => {
    this.fdata = this.data.filter(d => !filteredIds.has(d.__id_extra__));
    this.updateDerivedFields();
  };


  init = () => {

    const {pad: {t, b, l}, svgH, svgW} = CHARTCONFIG;

    d3.select(this.container).selectAll('svg').remove();

    const canvas = d3.select(this.container)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('id', 'plot')
    const chart = canvas.append('g')
      .attr('transform', `translate(${l}, ${t})`);

    // // the box listening for select/resize drag, also works as ref for computing positions
    // const chartBox = chart.append(this.canvas.attr('width', CHARTCONFIG.svgW);'rect') 
    //   .classed('chart-box', true)
    //   .attr('id', 'chart-box')
    //   .attr('x', 0)
    //   .attr('y', 0)
    //   .attr('width', svgW - l - r)
    //   .attr('height', svgH - t - b);
    
    this.canvas = canvas;
    this.chart = chart;

    chart.append('g')
      .attr('transform', `translate(0, ${svgH - t - b})`)
      .classed('x-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', 250).attr('y', 80)
      .classed('label', true);
    chart.append('g')
      .classed('y-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', -200).attr('y', -80)
      .attr('transform', 'rotate(-90)')
      .classed('label', true);
  };




  updateDataAndPlot = (filteredIds: ReadonlySet<number>, plotConfig: PlotConfig) => {
    // filtering has a much more global effect on bar chart than on scatterplot.
    this.setFilteredData(filteredIds);
    this.redrawAll(plotConfig);
  };


  redrawAll = (plotConfig: PlotConfig) => {
    this.updatePosition(plotConfig);
    this.updateVisual(Object.values(VField), plotConfig);
  };


  updatePosition = (plotConfig: PlotConfig) => {
    // Unlike scatter plot, x-attr change necessarily causes data change

    if (!this.fdata.length) {
      return;
    }
    console.log('update position on bar chart');

    const {pad, svgH} = CHARTCONFIG;
    const { x, y, size } = plotConfig;

    if (!x || !y) {
      this.chart.selectAll('.bar').remove();
      this.chart.selectAll('.axis-container').selectAll('*').remove();
      this.canvas.attr('width', CHARTCONFIG.svgW);
      return;
    }

    // x-attribute should be string-valued and y-attribute be number
    const xName = x.attribute.name;
    const yName = y.attribute.name;
    this.setXName(xName);

    // Sync size if size is present in plotConfig.
    // This is necessary to keep updateVisual() efficient (see updateVisualSize())
    if (size) {
      this.setZName(size.attribute.name);
    }

    // TO DO: deal with negative values
    const yScale = d3.scaleLinear().domain([0, this.getExtent(yName)[1]]).range([svgH - pad.t - pad.b, 0]);

    const xg = this.chart.select('.x-axis');
    const yg = this.chart.select('.y-axis');
    // @ts-ignore
    xg.call(d3.axisBottom(this.xScale));
    yg.call(d3.axisLeft(yScale));
    xg.select('.label').text(xName);
    yg.select('.label').text(yName);

    const bars = this.chart
      .selectAll('.bar')
      .data([...this.fdataNested], (d: NestedDataEntry) => d.key);

    const newBars = bars.enter()
      .append('rect')
      .classed('bar', true)
      .attr('fill', this.getDefaultVisualValue(VField.COLOR));

    bars.merge(newBars)
      .transition()
      .duration(1000)
      .attr('x', d => (this.xScale(d.key) as number) - this.sizes[d.key] / 2)
      .attr('width', d => this.sizes[d.key])
      .attr('y', d => yScale(this.getMean(d.values, yName)))
      .attr('height', d => svgH - pad.t - pad.b - yScale(this.getMean(d.values, yName)))

    bars.exit()
      .remove();
  };

  updateVisual = (fields: VField[], plotConfig: PlotConfig) => {
    if (!this.fdata.length) {
      return;
    }
    const {[VField.SIZE]: sizeEntry, [VField.COLOR]: colorEntry} = plotConfig
    if (fields.includes(VField.SIZE)) {
      this.updateVisualSize(sizeEntry ? sizeEntry.attribute.name : null);
    }
    if (fields.includes(VField.COLOR)) {
      this.updateVisualColor(colorEntry ? colorEntry.attribute.name: null);
    }
  };

  private updateVisualSize = (zName: string | null) => {
    
    // size change involves position change. Indeally we do not need to update y again
    //    but if we only doing another size transition it leads to size-transition preempting
    //    the y-transition in updatePosition() in the situations
    //    where both updatePosition() and updateVisual() are called (in setPlotConfig() in App.tsx)
    
    // We could do either 
    // (1) just call updatePosition(), doing redundant computation on y to get complete transition
    // (2) since updatePosition() actually takes size into account when drawing the bars, we can
    //      do size update here ONLY when zName changes - this is also more efficient
    //    Note this requires updatePosition() to keep zName sync-ed with plotConfig. This is
    //    because of the case where the bar chart is initialized with size attribute already present, 
    //    so both updatePosition() and updateVisual() are called but no change in between. In this case
    //    sizes should be updated by updatePosition() instead of updateVisual().
    // (3) use techniques for concurrent d3 transitions, see Bostock
    // https://bl.ocks.org/mbostock/5348789
    // https://bl.ocks.org/mbostock/6081914

    if (zName === this.zName) {
      return;
    }
    console.log('update size on bar chart');
    this.setZName(zName);
    this.chart
      .selectAll('.bar')
      .transition()
      .duration(1000)
      .attr('x', (d: NestedDataEntry) => (this.xScale(d.key) as number) - this.sizes[d.key] / 2)
      .attr('width', (d: NestedDataEntry) => this.sizes[d.key]);

    if (this.xName) {
      // @ts-ignore
      this.chart.select('.x-axis').call(d3.axisBottom(this.xScale));
    }
  };

  private updateVisualColor = (cName: string | null) => {
    if (!this.xName) {
      return;
    }
    console.log('update color on bar chart');
    const bars = this.chart
      .selectAll('.bar')
    if (cName) {
      const [hslstr1, hslstr2] = this.getVisualScaleRange(VisualScaleType.COLOR_NUM) as [string, string];
      const domain = this.getExtent(cName);
      const cScale = ColorUtil.interpolateColorScale(
        domain,
        domain,
        [ColorUtil.stringToHSL(hslstr1), ColorUtil.stringToHSL(hslstr2)],
      );
      this.setVisualScales(VisualScaleType.COLOR_NUM, cScale);
      bars.attr('fill', (d: NestedDataEntry) => cScale(this.getMean(d.values, cName)));
    } else {
      bars.attr('fill', this.getDefaultVisualValue(VField.COLOR));
    }
  }

}

export { BarPlotter };