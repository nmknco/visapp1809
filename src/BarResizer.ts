import {
  HandleResize,
  HandleResizeFinish,
  ResizingDirection,
} from './commons/types';
import {
  SelUtil,
} from './commons/util';

class BarResizer {
  private readonly chartBoxNode: SVGRectElement;
  private readonly onResizeX: HandleResize;
  private readonly onResizeY: HandleResize;
  private readonly onResizeXFinish: HandleResizeFinish;
  private readonly onResizeYFinish: HandleResizeFinish;

  private isResizing: ResizingDirection | null;
  private isHovering: boolean;
  private currentBar: SVGGElement | null;
  private currentValue: number | null;

  constructor(
    chartBoxNode: SVGRectElement,
    onResizeX: HandleResize,
    onResizeY: HandleResize,
    onResizeXFinish: HandleResizeFinish,
    onResizeYFinish: HandleResizeFinish,
  ){
    this.chartBoxNode = chartBoxNode;
    this.onResizeX = onResizeX;
    this.onResizeY = onResizeY;
    this.onResizeXFinish = onResizeXFinish;
    this.onResizeYFinish = onResizeYFinish;

    this.isResizing = null;
    this.isHovering = false;
    this.currentBar = null;

    this.currentValue = null; // size or height

    this.init();
  }

  getIsHovering = () => this.isHovering;

  init = () => {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseDown = (e: MouseEvent, resizingDirection: ResizingDirection) => {
    e.preventDefault();
    this.currentBar = (e.target as SVGElement).parentNode!.parentNode as SVGGElement;
    this.isResizing = resizingDirection;
    this.createCursorLayer(resizingDirection);
  };

  handleMouseDownX = (e: MouseEvent) => this.handleMouseDown(e, ResizingDirection.X);

  handleMouseDownY = (e: MouseEvent) => this.handleMouseDown(e, ResizingDirection.Y);

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.currentBar || !this.isResizing) {
      return;
    }
    if (this.isResizing === ResizingDirection.X) {
      const cx = Number(this.currentBar.dataset.cx);
      const sz = 2 * Math.abs(SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode).x - cx);
      this.currentValue = sz;
      this.onResizeX(sz);
    } else if (this.isResizing === ResizingDirection.Y) {
      const plotH = Number(this.chartBoxNode.getAttribute('height'));
      const h = plotH - SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode).y;
      this.currentValue = h;
      this.onResizeY(h);
    }
  };

  private handleMouseUp = () => {
    if (this.isResizing && this.currentValue) {
      this.removeCursorLayer();
      if (this.isResizing === ResizingDirection.X) {
        this.onResizeXFinish(this.currentValue);
      } else if (this.isResizing === ResizingDirection.Y) {
        this.onResizeYFinish(this.currentValue);
      }
      this.isResizing = null;
      this.currentValue = null;
    }
  };

  private handleMouseEnter = (e: MouseEvent, resizingDirection: ResizingDirection) => {
    this.isHovering = true;
    (e.target as SVGElement).style.cursor = 
      resizingDirection === ResizingDirection.X ? 'ew-resize' : 'ns-resize';
  };

  handleMouseEnterX = (e: MouseEvent) => this.handleMouseEnter(e, ResizingDirection.X);

  handleMouseEnterY = (e: MouseEvent) => this.handleMouseEnter(e, ResizingDirection.Y);

  handleMouseLeave = (e: MouseEvent) => {
    this.isHovering = false;
    (e.target as SVGElement).style.cursor = 'pointer';
  };

  private createCursorLayer = (resizingDirection: ResizingDirection) => {
    // create a layer over the plot
    //  so that the resize cursor is shown when resizing regardless of wheather mouse is over
    //  the border handles
    const cbClone = this.chartBoxNode.cloneNode(false) as SVGElement;
    cbClone.id = 'cb-clone';
    cbClone.style.cursor = resizingDirection === ResizingDirection.X ? 'ew-resize' : 'ns-resize';
    this.chartBoxNode.parentNode!.appendChild(cbClone);
  };

  private removeCursorLayer = () => {
    document.querySelector('#cb-clone')!.remove();
  }

}

export { BarResizer };