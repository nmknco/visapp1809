import { HandleResize } from './commons/types';
import {
  SelUtil,
} from './commons/util';

class BarResizer {
  private readonly chartBoxNode: SVGRectElement;
  private readonly onResizeX: HandleResize;
  private readonly onResizeXFinish: () => void;
  // private readonly onResizingY: HandleResize;

  private isResizingX: boolean;
  // private isResizingY: boolean;
  private isHovering: boolean;
  private currentBar: SVGGElement | null;

  constructor(
    chartBoxNode: SVGRectElement,
    onResizeX: HandleResize,
    onResizeY: HandleResize,
    onResizeXFinish: () => void,
  ){
    this.chartBoxNode = chartBoxNode;
    this.onResizeX = onResizeX;
    // this.onResizingY = onResizingY;
    this.onResizeXFinish = onResizeXFinish;

    this.isResizingX = false;
    this.isHovering = false;
    this.currentBar = null;

    this.init();
  }

  getIsHovering = () => this.isHovering;

  init = () => {
    document.addEventListener('mousemove', this.handleMouseMoveX);
    document.addEventListener('mouseup', this.handleMouseUpX);
  }

  handleMouseDownX = (e: MouseEvent) => {
    e.preventDefault();
    if (!e.target) {
      return;
    }
    this.currentBar = (e.target as SVGElement).parentNode as SVGGElement;
    this.isResizingX = true;
  };

  handleMouseMoveX = (e: MouseEvent) => {
    if (this.isResizingX && this.currentBar) {
      const cx = Number(this.currentBar.dataset.cx);
      const sz = 2 * Math.abs(SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode).x - cx);
      this.onResizeX(sz);
    }
  };

  handleMouseUpX = () => {
    this.isResizingX = false;
    this.onResizeXFinish();
  };

  handleMouseEnter = (e: MouseEvent) => {
    if (!e.target) {
      return;
    }
    this.isHovering = true;
    (e.target as SVGElement).style.cursor = 'ew-resize';
  }

  handleMouseLeave = (e: MouseEvent) => {
    this.isHovering = false;
    (e.target as SVGElement).style.cursor = 'pointer';
  }

}

export { BarResizer };