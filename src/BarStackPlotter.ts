import * as d3 from 'd3';

import { Attribute } from './Attribute';;

import {
  BAR_PADDING,
  CHARTCONFIG,
  ORD_COLORS,
} from './commons/constants';
import { memoizedGetAttributes, memoizedGetUniqueValueList } from './commons/memoized';
import {
  ChartType,
  Data,
  DataEntry,
  GeneralDataEntry,
  GetDefaultVisualValue,
  GetVisualScaleRange,
  NestedDataEntry,
  PlotConfig,
  SetVisualScales,
  Stat,
  VField,
  VisualScaleType,
} from './commons/types';
import {
  getNestedExtent,
  getStat,
} from './commons/util';


class BarStackPlotter {
  private readonly data: Data;
  private readonly container: HTMLDivElement;
  private readonly getVisualScaleRange: GetVisualScaleRange;
  private readonly setVisualScales: SetVisualScales;
  private readonly getDefaultVisualValue: GetDefaultVisualValue;

  private readonly numericAttrList: ReadonlyArray<string>;

  readonly chartType = ChartType.BAR_CHART;

  // core fields, externally provided
  private fdata: DataEntry[]; // mutable
  private xName: string | null;
  private zName: string | null;
  
  private gName: string | null;
  private gDomain: ReadonlyArray<string>;

  // derived fields, used for plotting
  private fdataNested: NestedDataEntry[];
  private xDomain: ReadonlyArray<string>;
  private sizes: {[key: string]: number};
  private xScale: d3.ScaleOrdinal<string, {}>;


  private canvas: d3.Selection<d3.BaseType, {}, null, undefined>;
  private chart: d3.Selection<d3.BaseType, {}, null, undefined>;
  private chartBox: d3.Selection<d3.BaseType, {}, null, undefined>;

  
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
    
    this.gName = null;

    this.numericAttrList = memoizedGetAttributes(data)
      .filter((attr: Attribute) => attr.type === 'number')
      .map((attr: Attribute) => attr.name);
    
    this.init();

    this.setFilteredData(new Set());
    
  }

  init = () => {

    const {pad: {t, b, l, r}, svgH, svgW} = CHARTCONFIG;

    d3.select(this.container).selectAll('svg').remove();

    this.canvas = d3.select(this.container)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('id', 'plot')
    this.chart = this.canvas.append('g')
      .attr('transform', `translate(${l}, ${t})`);
    

    // the box listening for select/resize drag, also works as ref for computing positions
    this.chartBox = this.chart.append('rect') 
      .classed('chart-box', true)
      .attr('id', 'chart-box')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', svgW - l - r)
      .attr('height', svgH - t - b);


    this.chart.append('g')
      .attr('transform', `translate(0, ${svgH - t - b})`)
      .classed('x-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', 250).attr('y', 104)
      .classed('label', true);
    this.chart.append('g')
      .classed('y-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', -200).attr('y', -80)
      .attr('transform', 'rotate(-90)')
      .classed('label', true);
  };
  

  private setXName = (xName: string | null) => {
    this.xName = xName;
    this.updateDerivedFields();
  };

  private setZName = (zName: string | null) => {
    this.zName = zName;
    this.updateSizes();
  }

  private setGName = (gName: string | null) => {
    this.gName = gName;
    this.updateDerivedFields();
  }

  private updateDerivedFields = (customOrderedNestedData?: NestedDataEntry[]) => {
    const {xName, gName} = this;
    
    if (!xName || !gName) {
      // in principle should reset the derived fields, but to avoid typing we just
      //  check xName before using the derived fields.
      return;
    }

    if (customOrderedNestedData) {
      this.fdataNested = customOrderedNestedData;
    } else {
      this.fdataNested = (d3.nest() as d3.Nest<GeneralDataEntry, {}>)
        .key(d => d[xName] as string)
        .sortKeys(d3.ascending)
        .key(d => d[gName].toString())
        .sortKeys(d3.ascending)
        .rollup(values => {
          const means = {};
          for (const attrName of this.numericAttrList) {
            means[attrName] = getStat(values, attrName, Stat.SUM);
          }
          return means;
        })
        .entries(this.fdata);
    }

    console.log(this.fdataNested);

    this.xDomain = this.fdataNested.map(d => d.key);
    this.updateSizes(!!customOrderedNestedData);

    this.gDomain = memoizedGetUniqueValueList(this.fdata, gName).map(d => d.toString());
  };

  private updateSizes = (keepCustomSizes: boolean = false) => {
    // size only makes sense when there is an x attribute
    if (!this.xName) {
      return;
    }

    if (!keepCustomSizes) {  
      const {zName} = this;
      if (!zName) {
        this.sizes = {};
        for (const x of this.xDomain) {
          this.sizes[x] = this.getDefaultVisualValue(VField.SIZE) as number;
        };
      } else {
        this.sizes = {};
        const [zmin, zmax] = getNestedExtent(this.fdataNested, zName, 2);
        const zScale = d3.scaleLinear()
          .domain([zmin, zmax])
          .range(this.getVisualScaleRange(VisualScaleType.SIZE) as [number, number]);
        this.setVisualScales(VisualScaleType.SIZE, zScale);
        for (const {key, value} of this.fdataNested) {
          const m = value![zName];
          this.sizes[key] = zScale(m);
        }
      }
    }

    this.updateXWithSize();
  };

  private updateXWithSize = () => {
    // reset x-dimension
    const {pad: {r, l}, svgW} = CHARTCONFIG;
    const {xRange, xRight} = this.getXRange();
    
    // expand/reset if necessary
    const w = xRight + l + r;
    const newW = (w > svgW) ? w : CHARTCONFIG.svgW;
    this.canvas.attr('width', newW);
    this.chartBox.attr('width', newW - l - r);
    this.xScale = d3.scaleOrdinal()
      .domain(this.xDomain)
      .range(xRange);
  }

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

  setFilteredData = (filteredIds: ReadonlySet<string>) => {
    this.fdata = this.data.filter(d => !filteredIds.has(d.__id_extra__));
    this.updateDerivedFields();
  };


  updateDataAndPlot = (filteredIds: ReadonlySet<string>, plotConfig: PlotConfig) => {
    // filtering has a much more global effect on bar chart than on scatterplot.
    this.setFilteredData(filteredIds);
    this.redrawAll(plotConfig);
  };


  redrawAll = (plotConfig: PlotConfig) => {
    // Unlike scatter plot, x-attr change necessarily causes data change

    if (!this.fdata.length) {
      return;
    }
    console.log('update position on bar chart');

    const {pad, svgH} = CHARTCONFIG;
    const { x, y, group, size } = plotConfig;

    if (!x || !y || !group) {
      this.chart.selectAll('.bar-section').remove();
      this.chart.selectAll('.axis-container').selectAll('*').remove();
      this.canvas.attr('width', CHARTCONFIG.svgW);
      this.chartBox.attr('width', CHARTCONFIG.svgW);
      return;
    }

    // x-attribute should be string-valued and y-attribute be number
    const xName = x.attribute.name;
    const yName = y.attribute.name;
    const gName = group.attribute.name;

    const regroup = gName !== this.gName;

    this.setXName(xName);
    this.setGName(gName);

    this.setZName(size ? size.attribute.name : null);

    // TO DO: deal with negative values
    const yScale = d3.scaleLinear()
      .domain([0, getNestedExtent(this.fdataNested, yName, 2)[1]])
      .range([svgH - pad.t - pad.b, 0]);

    const gScale = d3.scaleOrdinal()
      .domain(this.gDomain)
      .range(ORD_COLORS);
    // @ts-ignore
    this.setVisualScales(VisualScaleType.COLOR_ORD, gScale);

    const xg = this.chart.select('.x-axis');
    const yg = this.chart.select('.y-axis');
    // @ts-ignore
    xg.call(d3.axisBottom(this.xScale));
    yg.call(d3.axisLeft(yScale));
    xg.select('.label').text(xName);
    yg.select('.label').text(yName);

    const barSections = this.chart
      .selectAll('.bar-section')
      .data([...this.fdataNested], (d: NestedDataEntry) => d.key);

    const newSections = barSections.enter()
      .append('g')
      .classed('bar-section', true);
    

    const newBars = newSections
      .append('g')
      .classed('bar', true);



    const allBarSections = barSections.merge(newSections)
      .attr('data-cx', d => this.xScale(d.key) as number);
 
    if (regroup) {
      this.chart.selectAll('.bar__rect').remove();
    }

    (regroup ? allBarSections.select('.bar') : newBars)
      .selectAll('.bar__rect')
      .data(d => d.values, (d2: NestedDataEntry) => d2.key)
      .enter()
      .append('rect')
      .classed('bar__rect', true)
      .attr('fill', d => gScale(d.key) as string)

    allBarSections
      .each((d0, i, nodes) => {
        const thisnode = nodes[i];
        let stackedHeight = 0;
        d3.select(thisnode)
          .selectAll('.bar__rect')
          .transition()
          .duration(1000)
          .attr('width', d => this.sizes[d0.key])
          .attr('x', d => (this.xScale(d0.key) as number) - this.sizes[d0.key] / 2)
          .attr('y', (d: NestedDataEntry) => {
            stackedHeight += d.value![yName];
            return yScale(stackedHeight);
          })
          .attr('height', (d: NestedDataEntry) => {
            const h = svgH - pad.t - pad.b - yScale(d.value![yName]);
            return h;
          });
      });
      

    barSections.exit()
      .remove();

  };

}

export { BarStackPlotter };