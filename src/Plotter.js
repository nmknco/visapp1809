import * as d3 from 'd3';
import { DotSelector } from './Selector';
import { Resizer } from './Resizer';
import { Dragger } from './Dragger';
import { ActiveSelectionsWithRec } from './ActiveSelections';
import { expandRange, SelUtil, ColorUtil } from './commons/util';
import { CHARTCONFIG, DEFAULT_DOT_COLOR, DEFAULT_DOT_SIZE, ORD_COLORS } from './commons/constants';
import { memoizedGetExtent, memoizedGetUniqueValueList } from './commons/memoized';

const SVGATTR_BY_FIELD = {color: 'stroke', size: 'r'};


class MainPlotter {
  constructor(
    data, 
    container, 
    updateColorPicker,
    onDataPointHover,
    updateRecommendation,
    handleChangeVisualByUser,
    handleDragEnd,
    setVisualScales,
    updateHasSelection,
    updateHasActiveSelection,
    setIsDragging,
    onSelectionChange,
    getVisualScaleRange,
    getDefaultVisualValue,
  ){
    this.data = data;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;
    this.handleChangeVisualByUser = handleChangeVisualByUser;
    this.handleDragEnd = handleDragEnd;
    this.setVisualScales = setVisualScales;
    this.updateHasSelection = updateHasSelection;
    this.updateHasActiveSelection = updateHasActiveSelection;
    this.setIsDragging = setIsDragging;
    this.onSelectionChange = onSelectionChange;
    this.getVisualScaleRange = getVisualScaleRange;
    this.getDefaultVisualValue = getDefaultVisualValue;

    this.chartType = 'scatterplot';
    
    this.activeSelections = new ActiveSelectionsWithRec(
      this.getData,
      updateRecommendation,
      this.handleActiveSelectionChange,
    );

    this.scales = {x:{}, y:{}}; // color/size removed since changes are too frequent.
                                // Maybe get rid of xand y later too.
    this.customScales = {color: null, size: null}; // preserve this for toggle on and off x/y axis 
                                         // (as active selection is cleared and can't be used for restoration)

    this.canvas = null;
    this.chart = null;
    this.selector = null;
    this.resizer = null;

    this.isDragging = false;

    this.init();
  }

  getData = () => this.data;

  getActiveSelections = () => this.activeSelections;

  init = () => {

    const {pad: {t, r, b, l}, svgH, svgW} = CHARTCONFIG;

    d3.select(this.container).selectAll('svg').remove();

    const canvas = d3.select(this.container)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('id', 'plot')
      .on('mousedown', this._closeColorPicker);
    const chart = canvas.append('g')
      .attr('transform', `translate(${l}, ${t})`);

    // the box listening for select/resize drag, also works as ref for computing positions
    const chartBox = chart.append('rect') 
      .classed('chart-box', true)
      .attr('id', 'chart-box')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', svgW - l - r)
      .attr('height', svgH - t - b);
    
    this.canvas = canvas;
    this.chart = chart;

    this.selector = new DotSelector(
      chartBox.node(),
      this.handlePendingSelectionChange,
      this.handleSelectionChange,
    );
    
    this.resizer = new Resizer(
      chartBox.node(),
      this.handleResizing,
      this.handleResizingFinish,
    );

    this.dragger = new Dragger(this);

    chart.append('g')
      .attr('transform', `translate(0, ${svgH - t - b})`)
      .classed('x-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', 250).attr('y', 104)
      .classed('label', true);
    chart.append('g')
      .classed('y-axis', true)
      .classed('axis-container', true)
      .append('text')
      .attr('x', -200).attr('y', -80)
      .attr('transform', 'rotate(-90)')
      .classed('label', true);

  };


  redrawAll = (plotConfig) => {
    this.updatePosition(plotConfig);
    this.updateVisual(['color', 'size'], plotConfig);
  };

  updatePosition = (plotConfig) => {
    console.log('update position called');

    const {pad: {t, r, b, l}, svgH, svgW} = CHARTCONFIG;
    const data = this.data;

    const { x, y } = plotConfig;

    if (!x || !y) {
      this.chart.selectAll('.dot').remove();
      this.chart.selectAll('.axis-container').selectAll('*').remove();
      this.clearSelection();
      for (let field of ['color', 'size']) {
        this.activeSelections.resetValue(field);
      }
      return;
    }

    // Note this

    // Note, these are variables that are created anew each time. They
    //  won't update the old closures when points move. 
    //  i.e. Don't rely on these values' changes when writing event handlers 
    //  (unless we store them in a persistent source, for exmaple, `this`,)


    // TODO: Compute the scales with the same memoized function that is
    //  to be shared with Minimap.tsx
    const x_attr = x.attribute.name;
    const y_attr = y.attribute.name;
    const xScale = this.scales.x[x_attr] || (
      (x.attribute.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(memoizedGetExtent(data, x_attr))) :
        d3.scalePoint()
          .domain(memoizedGetUniqueValueList(data, x_attr))
          .padding(0.2)
    ).range([0, svgW - l - r]);

    const yScale = this.scales.y[y_attr] || (
      (y.attribute.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(memoizedGetExtent(data, y_attr))) :
        d3.scalePoint()
          .domain(memoizedGetUniqueValueList(data, x_attr))
          .padding(0.2)
    ).range([svgH - t - b, 0]);

    // cache
    this.scales.x[x_attr] = xScale;
    this.scales.y[y_attr] = yScale;

    const xg = this.chart.select('.x-axis');
    const yg = this.chart.select('.y-axis');
    xg.call(d3.axisBottom(xScale));
    yg.call(d3.axisLeft(yScale));
    xg.select('.label').text(x_attr);
    yg.select('.label').text(y_attr);

    const dots = this.chart
      .selectAll('.dot')
      .data(data, d => d.__id_extra__);
  
    // event listeners are bound only once when each dot enters
    let newDots = dots.enter()
      .append('g')
      .classed('dot', true)
      .classed('normal', true)
      .attr('id', d => `point-${d.__id_extra__}`)
      .on('click', d => {
        // console.log('click!');
        const id = d.__id_extra__
        if (!this.resizer.getIsHovering()) {
          if (!(d3.event.ctrlKey || d3.event.metaKey)) {
            this.selector.selectOnlyOne(id);
          } else {
            this.selector.selectToggle(id);
          }
        }
      })
      .on('contextmenu', d => {
        // Need to get things from reference, otherwise there's closure problem
        d3.event.preventDefault();
        if (this.selector.getIsSelected(d.__id_extra__)) {
          // WRONG!!!!!!!
          // const left = l + xScale(d[x_attr]) - 18;
          // const top = t + yScale(d[y_attr]) + 20;

          // Correct
          const node = d3.event.target.parentNode;
          const {x, y} = node.dataset
          const left = l + (+node.dataset.x) - 18;
          const top = t + (+node.dataset.y) + 20;
          this.updateColorPicker({left, top, display: undefined});
        }
      });

    newDots.on('mouseenter', d => {
        this.onDataPointHover(d);
      }).on('mouseleave', d => {
        this.onDataPointHover({});
      });
    
    newDots.append('circle')
      .classed('circle circle-bg', true)
      .attr('r', this.getDefaultVisualValue('size'))
      .call(this.dragger.getDragger());

    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', this.getDefaultVisualValue('size'))
      .attr('stroke', this.getDefaultVisualValue('color'))
      .on('mousedown', d => {
        if (this.selector.getIsSelected(d.__id_extra__)) {
          this.resizer.handleMouseDown(d3.event);
        }
      })
      .on('mouseenter', d => {
        if (this.selector.getIsSelected(d.__id_extra__)) {
          this.resizer.handleMouseEnter(d3.event);
        }
      })
      .on('mouseleave', () => 
        this.resizer.handleMouseLeave(d3.event)
      );
  
    dots.merge(newDots)
      .transition()
      .duration(1000)
      .attr('transform', d => `translate(${xScale(d[x_attr])}, ${yScale(d[y_attr])})`)
      // Save position data in attributes for selection funcitons
      .attr('data-x', d => xScale(d[x_attr]))
      .attr('data-y', d => yScale(d[y_attr]));

    // this shouldn't happen in current setting (no points excluded in individual plots)
    dots.exit()
      .each(d => this.selector.unselectOne(d.__id_extra__))
      .remove();

  };

  updateVisual = (fields, plotConfig) => {
    console.log('update visual called');

    const data = this.data;

    for (let field of fields) {
      const entry = plotConfig[field];
      let attrName, visualScale, scaleType;
      let shouldUpdateRange = false;
      
      if (entry) {
        attrName = entry.attribute.name;
        if (entry.useCustomScale) {
          scaleType = (field === 'size') ?
            'size' : 
            (entry.attribute.type === 'number' ? 'color_num' : 'color_ord');
          visualScale = this.customScales[field] || this.activeSelections.getInterpolatedScale(field, attrName);
          this.customScales[field] = visualScale;
          shouldUpdateRange = true;
        } else {
          if (field === 'color') {
            if (entry.attribute.type === 'number') {
              scaleType = 'color_num';
              const [hslStr1, hslStr2] = this.getVisualScaleRange(scaleType);
              const domain = memoizedGetExtent(data, attrName);
              visualScale = ColorUtil.interpolateColorScale(domain, domain,
                [ColorUtil.stringToHSL(hslStr1), ColorUtil.stringToHSL(hslStr2)]);
            } else {
              scaleType = 'color_ord';
              // visualScale = d3.scaleOrdinal(d3['scheme' + this.getVisualScaleRange(scaleType)])
              visualScale = d3.scaleOrdinal(ORD_COLORS)
                .domain(memoizedGetUniqueValueList(data, attrName));
            }
          } else if (field === 'size') {
            scaleType = 'size';
            visualScale = d3.scaleLinear()
              .domain(expandRange(memoizedGetExtent(data, attrName)))
              .range(this.getVisualScaleRange(scaleType));
          }
          // Nullify the custom scale cache - may be ok not doing so here, 
          // but done for consistency: The assumption is that
          // the cache is only used for restoring after removing x/y encoding, 
          // so cache is kept only as long as custom scale is on
          this.customScales[field] = null;
        }
        this.setVisualScales(scaleType, visualScale, shouldUpdateRange);
      } else {
        // reset visual upon empty plotConfig entry
        visualScale = () => this.getDefaultVisualValue(field);
        this.customScales[field] = null;
        this.setVisualScales(field, null);
      }

      // Clear both colored groups and selection, then apply visual
      // -- We need to keep selection in certain situations, for example when resetting
      //  the color field and then color user selected points. See handleChangeVisualByUser()
      //  in App.tsx
      // -- For now. let's just keep selection for all cases
      // this.clearSelection();
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
    // ONLY USE FOR PREVIEW!!
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
      d => this.activeSelections.getValue(field, d.__id_extra__) || this.getDefaultVisualValue(field)
    );
  };

  assignVisual = (field, value, options) => {
    this.activeSelections.assignValue(
      field,
      this.selector.getSelectedIds(),
      value,
      options,
    );
    this.syncVisualToUserSelection(field);
  };

  unVisualGivenIds = (field, idSet) => {
    // This is a VISUAL method that updates all visual but is only called in user-selection mode
    // If we do not want to sync visuals, just use ActiveSelection methods directly
    this.activeSelections.resetValue(field, idSet);
    this.syncVisualToUserSelection(field);
  };

  unVisualSelected = (field) => {
    // This is a VISUAL method that updates all visual but is only called in user-selection mode
    // If we do not want to sync visuals, just use ActiveSelection methods directly
    this.unVisualGivenIds(field, this.selector.getSelectedIds());
  };

  unVisualAll = (field) => {
    // This is a VISUAL method that will clear ALL visual (including ones generated by encoding box)
    // NOW this is also only called in user-selection mode since we can
    // clear encoding directly in the encoding fields.
    this.activeSelections.resetValue(field);
    this.syncVisualToUserSelection(field);
  };

  handleActiveSelectionChange = (field) => {
    this.updateHasActiveSelection(field, this.activeSelections.hasActiveSelection(field));
  }

  handlePendingSelectionChange = (selectedIds, pendingIds) => {
    this.highlightDots(id => selectedIds.has(id) || pendingIds.has(id));
  };

  handleSelectionChange = (selectedIds) => {
    this.highlightDots(id => selectedIds.has(id));
    this.updateHasSelection(selectedIds.size > 0);
    this.onSelectionChange();
  };

  highlightDots = (idFilter) => {
    d3.select('#plot')
      .selectAll('.dot')
      .classed('selected', d => idFilter(d.__id_extra__));
  };

  clearSelection = (idSet) => {
    this.selector.clearSelection(idSet);
  };

  handleResizing = (r, preventUpdateRecommendation = true) => {
    this.handleChangeVisualByUser(
      'size',
      r.toString(),
      { preventUpdateRecommendation }
    );
  };

  handleResizingFinish = (r) => this.handleResizing(r, false);

  _closeColorPicker = () => {
    this.updateColorPicker({display: 'none'});
  };

  hideOrDimPoints = (shouldHide, shouldDimButNotHide) => {
    this.chart
      .selectAll('.dot') // important not to select dots in drag copies
      .classed('hidden', shouldHide)
      .classed('dim', shouldDimButNotHide)
      .classed('normal', d => !(shouldHide(d) || shouldDimButNotHide(d)));
  };

  selectByIds = (idSet) => this.selector.selectByIds(idSet);

  handleDragStart = () => {};

}

export { MainPlotter };