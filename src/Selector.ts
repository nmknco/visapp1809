import * as d3 from 'd3';

import {
  DataEntry,
  HandlePendingSelectionChange,
  HandleSelectionChange,
} from './commons/types';
import { Pos, Rect, SelUtil } from './commons/util';


class Selector {
  private readonly chartBoxNode: SVGRectElement;

  // The next two fields are also used as isSelecting check
  private selNode: SVGRectElement | null; // the <rect> selection window
  private origin: Pos | null;

  private selectedIds: Set<number>;
  private pendingIds: Set<number>;
  private readonly onPendingSelectionChange: () => void;
  private readonly onSelectionChange: () => void;

  constructor(
    chartBoxNode: SVGRectElement,
    onPendingSelectionChange: HandlePendingSelectionChange,
    onSelectionChange: HandleSelectionChange,
  ){
    this.chartBoxNode = chartBoxNode;
    this.onPendingSelectionChange = () => 
      onPendingSelectionChange(this.getSelectedIds(), this.getPendingIds());
    this.onSelectionChange = () =>
      onSelectionChange(this.getSelectedIds());

    this.selNode = null;
    this.origin = null;
    this.selectedIds = new Set();
    this.pendingIds = new Set();

    this.addDragListeners();
  }

  getSelectedIds = (): ReadonlySet<number> => new Set(this.selectedIds);
  getPendingIds = (): ReadonlySet<number> => new Set(this.pendingIds);

  hasSelection = (): boolean => this.selectedIds.size > 0;

  getIsSelected = (id: number): boolean => this.selectedIds.has(id);
  
  getIsSelectedOrPending = (id: number): boolean => 
    this.selectedIds.has(id) || this.pendingIds.has(id);

  private addDragListeners = () => {
    this.chartBoxNode.addEventListener('mousedown', (ev: MouseEvent) => {
      ev.preventDefault();
      this.origin = SelUtil.getEventPosRelativeToBox(ev, this.chartBoxNode);

      this.selNode = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      this.selNode.classList.add('selection-shade');
      Rect.updateNodeByRect(this.selNode, new Rect(this.origin, this.origin));
      const chartNode = this.chartBoxNode.parentNode!;
      chartNode.insertBefore(this.selNode, chartNode.firstChild);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.selNode && this.origin) {
        const currentRect = new Rect(
          this.origin, 
          SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode)
        );
        Rect.updateNodeByRect(this.selNode, currentRect);

        const { pendingIds } = this; // for use in context where there's no access via `this`
        pendingIds.clear();
        if (!(e.ctrlKey || e.metaKey)) {
          this.selectedIds.clear();
        }


        d3.selectAll('.dot:not(.hidden)') // prevent selecting filtered-out points
          .each(function(d: DataEntry) {
          // Not using arrow func to void `this` binding
          // d3 convention is that the node itself is `this`
            if(this) {
              const el = this as Element
              const x = el.getAttribute('data-x');
              const y = el.getAttribute('data-y');
              if (x && y && currentRect.containsCoor(+x, +y)) { 
                pendingIds.add(d.__id_extra__); 
              }
            }
          });
        this.onPendingSelectionChange();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.selNode && this.origin) {
        for (const id of this.pendingIds) {
          this.selectedIds.add(id);
        }
        this.pendingIds.clear();
        this.selNode.outerHTML = '';
        this.selNode = null;
        this.onSelectionChange();
      }
    });
  };

  // Single-dot handlers are defined here but event listeners are added 
  //    by the plotter as the dots may not have been created yet
  selectOnlyOne = (id: number) => {
    this.selectedIds.clear();
    this.pendingIds.clear();
    this.selectedIds.add(id);
    this.onSelectionChange();
  };

  selectToggle = (id: number) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.onSelectionChange();
  };

  unselectOne = (id: number) => {
    this.selectedIds.delete(id);
    this.onSelectionChange();
  };

  selectByIds = (idSet: ReadonlySet<number>) => {
    this.selectedIds = new Set(idSet);
    this.onSelectionChange();
  };

  clearSelection = (idSet?: ReadonlySet<number>) => {
    // clear some: Called when some points are filtered out
    // clear all: Called when color the whole plot (with encoding or accepted recommendation)
    if (idSet) {
      for (const id of idSet) {
        this.selectedIds.delete(id);
      }
    } else {
      this.selectedIds.clear();
    }
    this.onSelectionChange();
  };

}

export { Selector };