import * as d3 from 'd3';

import { CHARTCONFIG } from './Constants';
import { Pos } from './util';

class Dragger {
  constructor(plotter) {
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
        });
        const copyCanvas = d3.select(copyDiv)
          .append('svg')
          .attr('width', CHARTCONFIG.svgW)
          .attr('height', CHARTCONFIG.svgH)
          .append('g')
          .attr('transform', `translate(${CHARTCONFIG.pad.l}, ${CHARTCONFIG.pad.t})`);
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
  }

  _dragEnd() {
    if (this.isDraggingPoints) {
      // console.log('end');
      this.isDraggingPoints = false;
      this.setIsDraggingPoints(false);
      this.container.removeChild(this.container.querySelector('.drag-clone'));
      this.handleDragPointsEnd(new Set(this.selector.getSelectedIds())); // make a copy!
    }
  }
}

export { Dragger };