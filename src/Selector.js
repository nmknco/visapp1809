import * as d3 from 'd3';
import { Rect, SelUtil } from './util';

class Selector {
  constructor(
    chartBgNode, 
    onPendingSelectionChange = (() => {}),
    onSelectionChange = (() => {}),
  ){
    this.chartBgNode = chartBgNode;
    this.onPendingSelectionChange = () => onPendingSelectionChange(this.selectedIds, this.pendingIds);
    this.onSelectionChange = () => onSelectionChange(this.selectedIds);

    this.isSelecting = false;
    this.selNode = null;
    this.selRect = null;
    this.origin = null;
    this.selectedIds = new Set();
    this.pendingIds = new Set();

    this._addDragListeners();
  }

  getSelectedIds = () => this.selectedIds;

  hasSelection = () => this.selectedIds.size > 0;

  getIsSelected = (id) => this.selectedIds.has(id);
  
  getIsSelectedOrPending = (id) => 
    this.selectedIds.has(id) || this.pendingIds.has(id);

  _addDragListeners = () => {
    this.chartBgNode.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isSelecting = true;
      this.origin = SelUtil.calcPos(e, this.chartBgNode);

      this.selNode = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      this.selNode.classList.add('selection-shade');
      this.selRect = new Rect(this.origin, this.origin);
      this._updateRectNode();
      const chartNode = this.chartBgNode.parentNode;
      chartNode.insertBefore(this.selNode, chartNode.firstChild);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isSelecting) {
        this.selRect = new Rect(this.origin, SelUtil.calcPos(e, this.chartBgNode));
        this._updateRectNode();

        this.pendingIds.clear();
        if (!(e.ctrlKey || e.metaKey)) {
          this.selectedIds.clear();
        }

        const { selRect, pendingIds } = this;
        d3.selectAll('.dot:not(.hidden)') // prevent selecting filtered-out points
          .each(function(d) {
          // Not using arrow func to void 'this' binding
            if (selRect.containsCoor(
              +this.getAttribute('data-x'), 
              +this.getAttribute('data-y'),
            )) { 
              pendingIds.add(d.__id_extra__); 
            }
          });
        this.onPendingSelectionChange();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isSelecting) {
        for (let id of this.pendingIds) {
          this.selectedIds.add(id);
        }
        this.pendingIds.clear();
        this.isSelecting = false;
        this.selNode.outerHTML = '';
        this.onSelectionChange();
      }
    });
  };

  // Single-dot handlers are defined here but event listeners are added 
  //    by the plotter as the dots may not have been created yet
  selectOnlyOne = (id) => {
    this.selectedIds.clear();
    this.pendingIds.clear();
    this.selectedIds.add(id);
    this.onSelectionChange();
  };

  selectToggle = (id) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.onSelectionChange();
  };

  unselectOne = (id) => {
    this.selectedIds.delete(id);
    this.onSelectionChange();
  };

  // Called then color the whole plot (with encoding or accepted recommendation)
  clearSelection = () => {
    this.selectedIds.clear();
    this.onSelectionChange();
  };

  _updateRectNode = () => {
    this.selRect.updateToNode(this.selNode);
  };

}

export { Selector };