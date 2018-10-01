import * as d3 from 'd3';
import { Rect, SelUtil } from './util';

class Selector {
  constructor(chartNode, chartBgNode, onSelectionChange) {
    this.chartNode = chartNode;
    this.chartBgNode = chartBgNode;
    this.onSelectionChange = onSelectionChange || (() => {});

    this.isSelecting = false;
    this.selNode = null;
    this.selRect = null;
    this.origin = null;
    this.selectedIds = new Set();
    this.pendingIds = new Set();

    this.init();
  }

  getSelection = () => this.selectedIds;

  getIsSelected = (id) => this.selectedIds.has(id);
  
  getIsSelectedOrPending = (id) => 
    this.selectedIds.has(id) || this.pendingIds.has(id);

  init = () => {
    this.chartBgNode.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isSelecting = true;
      this.origin = SelUtil.calcPos(e, this.chartBgNode);

      this.selNode = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      this.selNode.classList.add('selection');
      this.selRect = new Rect(this.origin, this.origin);
      this._updateRectNode();
      this.chartNode.insertBefore(this.selNode, this.chartNode.firstChild);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isSelecting) {
        this.selRect = new Rect(this.origin, SelUtil.calcPos(e, this.chartBgNode));
        this._updateRectNode();

        this.pendingIds = new Set();
        if (!e.ctrlKey) {
          this.selectedIds = new Set();
        }

        const { selRect, pendingIds } = this;
        d3.selectAll('.dot').each(function(d) {
          if (selRect.containsCoor(
            this.getAttribute('data-x'), 
            this.getAttribute('data-y')
          )) { 
            pendingIds.add(d.__id_extra__); 
          }
        });
        this.onSelectionChange();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isSelecting) {
        for (let id of this.pendingIds) {
          this.selectedIds.add(id);
        }
        this.pendingIds = new Set();
        this.isSelecting = false;
        this.selNode.outerHTML = '';
      }
    });
  };

  selectOnlyOne = (id) => {
    this.selectedIds = new Set();
    this.pendingIds = new Set();
    this.selectedIds.add(id);
    this.onSelectionChange();
  }

  selectToggle = (id) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.onSelectionChange();
  }

  unselectOne = (id) => {
    this.selectedIds.delete(id);
    this.onSelectionChange();
  }

  _updateRectNode = () => {
    this.selRect.updateToNode(this.selNode);
  };

}

export { Selector };