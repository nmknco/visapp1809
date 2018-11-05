import * as d3 from 'd3';
import { Selector } from './Selector';
import { Resizer } from './Resizer';
import { Dragger } from './Dragger';
import { ActiveSelectionsWithRec } from './ActiveSelections';
import { expandRange, SelUtil } from './util';
import { CHARTCONFIG } from './commons/constants';

const SVGATTR_BY_FIELD = {color: 'stroke', size: 'r'};
const DEFAULT_BY_FIELD = {color: '#999999', size: 7};


class MainPlotter {
  constructor(
    data, 
    container, 
    updateColorPicker,
    onDataPointHover,
    updateRecommendation,
    handleChangeVisualByUser,
    handleDragPointsEnd,
    setMinimapScales,
    updateHasSelection,
    updateHasActiveSelection,
    setIsDraggingPoints,
  ){
    this.data = data;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;
    this.handleChangeVisualByUser = handleChangeVisualByUser;
    this.handleDragPointsEnd = handleDragPointsEnd;
    this.setMinimapScales = setMinimapScales;
    this.updateHasSelection = updateHasSelection;
    this.updateHasActiveSelection = updateHasActiveSelection;
    this.setIsDraggingPoints = setIsDraggingPoints;
    
    this.activeSelections = new ActiveSelectionsWithRec(
      data, 
      updateRecommendation,
      this.handleActiveSelectionChange,
    );

    this.scales = {x:{}, y:{}, color:{}, size: {}};
    this.customScales = {color: null, size: null}; // preserve this for toggle on and off x/y axis 
                                         // (as active selection is cleared and can't be used for restoration)

    this.chart = null;
    this.selector = null;
    this.resizer = null;

    this.isDraggingPoints = false;

    this.init();
  }

  getActiveSelections = () => this.activeSelections;

  init = () => {

    const {pad: {t, r, b, l}, svgH, svgW} = CHARTCONFIG;

    d3.select(this.container).selectAll('svg').remove();

    const canvas = d3.select(this.container)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
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
    
    this.chart = chart;

    this.selector = new Selector(
      chartBox.node(),
      this.handlePendingSelectionChange,
      this.handleSelectionChange,
    );
    
    this.resizer = new Resizer(
      chartBox.node(),
      this.handleResizing,
    );

    this.dragger = new Dragger(this);

    chart.append('g')
      .attr('transform', `translate(0, ${svgH - t - b})`)
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

    const {pad: {t, r, b, l}, svgH, svgW} = CHARTCONFIG;
    const data = this.data;

    const { x, y } = plotConfig;

    if (!x || !y) {
      this.chart.selectAll('.dot').remove();
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

    const x_attr = x.attribute.name;
    const y_attr = y.attribute.name;
    const xScale = this.scales.x[x_attr] || (
      (x.attribute.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[x_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[x_attr]))
          .padding(0.2)
    ).range([0, svgW - l - r]);

    const yScale = this.scales.y[y_attr] || (
      (y.attribute.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[y_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[y_attr]))
          .padding(0.2)
    ).range([svgH - t - b, 0]);

    // cache
    this.scales.x[x_attr] = xScale;
    this.scales.y[y_attr] = yScale;
    // pass to the minimaps
    this.setMinimapScales({xScale, yScale});

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
      .attr('r', DEFAULT_BY_FIELD.size)
      .call(this.dragger.getDragger());

    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', DEFAULT_BY_FIELD.size)
      .attr('stroke', DEFAULT_BY_FIELD.color)
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

  updateVisual = (fields, plotConfig, keepSelection) => {
    console.log('update visual called');

    const data = this.data;

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
                d3.scaleSequential(t => d3.interpolateInferno(d3.scaleLinear().domain([0,1]).range([0.92,0])(t))).domain(d3.extent(data, d => d[attrName])) :
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

  handleActiveSelectionChange = (field, activeSelection) => {
    this.updateHasActiveSelection(field, activeSelection.hasActiveSelection(field));
  }

  handlePendingSelectionChange = (selectedIds, pendingIds) => {
    this.highlightDots(id => selectedIds.has(id) || pendingIds.has(id));
  };

  handleSelectionChange = (selectedIds) => {
    this.highlightDots(id => selectedIds.has(id));
    this.updateHasSelection(selectedIds.size > 0);
  };

  highlightDots = (idFilter) => {
    d3.selectAll('.dot')
      .classed('selected', d => idFilter(d.__id_extra__));
  };

  clearSelection = (idSet) => {
    this.selector.clearSelection(idSet);
  };

  handleResizing = (r) => {
    this.handleChangeVisualByUser('size', r);
  };

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

}

export { MainPlotter };