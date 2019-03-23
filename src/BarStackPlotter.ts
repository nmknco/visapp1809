import * as d3 from 'd3';

import { Attribute } from './Attribute';;
import { Dragger } from './Dragger';
import { OrderManager, OrderUtil } from './OrderManager';
import { BarSelector } from './Selector';

import {
  BAR_DROP_PADDING,
  BAR_DROP_WIDTH,
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
  HandleDragEnd,
  HandlePendingSelectionChange,
  HandleSelectionChange,
  NestedDataEntry,
  Order,
  PlotConfig,
  SetIsDragging,
  SetVisualScales,
  Stat,
  UpdateRecommendedOrders,
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
  private readonly updateRecommendedOrders: UpdateRecommendedOrders;
  private readonly getDefaultVisualValue: GetDefaultVisualValue;
  readonly setIsDragging: SetIsDragging;
  private readonly handleDragEndExternal: HandleDragEnd;

  private readonly numericAttrList: ReadonlyArray<string>;

  readonly chartType = ChartType.BAR_CHART;

  // core fields, externally provided
  private fdata: DataEntry[]; // mutable
  private xName: string | null;
  private yName: string | null;
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

  private readonly selector: BarSelector;
  private readonly dragger: Dragger;
  private readonly orderManager: OrderManager;

  // The between-bar slot that selected bars are being dragged over for reorder
  private xKeyDraggedOver: string | null; 
  private isDraggedFor: 'reorder' | 'stack' | null;
  
  constructor(
    data: Data,
    container: HTMLDivElement,
    setVisualScales: SetVisualScales,
    getVisualScaleRange: GetVisualScaleRange,
    getDefaultVisualValue: GetDefaultVisualValue,
    updateRecommendedOrders: UpdateRecommendedOrders,
    setIsDragging: SetIsDragging,
    handleDragEndExternal: HandleDragEnd,
  ){
    this.data = data;
    this.container = container;
    this.getVisualScaleRange = getVisualScaleRange;
    this.setVisualScales = setVisualScales;
    this.getDefaultVisualValue = getDefaultVisualValue;
    this.updateRecommendedOrders = updateRecommendedOrders;
    this.setIsDragging = setIsDragging;
    this.handleDragEndExternal = handleDragEndExternal;


    this.xName = null;
    this.zName = null; // important to not left this undefined - see updateVisualSize()

    
    this.gName = null;

    this.numericAttrList = memoizedGetAttributes(data)
      .filter((attr: Attribute) => attr.type === 'number')
      .map((attr: Attribute) => attr.name);
    
    this.init();

    this.selector = new BarSelector(
      this.chartBox.node() as SVGRectElement,
      this.handlePendingSelectionChange,
      this.handleSelectionChange,
    );

    this.dragger = new Dragger(this);

    this.setFilteredData(new Set());
    
    this.orderManager = new OrderManager();
  }

  private init = () => {

    const {pad: {t, b, l, r}, svgH, svgW} = CHARTCONFIG;
    const w = svgW - l - r;
    const h = svgH - t - b;

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
      .attr('width', w)
      .attr('height', h);


    this.chart.append('g')
      .attr('transform', `translate(0, ${h})`)
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
  
    this.chart.append('rect')
      .classed('bar__drop', true)
      .classed('bar__drop--reorder', true)
      .classed('bar__drop--reorder-first', true)
      // .attr('stroke', 'black')
      .attr('width', BAR_DROP_WIDTH)
      .attr('height', h)
      .on('mouseenter', d => {
        if (this.dragger.getIsDragging()) {
          this.xKeyDraggedOver = '';
          this.isDraggedFor = 'reorder';
        }
      })
      .on('mouseleave', d => {
        if (this.dragger.getIsDragging()) {
          this.xKeyDraggedOver = null;
          this.isDraggedFor = null;
        }
      });
  };
  

  private setXName = (xName: string | null) => {
    this.xName = xName;
    this.updateDerivedFields();
  };

  private setYName = (yName: string | null) => {
    this.yName = yName;
  }

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
      const nested = (d3.nest() as d3.Nest<GeneralDataEntry, {}>)
        .key(d => d[xName] as string)
        .sortKeys(d3.ascending)
        .key(d => d[gName].toString())
        .sortKeys(d3.ascending)
        .rollup(values => {
          const sums = {};
          for (const attrName of this.numericAttrList) {
            sums[attrName] = getStat(values, attrName, Stat.SUM);
          }
          return sums;
        })
        .entries(this.fdata);

      // Manual rollup to get the total sum of each bar for each attribute 
      // same structure as bar chart - used for ordering,
      //    or wherever we want to treat each bar as a whole like in normal bar charts
      // The resulted nested data point has BOTH values (segments) and value (totals) field.
      for (const e of nested) {
        const totals = {};
        for (const attrName of this.numericAttrList) {
          totals[attrName] = d3.sum(e.values, (val: NestedDataEntry) => val.value![attrName]);
        }
        e.value = totals;
      }

      this.fdataNested = nested;
    }

    console.log('Grouped nested data', this.fdataNested);

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
    this.updatePosition(plotConfig);
    this.orderManager.resetReorderedIds();
  };
  
  
  private updatePosition = (plotConfig: PlotConfig) => {
    // Unlike scatter plot, x-attr change necessarily causes data change

    if (!this.fdata.length) {
      return;
    }
    console.log('update position on bar chart');

    const {pad, svgH} = CHARTCONFIG;
    const h = svgH - pad.t - pad.b;
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
    this.setYName(yName);
    this.setGName(gName);

    this.setZName(size ? size.attribute.name : null);


    console.log('====== REMOVE ======', this.yName);


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

    // 'bar-section' class contains 'bar' class (see below) and reorder dropper
    const newSections = barSections.enter()
      .append('g')
      .classed('bar-section', true);


    newSections.append('rect')
      .classed('bar__drop', true)
      .classed('bar__drop--reorder', true)
      // .attr('stroke', 'black')
      .attr('width', BAR_DROP_WIDTH)
      .attr('height', h)
      .on('mouseenter', d => {
        if (this.dragger.getIsDragging()) {
          this.xKeyDraggedOver = d.key;
          this.isDraggedFor = 'reorder';
        }
      })
      .on('mouseleave', d => {
        if (this.dragger.getIsDragging()) {
          this.xKeyDraggedOver = null;
          this.isDraggedFor = null;
        }
      });

    const allBarSections = barSections.merge(newSections)
      .attr('data-cx', d => this.xScale(d.key) as number);
    
    allBarSections.select('.bar__drop--reorder')
      .attr('x', d => (this.xScale(d.key) as number) 
          + this.sizes[d.key] / 2 + BAR_PADDING / 2 - BAR_DROP_WIDTH / 2);
    
    // The 'bar' class contains everything that can be dragged around or select-hightlighted
    const newBars = newSections
      .append('g')
      .classed('bar', true)
      .on('click', d => {
        const id = d.key;
        if (!(d3.event.ctrlKey || d3.event.metaKey)) {
          this.selector.selectOnlyOne(id);
        } else {
          this.selector.selectToggle(id);
        }
      })
      .call(this.dragger.getDragger());

 
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
        let stackedSum = 0;
        d3.select(thisnode)
          .selectAll('.bar__rect')
          .transition()
          .duration(1000)
          .attr('width', () => this.sizes[d0.key])
          .attr('x', () => (this.xScale(d0.key) as number) - this.sizes[d0.key] / 2)
          .attr('y', (d: NestedDataEntry) => {
            stackedSum += d.value![yName];
            return yScale(stackedSum);
          })
          .attr('height', (d: NestedDataEntry) => h - yScale(d.value![yName]));
      });
      

    barSections.exit()
      .each((d: NestedDataEntry) => this.selector.unselectOne(d.key))
      .remove();

  };

  private reorderDataAndPlot = (customOrderedNestedData: NestedDataEntry[]) => {
    // this is called to adopt order from user's dragging
    this.updateDerivedFields(customOrderedNestedData);
    this.syncVisualSize();
  };

  private syncVisualSize = (
    options: {animation: boolean} = {animation: true}
  ) => {
    // sync the visual (x and size) to this.sizes
    
    // this is used for updating x/size after internal changes (no plotconfig or data change),
    //    such as resizing or ordering

    const { animation } = options;

    const barSections = this.chart
      .selectAll('.bar-section')
      .attr('data-cx', (d: NestedDataEntry) => this.xScale(d.key) as number);
  
    const barDropsOrder = barSections.select('.bar__drop--reorder');
    (animation ? barDropsOrder.transition().duration(1000) : barDropsOrder)
      .attr('x', (d: NestedDataEntry) => (this.xScale(d.key) as number) + this.sizes[d.key] / 2 + BAR_DROP_PADDING);

    this.chart.selectAll('.bar')
      .each((d0: NestedDataEntry, i, nodes) => {
        const barRects = d3.select(nodes[i]).selectAll('.bar__rect');
        (animation ? barRects.transition().duration(1000) : barRects)
        .attr('width', () => this.sizes[d0.key])
        .attr('x', () => (this.xScale(d0.key) as number) - this.sizes[d0.key] / 2);
      });


    // Update x axis
    if (this.xName) {
      // @ts-ignore
      this.chart.select('.x-axis').call(d3.axisBottom(this.xScale));
    }
  };


  private highlightBars = (idFilter: (d: NestedDataEntry) => boolean) => {
    this.chart.selectAll('.bar')
      .classed('selected', (d: NestedDataEntry)  => idFilter(d))
      .classed('unselected', (d: NestedDataEntry) => !idFilter(d));
  };

  private clearHighlights = () => {
    this.chart.selectAll('.bar')
      .classed('selected', false)
      .classed('unselected', false);
  };

  private handlePendingSelectionChange: HandlePendingSelectionChange = (selectedIds, pendingIds) => {
    this.highlightBars((d: NestedDataEntry) => selectedIds.has(d.key) || pendingIds.has(d.key));
  };

  private handleSelectionChange: HandleSelectionChange = (selectedIds) => {
    if (selectedIds.size > 0) {
      this.highlightBars((d: NestedDataEntry) => selectedIds.has(d.key));
    } else {
      this.clearHighlights();
    }
  };

  handleDragStart = () => {
    // Set the bar drop areas interactable
    this.chart
      .selectAll(this.selector.getSelectedIds().size === 1 ? 
        '.bar__drop:not(.selected)' : '.bar__drop--reorder')
      .classed('bar__drop--active', true);
  }

  // drag-n-reorder logic to passed in dragend handler (handleDragEndExternal)
  handleDragEnd = (idSetDropped: ReadonlySet<string>) => {

    if (this.xKeyDraggedOver !== null) {
      if (this.isDraggedFor === 'reorder') {
        console.log('bars dropped for reorder');

        // insert the selected bars after the insert key
        // insert key == empty string means inserting at beginning 
        const insertKey = this.xKeyDraggedOver;
        const selectedIds = this.selector.getSelectedIds();
        this.orderManager.addReorderedIds(selectedIds);

        const selectedBarData = this.fdataNested.filter(d => selectedIds.has(d.key));
        let customOrderedNestedData: NestedDataEntry[] = [];
        if (insertKey === '') {
          customOrderedNestedData = customOrderedNestedData.concat(selectedBarData);
        }
        for (const entry of this.fdataNested) {
          if (!selectedIds.has(entry.key)) {
            customOrderedNestedData.push(entry);
          }
          if (entry.key === insertKey) {
            customOrderedNestedData = customOrderedNestedData.concat(selectedBarData);
          }
        }
        // console.log(customOrderedNestedData);
        this.reorderDataAndPlot(customOrderedNestedData);
        this.updateRecommendedOrders(
          this.orderManager.getRecommendedOrders(customOrderedNestedData, this.yName!, 3)
        );

        // clean-up
        this.xKeyDraggedOver = null;
        this.isDraggedFor = null;
      }
    }
    // clean-up
    this.chart
      .selectAll('.bar__drop')
      .classed('bar__drop--active', false);
  
    this.handleDragEndExternal(idSetDropped);
  };

  updateOrderAndPlot = (order: Order) => {
    this.orderManager.setOrder(order);
    this.orderManager.resetReorderedIds();
    const customOrderedNestedData = [...this.fdataNested];
    customOrderedNestedData.sort(OrderUtil.getOrderFunction(order));
    this.reorderDataAndPlot(customOrderedNestedData);
    this.updateRecommendedOrders([]);
  };

  clearSelection = (idSet?: ReadonlySet<string>) => {
    this.selector.clearSelection(idSet);
  };
}

export { BarStackPlotter };