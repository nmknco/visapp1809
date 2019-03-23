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
  protected chartBoxNode: SVGRectElement;

  // The next two fields are also used as isSelecting check
  protected selNode: SVGRectElement | null; // the <rect> selection window
  protected origin: Pos | null;

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

  protected abstract computeCurrentRect: (origin: Pos, e: MouseEvent) => Rect;

  private addDragListeners = () => {
    this.chartBoxNode.addEventListener('mousedown', (ev: MouseEvent) => {
      ev.preventDefault();
      this.origin = SelUtil.getEventPosRelativeToBox(ev, this.chartBoxNode);

      this.selNode = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      this.selNode.classList.add('selection-shade');
      Rect.updateNodeByRect(this.selNode, new Rect(this.origin, this.origin));
      const chartNode = this.chartBoxNode.parentNode!;
      chartNode.append(this.selNode);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.selNode && this.origin) {
        const currentRect = this.computeCurrentRect(this.origin, e);
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
        this.origin = null;
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
  protected computeCurrentRect = (origin: Pos, e: MouseEvent) => {
    return new Rect(
      origin, 
      SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode)
    );
  }

  protected onMouseMove = (currentRect: Rect) => {
    d3.select('#plot')
      .selectAll('.dot:not(.hidden)') // prevent selecting filtered-out points
      .each((d: DataEntry, i, nodes) => {
        const el = nodes[i] as Element;
        const x = el.getAttribute('data-x');
        const y = el.getAttribute('data-y');
        if (x && y && currentRect.containsCoor(+x, +y)) { 
          this.pendingIds.add(d.__id_extra__); 
        }
      });
  }
}


class BarSelector extends Selector {
  protected computeCurrentRect = (origin: Pos, e: MouseEvent) => {
    const Rect2D = new Rect(
      origin, 
      SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode)
    );
    const h = this.chartBoxNode.getAttribute('height');
    return new Rect(new Pos(Rect2D.l, 0), new Pos(Rect2D.r, +h!));
  }

  protected onMouseMove = (currentRect: Rect) => {
    d3.select('#plot')
      .selectAll('.bar-section')
      .each((d: NestedDataEntry, i, nodes) => {
        const el = nodes[i] as HTMLElement;
        const cx = el.dataset.cx;
        if (cx !== undefined && currentRect.containsCoor(+cx, 0)) {
          this.pendingIds.add(d.key);
        }
      });
  }
}


export { BarSelector, DotSelector };