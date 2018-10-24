import * as d3 from 'd3';
import { Selector } from './Selector';
import { Resizer } from './Resizer';
import { ActiveSelectionsWithRec } from './ActiveSelections';
import { expandRange, SelUtil, Pos } from './util';

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
    handleDragPointsEnd,
    setMinimapScales,
    updateHasSelection,
    updateHasActiveSelection,
    setIsDraggingPoints,
  ){
    this.data = data;
    this.chartConfig = chartConfig;
    this.container = container;
    this.updateColorPicker = updateColorPicker;
    this.onDataPointHover = onDataPointHover;
    this.handleChangeVisualByUser = handleChangeVisualByUser;
    this.handleDragPointsEnd = handleDragPointsEnd;
    this.setMinimapScales = setMinimapScales;
    this.updateHasSelection = updateHasSelection;
    this.setIsDraggingPoints = setIsDraggingPoints;

    this.activeSelections = new ActiveSelectionsWithRec(
      data, 
      updateRecommendation,
      updateHasActiveSelection,
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
    const c = this.chartConfig;

    d3.select(this.container).selectAll('svg').remove();

    const canvas = d3.select(this.container)
      .append('svg')
      .attr('width', c.svgW)
      .attr('height', c.svgH)
      .on('mousedown', this._closeColorPicker);
    const chart = canvas.append('g')
      .attr('transform', `translate(${c.pad.l}, ${c.pad.t})`);
    const chartBg = chart.append('rect')
      .classed('chart-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', c.svgW - c.pad.l - c.pad.r)
      .attr('height', c.svgH - c.pad.t - c.pad.b);
    
    this.chart = chart;

    this.selector = new Selector(
      chart.node(),
      chartBg.node(),
      this.handlePendingSelectionChange,
      this.handleSelectionChange,
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
      this.clearSelection();
      for (let field of ['color', 'size']) {
        this.activeSelections.resetValue(field);
      }
      return;
    }

    const x_attr = x.attribute.name;
    const y_attr = y.attribute.name;
  

    const xScale = this.scales.x[x_attr] || (
      (typeof data[0][x_attr] === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[x_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[x_attr]))
          .padding(0.2)
    ).range([0, c.svgW - c.pad.l - c.pad.r]);

    const yScale = this.scales.y[y_attr] || (
      (typeof data[0][y_attr] === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(d3.extent(data, d => d[y_attr]))) :
        d3.scalePoint()
          .domain(data.map(d => d[y_attr]))
          .padding(0.2)
    ).range([c.svgH - c.pad.t - c.pad.b, 0]);

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
      .on('click', d => {
        // console.log('click!');
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
          const left = c.pad.l + xScale(d[x_attr]) - 18;
          const top = c.pad.t + yScale(d[y_attr]) + 20;
          
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
      .call(
        d3.drag()
        .on('start', () => {
            // console.log('start');
        })
        .on('drag', d => {
          if (this.selector.getIsSelected(d.__id_extra__)) {
            // console.log('drag')
            if (!this.isDraggingPoints) {
              // Do the clone upon the first drag event rather than start - otherwise
              //    the click behavior may be prevented
              this.isDraggingPoints = true;
              this.setIsDraggingPoints(true);

              const e = d3.event.sourceEvent;
              this.draggingPointsOrigin = new Pos(e.clientX, e.clientY);

              const copyDiv = document.createElement('div');
              copyDiv.classList.add('drag-clone')
              Object.assign(copyDiv.style, {
                position: 'absolute',
                left: 0,
                top: 0,
                width: this.chart.attr('width'),
                height: this.chart.attr('height'),
              });
              const copyCanvas = d3.select(copyDiv)
                .append('svg')
                .attr('width', this.chartConfig.svgW)
                .attr('height', this.chartConfig.svgH)
                .append('g')
                .attr('transform', `translate(${this.chartConfig.pad.l}, ${this.chartConfig.pad.t})`);
              d3.select(this.container).selectAll('.dot')
                .filter(d => this.selector.getIsSelected(d.__id_extra__))
                .each(function() {
                  // Not using arrow func to avoid 'this' binding
                  copyCanvas.append(() => this.cloneNode(true))
                });
              this.container.appendChild(copyDiv);
            } else {
              // Drag has started
              const e = d3.event.sourceEvent;
              const ePos = new Pos(e.clientX, e.clientY);
              const offset = ePos.relativeTo(this.draggingPointsOrigin);
              const copyDiv = this.container.querySelector('.drag-clone');
              Object.assign(copyDiv.style, {
                left: offset.x + 'px',
                top: offset.y + 'px',
              });
              const svg = null;
            }
          }
        })
        .on('end', () => {
          if (this.isDraggingPoints) {
            // console.log('end');
            this.isDraggingPoints = false;
            this.setIsDraggingPoints(false);
            this.container.removeChild(this.container.querySelector('.drag-clone'));
            this.handleDragPointsEnd(new Set(this.selector.getSelectedIds())); // make a copy!
          }
        })
      );

    newDots.append('circle')
      .classed('circle circle-ring', true)
      .attr('r', DEFAULT_BY_FIELD.size)
      .attr('stroke', DEFAULT_BY_FIELD.color)
      .on('mousedown', d => this.resizer.handleMouseDown(d3.event, d.__id_extra__))
      .on('mouseenter', d => this.resizer.handleMouseEnter(d3.event, d.__id_extra__))
      .on('mouseleave', () => this.resizer.handleMouseLeave(d3.event));
  
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

  handlePendingSelectionChange = (selectedIds, pendingIds) => {
    this.highlightDots(id => selectedIds.has(id) || pendingIds.has(id))
  };

  handleSelectionChange = (selectedIds) => {
    this.highlightDots(id => selectedIds.has(id));
    this.updateHasSelection(selectedIds.size > 0)
  };

  highlightDots = (idFilter) => {
    d3.selectAll('.dot')
      .classed('selected', d => idFilter(d.__id_extra__));
  };

  clearSelection = () => {
    this.selector.clearSelection();
  };

  handleResizing = (r) => {
    this.handleChangeVisualByUser('size', r);
  }

  _closeColorPicker = () => {
    this.updateColorPicker({display: 'none'});
  }

  toggleHideOrDimPoints = (idSet, shouldHide, dimOnly=false)=> {
    this.chart.selectAll('.dot') // important not to select dots in drag copies
      .filter(d => idSet.has(d.__id_extra__))
      .classed('dim', false) // always reset dim
      .classed(dimOnly ? 'dim' : 'hidden', shouldHide);
  };

}

export { MainPlotter };