import * as d3 from 'd3';

import {
  DataEntry,
  HandlePendingSelectionChange,
  HandleSelectionChange,
  NestedDataEntry,
} from './commons/types';
import { Pos, Rect, SelUtil } from './commons/util';


//////////////////////////////////////
// TODO: Clear Event Listeners


abstract class Selector {
  private chartBoxNode: SVGRectElement;

  // The next two fields are also used as isSelecting check
  private selNode: SVGRectElement | null; // the <rect> selection window
  private origin: Pos | null;

  protected selectedIds: Set<string>;
  protected pendingIds: Set<string>;
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

  setChartBoxNode = (chartBoxNode: SVGRectElement) => {
    this.chartBoxNode = chartBoxNode;
  }

  getSelectedIds = (): ReadonlySet<string> => new Set(this.selectedIds);
  getPendingIds = (): ReadonlySet<string> => new Set(this.pendingIds);

  hasSelection = (): boolean => this.selectedIds.size > 0;

  getIsSelected = (id: string): boolean => this.selectedIds.has(id);
  
  getIsSelectedOrPending = (id: string): boolean => 
    this.selectedIds.has(id) || this.pendingIds.has(id);

  
  protected abstract onMouseMove: (currentRect: Rect) => void;

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

        this.pendingIds.clear();
        if (!(e.ctrlKey || e.metaKey)) {
          this.selectedIds.clear();
        }


        this.onMouseMove(currentRect);
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
  selectOnlyOne = (id: string) => {
    this.selectedIds.clear();
    this.pendingIds.clear();
    this.selectedIds.add(id);
    this.onSelectionChange();
  };

  selectToggle = (id: string) => {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.onSelectionChange();
  };

  unselectOne = (id: string) => {
    this.selectedIds.delete(id);
    this.onSelectionChange();
  };

  selectByIds = (idSet: ReadonlySet<string>) => {
    this.selectedIds = new Set(idSet);
    this.onSelectionChange();
  };

  clearSelection = (idSet?: ReadonlySet<string>) => {
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


class DotSelector extends Selector {

  protected onMouseMove = (currentRect: Rect) => {
    const { pendingIds } = this;
    d3.select('#plot')
      .selectAll('.dot:not(.hidden)') // prevent selecting filtered-out points
      .each(function(d: DataEntry) {
      // Not using arrow func to void `this` binding
      // d3 convention is that the node itself is `this`
        if(this) {
          const el = this as Element;
          const x = el.getAttribute('data-x');
          const y = el.getAttribute('data-y');
          if (x && y && currentRect.containsCoor(+x, +y)) { 
            pendingIds.add(d.__id_extra__); 
          }
        }
      });
  }
}


class BarSelector extends Selector {

  protected onMouseMove = (currentRect: Rect) => {
    const { pendingIds } = this;
    d3.select('#plot')
      .selectAll('.bar')
      .each(function(d: NestedDataEntry) {
        if (this) {
          const el = this as Element;
          const x = el.getAttribute('x');
          const y = el.getAttribute('y');
          const w = el.getAttribute('width');
          const h = el.getAttribute('height');
          if (x && y && w && h) {
            if (currentRect.containsCoor(+x + +w/2, +y + +h/2)) {
              pendingIds.add(d.key);
            }
          }
        }
      });
  }
}

export { BarSelector, DotSelector };