import * as d3 from 'd3';

import { CHARTCONFIG } from './commons/constants';
import { Pos } from './commons/util';

class Dragger {
  constructor(plotter) {

    // To do: use plotter instead of binding
    // Make a copy of the selected at the beginning and use the copy 
    //    instead of querying the selector for the live selection (just to be safe)

    this._dragStart = this._dragStart.bind(plotter);
    this._dragMove = this._dragMove.bind(plotter);
    this._dragEnd = this._dragEnd.bind(plotter);
    
    this.dragger = d3.drag()
      .on('start', this._dragStart)
      .on('drag', this._dragMove)
      .on('end', this._dragEnd)
  }

  getDragger = () => {
    return this.dragger;
  };

  _dragStart() {
    // console.log('drag start');
  }

  _dragMove(d) {
    if (this.selector.getIsSelected(this.chartType === 'scatterplot' ? d.__id_extra__ : d.key)) {
      // console.log('drag')
      if (!this.isDragging) {
        // Do the clone upon the first drag event rather than start - otherwise
        //    the click behavior may be prevented
        this.isDragging = true;
        this.setIsDragging(true);

        const e = d3.event.sourceEvent;
        this.DraggingOrigin = new Pos(e.clientX, e.clientY);

        const copyDiv = document.createElement('div');
        copyDiv.classList.add('drag-clone')
        Object.assign(copyDiv.style, {
          position: 'absolute',
          left: 0,
          top: 0,
        });
        const copyCanvas = d3.select(copyDiv)
          .append('svg')
          .attr('width', CHARTCONFIG.svgW)
          .attr('height', CHARTCONFIG.svgH)
          .append('g')
          .attr('transform', `translate(${CHARTCONFIG.pad.l}, ${CHARTCONFIG.pad.t})`);
        this.chart.selectAll(this.chartType === 'scatterplot' ? '.dot' : '.bar')
          .filter(d => this.selector.getIsSelected(
            this.chartType === 'scatterplot' ? d.__id_extra__ : d.key
          ))
          .each(function() {
            // Not using arrow func to avoid 'this' binding
            copyCanvas.append(() => this.cloneNode(true))
          });
        this.container.appendChild(copyDiv);
      } else {
        // Drag has started
        const e = d3.event.sourceEvent;
        const ePos = new Pos(e.clientX, e.clientY);
        const offset = ePos.relativeTo(this.DraggingOrigin);
        const copyDiv = this.container.querySelector('.drag-clone');
        Object.assign(copyDiv.style, {
          left: offset.x + 'px',
          top: offset.y + 'px',
        });
        const svg = null;
      }
    }
  }

  _dragEnd() {
    if (this.isDragging) {
      // console.log('end');
      this.isDragging = false;
      this.setIsDragging(false);
      this.container.removeChild(this.container.querySelector('.drag-clone'));
      this.handleDragEnd(new Set(this.selector.getSelectedIds())); // make a copy!
    }
  }
}

export { Dragger };