import * as d3 from 'd3';

import { ActiveSelectionsWithRec } from './ActiveSelections';
import { Attribute } from './Attribute';
import { BarResizer } from './BarResizer';
import { Dragger } from './Dragger';
import { PlotConfigEntry } from './PlotConfigEntry';
import { BarSelector } from './Selector';

import {
  BAR_PADDING,
  BAR_XBORDER_W,
  CHARTCONFIG, 
} from './commons/constants';
import {
  NoStatError, 
} from './commons/errors';
import { memoizedGetAttributes } from './commons/memoized';
import {
  ChartType,
  Data,
  DataEntry,
  GetDefaultVisualValue,
  GetVisualScaleRange,
  GroupData,
  HandleChangeVisualByUser,
  HandleDragEnd,
  HandlePendingSelectionChange,
  HandleSelectionChange,
  NestedDataEntry,
  PlotConfig,
  SetIsDragging,
  SetVisualScales,
  StringRangeScale,
  ToggleColorPicker,
  UpdateRecommendation,
  VField,
  VisualScaleType,
} from './commons/types';
import { ColorUtil } from './commons/util';



class BarPlotter {
  private readonly data: Data;
  private readonly container: HTMLDivElement;
  private readonly toggleColorPicker: ToggleColorPicker;
  private readonly getVisualScaleRange: GetVisualScaleRange;
  private readonly setVisualScales: SetVisualScales;
  private readonly getDefaultVisualValue: GetDefaultVisualValue;
  private readonly handleChangeVisualByUser: HandleChangeVisualByUser;
  readonly setIsDragging: SetIsDragging;
  readonly handleDragEnd: HandleDragEnd;

  private readonly numericAttrList: ReadonlyArray<string>;

  readonly chartType = ChartType.BAR_CHART;

  // core fields, externally provided
  private fdata: DataEntry[]; // mutable
  private xName: string | null;
  private zName: string | null;

  private readonly activeSelections: ActiveSelectionsWithRec;

  // derived fields, used for plotting
  private fdataNested: NestedDataEntry[];
  private groupData: GroupData;
  private xDomain: ReadonlyArray<string>;
  private sizes: {[key: string]: number};
  private xScale: d3.ScaleOrdinal<string, {}>;
  private cCustomScale: StringRangeScale<number> | null;

  private canvas: d3.Selection<d3.BaseType, {}, null, undefined>;
  private chart: d3.Selection<d3.BaseType, {}, null, undefined>;
  private chartBox: d3.Selection<d3.BaseType, {}, null, undefined>;

  private readonly selector: BarSelector;
  private readonly resizer: BarResizer;
  private readonly dragger: Dragger;
  

  
  constructor(
    data: Data,
    container: HTMLDivElement,
    toggleColorPicker: ToggleColorPicker,
    updateRecommendation: UpdateRecommendation,
    setVisualScales: SetVisualScales,
    getVisualScaleRange: GetVisualScaleRange,
    getDefaultVisualValue: GetDefaultVisualValue,
    // the next one is for size since color is handled in app and resize is handled here
    handleChangeVisualByUser: HandleChangeVisualByUser,
    setIsDragging: SetIsDragging,
    handleDragEnd: HandleDragEnd,
  ){
    this.data = data;
    this.container = container;
    this.toggleColorPicker = toggleColorPicker;
    this.getVisualScaleRange = getVisualScaleRange;
    this.setVisualScales = setVisualScales;
    this.getDefaultVisualValue = getDefaultVisualValue;
    this.handleChangeVisualByUser = handleChangeVisualByUser;
    this.setIsDragging = setIsDragging;
    this.handleDragEnd = handleDragEnd;

    this.xName = null;
    this.zName = null; // important to not left this undefined - see updateVisualSize()

    this.numericAttrList = memoizedGetAttributes(data)
      .filter((attr: Attribute) => attr.type === 'number')
      .map((attr: Attribute) => attr.name);
    
    this.init();

    // must be after init()
    this.selector = new BarSelector(
      this.chartBox.node() as SVGRectElement,
      this.handlePendingSelectionChange,
      this.handleSelectionChange,
    );

    this.resizer = new BarResizer(
      this.chartBox.node() as SVGRectElement,
      this.handleResizeX,
      (d: number) => {console.log(d)},
      this.handleResizeXFinish,
    );

    this.dragger = new Dragger(this);

    this.setFilteredData(new Set());
    
    this.activeSelections = new ActiveSelectionsWithRec(
      this.getGroupData,
      updateRecommendation,
      this.handleActiveSelectionChange,
    );
  }

  private getGroupData = () => this.groupData;

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

    this.groupData = this.fdataNested.map(({key, values}) => {
      const gEntry = {
        __is_group__: 1,
        __id_extra__: key,
      };
      for (const attr of this.numericAttrList) {
        gEntry[attr] = d3.mean(values, d => d[attr] as number)
      }
      return gEntry;
    })

    this.xDomain = this.fdataNested.map(d => d.key);
    this.updateSizes();
  };

  private updateSizes = () => {
    // size only makes sense when there is an x attribute
    if (!this.xName) {
      return;
    }
    const {zName} = this;
    if (!zName) {
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
    this.chartBox.attr('width', newW);
    this.selector.setChartBoxNode(this.chartBox.node() as SVGRectElement);
    this.xScale = d3.scaleOrdinal()
      .domain(this.xDomain)
      .range(xRange);
  }

  private updateCustomSizes = (customSizes: {[key: string]: number}) => {
    this.sizes = {
      ...this.sizes,
      ...customSizes,
    };
  }

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
  setFilteredData = (filteredIds: ReadonlySet<string>) => {
    this.fdata = this.data.filter(d => !filteredIds.has(d.__id_extra__));
    this.updateDerivedFields();
  };


  init = () => {

    const {pad: {t, b, l, r}, svgH, svgW} = CHARTCONFIG;

    d3.select(this.container).selectAll('svg').remove();

    this.canvas = d3.select(this.container)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('id', 'plot')
      .on('mousedown', () => this.toggleColorPicker(d3.event, false));
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
      .attr('x', 250).attr('y', 80)
      .classed('label', true);
    this.chart.append('g')
      .classed('y-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', -200).attr('y', -80)
      .attr('transform', 'rotate(-90)')
      .classed('label', true);
  };




  updateDataAndPlot = (filteredIds: ReadonlySet<string>, plotConfig: PlotConfig) => {
    // filtering has a much more global effect on bar chart than on scatterplot.
    this.setFilteredData(filteredIds);
    this.redrawAll(plotConfig);
  };


  redrawAll = (plotConfig: PlotConfig) => {
    this.updatePositionAndSize(plotConfig);
    this.updateVisualColor(plotConfig[VField.COLOR]);
  };


  updatePositionAndSize = (plotConfig: PlotConfig) => {
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
      this.chartBox.attr('width', CHARTCONFIG.svgW);
      this.selector.setChartBoxNode(this.chartBox.node() as SVGRectElement);
      return;
    }

    // x-attribute should be string-valued and y-attribute be number
    const xName = x.attribute.name;
    const yName = y.attribute.name;
    this.setXName(xName);

    this.setZName(size ? size.attribute.name : null);

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
      .append('g')
      .classed('bar', true)
      .attr('data-cx', d => this.xScale(d.key) as number)
      .on('click', d => {
        const id = d.key
        if (!this.resizer.getIsHovering()) {
          if (!(d3.event.ctrlKey || d3.event.metaKey)) {
            this.selector.selectOnlyOne(id);
          } else {
            this.selector.selectToggle(id);
          }
        }
      })
      .on('contextmenu', d => {
        d3.event.preventDefault();
        if (this.selector.getIsSelected(d.key)) {
          this.toggleColorPicker(d3.event, true);
        }
      });

    newBars.append('rect')
      .classed('bar__rect', true)
      .attr('fill', this.getDefaultVisualValue(VField.COLOR))
      .call(this.dragger.getDragger());
    
    for (const b of ['left', 'right']) {
      newBars.append('rect')
        .classed('bar__xborder', true)
        .classed('bar__xborder--' + b, true)
        .attr('width', BAR_XBORDER_W)
        .on('mousedown', d => {
          if (this.selector.getIsSelected(d.key)) {
            this.resizer.handleMouseDownX(d3.event);
          }
        })
        .on('mouseenter', d => {
          if (this.selector.getIsSelected(d.key)) {
            this.resizer.handleMouseEnter(d3.event);
          }
        })
        .on('mouseleave', () => 
          this.resizer.handleMouseLeave(d3.event)
        );
    }


    const allBars = bars.merge(newBars)

    allBars.select('.bar__rect')
      .transition()
      .duration(1000)
      .attr('x', d => (this.xScale(d.key) as number) - this.sizes[d.key] / 2)
      .attr('width', d => this.sizes[d.key])
      .attr('y', d => yScale(this.getMean(d.values, yName)))
      .attr('height', d => svgH - pad.t - pad.b - yScale(this.getMean(d.values, yName)))

    for (const b of ['left', 'right']) {
      allBars.select('.bar__xborder--' + b)
        .transition()
        .duration(1000)
        .attr('x', d => (this.xScale(d.key) as number) 
          + (b === 'left' ? -this.sizes[d.key] / 2 : this.sizes[d.key] / 2 - BAR_XBORDER_W)
        )
        .attr('y', d => yScale(this.getMean(d.values, yName)))
        .attr('height', d => svgH - pad.t - pad.b - yScale(this.getMean(d.values, yName)))
    }

    bars.exit()
      .each((d: NestedDataEntry) => this.selector.unselectOne(d.key))
      .remove();

    this.activeSelections.resetValue(VField.SIZE); // this also removes recommended encoding
  };


  private syncVisualSize = () => {
    // sync the visual (x and size) to this.sizes
    const bars = this.chart.selectAll('.bar');
    bars
      .attr('data-cx', (d: NestedDataEntry) => this.xScale(d.key) as number)
    bars
      .select('.bar__rect')
      .attr('x', (d: NestedDataEntry) => (this.xScale(d.key) as number) - this.sizes[d.key] / 2)
      .attr('width', (d: NestedDataEntry) => this.sizes[d.key]);

    for (const b of ['left', 'right']) {
      bars
        .select('.bar__xborder--' + b)
        .attr('x', (d: NestedDataEntry) => (this.xScale(d.key) as number) 
          + (b === 'left' ? -this.sizes[d.key] / 2 : this.sizes[d.key] / 2 - BAR_XBORDER_W)
        );
    }

    // Update x axis
    if (this.xName) {
      // @ts-ignore
      this.chart.select('.x-axis').call(d3.axisBottom(this.xScale));
    }
  }


  // updateVisual = (fields: VField[], plotConfig: PlotConfig) => {
  //   if (!this.fdata.length) {
  //     return;
  //   }
  //   const {[VField.SIZE]: sizeEntry, [VField.COLOR]: colorEntry} = plotConfig
  //   if (fields.includes(VField.SIZE)) {
  //     this.updateVisualSize(sizeEntry ? sizeEntry.attribute.name : null);
  //   }
  //   if (fields.includes(VField.COLOR)) {
  //     this.updateVisualColor(colorEntry);
  //   }
  // };

  // private updateVisualSize = (zName: string | null) => {
    
  //   // size change involves position change. Indeally we do not need to update y again
  //   //    but if we only doing another size transition it leads to size-transition preempting
  //   //    the y-transition in updatePosition() in the situations
  //   //    where both updatePosition() and updateVisual() are called (in setPlotConfig() in App.tsx)
    
  //   // We could do either 
  //   // (1) just call updatePosition(), doing redundant computation on y to get complete transition
  //   // (2) since updatePosition() actually takes size into account when drawing the bars, we can
  //   //      do size update here ONLY when zName changes - this is also more efficient
  //   //    Note this requires updatePosition() to keep zName sync-ed with plotConfig. This is
  //   //    because of the case where the bar chart is initialized with size attribute already present, 
  //   //    so both updatePosition() and updateVisual() are called but no change in between. In this case
  //   //    sizes should be updated by updatePosition() instead of updateVisual().
  //   // (3) use techniques for concurrent d3 transitions, see Bostock
  //   // https://bl.ocks.org/mbostock/5348789
  //   // https://bl.ocks.org/mbostock/6081914

  //   // currently doing (2)


  //   if (zName === this.zName) {
  //     console.log('size not updated');
  //     return;
  //   }

  //   console.log('update size on bar chart');
  //   this.setZName(zName);

  //   this.chart
  //     .selectAll('.bar__rect')
  //     .transition()
  //     .duration(1000)
  //     .attr('x', (d: NestedDataEntry) => (this.xScale(d.key) as number) - this.sizes[d.key] / 2)
  //     .attr('width', (d: NestedDataEntry) => this.sizes[d.key]);
      

  //   if (this.xName) {
  //     // @ts-ignore
  //     this.chart.select('.x-axis').call(d3.axisBottom(this.xScale));
  //   }
  // };

  private updateVisualColor = (cEntry: PlotConfigEntry | undefined) => {
    if (!this.xName) {
      return;
    }
    console.log('update color on bar chart');
    const bars = this.chart
      .selectAll('.bar__rect');
    if (!cEntry) {
      bars.attr('fill', this.getDefaultVisualValue(VField.COLOR));
      return;
    }

    const {attribute: {name: cName}, useCustomScale} = cEntry;
    let cScale: StringRangeScale<number>;
    let shouldUpdateRange: boolean;
    if (!useCustomScale) {
      this.cCustomScale = null;
      const [hslstr1, hslstr2] = this.getVisualScaleRange(VisualScaleType.COLOR_NUM) as [string, string];
      const domain = this.getExtent(cName);
      cScale = ColorUtil.interpolateColorScale(
        domain,
        domain,
        [ColorUtil.stringToHSL(hslstr1), ColorUtil.stringToHSL(hslstr2)],
      );
      shouldUpdateRange = false;
    } else {
      cScale = this.cCustomScale || 
        this.activeSelections.getInterpolatedScale(VField.COLOR, cName) as StringRangeScale<number>;
      this.cCustomScale = cScale;
      shouldUpdateRange = true;
    }
    this.setVisualScales(VisualScaleType.COLOR_NUM, cScale, shouldUpdateRange);
    this.activeSelections.resetValue(VField.COLOR);
    bars.attr('fill', (d: NestedDataEntry) => cScale(this.getMean(d.values, cName)));
  };

  updateVisualWithRecommendation = (vfield: VField, attrName: string) => {
    if (vfield === VField.COLOR) {
      const cScale = this.activeSelections.getInterpolatedScale(VField.COLOR, attrName) as StringRangeScale<number>;
      this.chart.selectAll('.bar__rect').attr('fill', (d: NestedDataEntry) => cScale(this.getMean(d.values, attrName)));
    } else if (vfield === VField.SIZE) {
      console.log('(No preview for bar size change yet.)');
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
  
  syncVisualToUserSelection = (vfield: VField) => {
    if (vfield === VField.COLOR) {
      this.chart
        .selectAll('.bar')
        .select('.bar__rect')
        .attr('fill', 
          (d: NestedDataEntry) =>
            this.activeSelections.getValue(VField.COLOR, d.key) || 
            this.getDefaultVisualValue(VField.COLOR)
        );
    } else if (vfield === VField.SIZE) {
      const customSizes = {};
      for (const x of this.xDomain) {
        customSizes[x] = this.activeSelections.getValue(VField.SIZE, x) ||
            this.getDefaultVisualValue(VField.SIZE);
      }
      this.updateCustomSizes(customSizes);
      this.syncVisualSize();
    }
  };
  
  assignVisual = (vfield: VField, value: string) => {
    this.activeSelections.assignValue(vfield, this.selector.getSelectedIds(), value);
    this.syncVisualToUserSelection(vfield);
    if (vfield === VField.COLOR) {
      this.cCustomScale = null;
    }
  };

  unVisualAll = (vfield: VField) => {
    // This is a VISUAL method that will clear ALL visual (including ones generated by encoding box)
    // NOW this is also only called in user-selection mode since we can
    // clear encoding directly in the encoding fields.
    this.activeSelections.resetValue(vfield);
    this.syncVisualToUserSelection(vfield);
  };
  
  private handleActiveSelectionChange = (vfield: VField) => {
    console.log();
  };
  
  clearSelection = (idSet: ReadonlySet<string>) => {
    this.selector.clearSelection(idSet);
  };


  private handleResizeX = (size: number) => {
    this.handleChangeVisualByUser(VField.SIZE, size.toString());
  };

  private handleResizeXFinish = () => {
    this.updateXWithSize();
    this.syncVisualSize();
  };

}

export { BarPlotter };