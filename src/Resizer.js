import { Pos, SelUtil } from './commons/util';
import { MAX_DOT_SIZE_RANGE } from './commons/constants';

class Resizer {
  constructor(chartBoxNode, onResizing, onResizingFinish) {
    this.chartBoxNode = chartBoxNode;
    this.onResizing = onResizing;
    this.onResizingFinish = onResizingFinish;

    this.isResizing = false;
    this.isHovering = false;
    this.currentDot = null;

    this.cbClone = null;

    this.r = null; // current size

    this.init();
  }

  getIsHovering = () => this.isHovering;

  init = () => {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseDown = (e) => {
    e.preventDefault();
    this.currentDot = e.target.parentNode;
    this.isResizing = true;

    this.cbClone = this.chartBoxNode.cloneNode(false);
    this.cbClone.id = 'cb-clone';
    this.chartBoxNode.parentNode.appendChild(this.cbClone);
  };

  handleMouseMove = (e) => {
    if (this.isResizing) {
      const cPos = new Pos(
        this.currentDot.getAttribute('data-x'),
        this.currentDot.getAttribute('data-y')
      );
      let r = SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode).distTo(cPos);
      r = Math.max(MAX_DOT_SIZE_RANGE[0], Math.min(MAX_DOT_SIZE_RANGE[1], r));
      this.r = r;
      this.onResizing(r);

      this.cbClone.style.cursor = this._getCursorStyle(e, this.currentDot);
    }
  };

  handleMouseUp = (e) => {
    if (this.isResizing && this.r) {
      this.onResizingFinish(this.r);
    
      this.r = null;
      this.isResizing = false;
      this.currentDot = null;
      this.cbClone.remove();
      this.cbClone = null;
    }
  };

  handleMouseEnter = (e) => {
    this.isHovering = true;
    e.target.style.cursor = this._getCursorStyle(e, e.target.parentNode);
  }

  handleMouseLeave = (e) => {
    this.isHovering = false;
    e.target.style.cursor = 'pointer';
  }

  _getCursorStyle = (e, dotG) => {
    const {x, y} = SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode);
    const dx = x - dotG.getAttribute('data-x');
    const dy = y - dotG.getAttribute('data-y');
    const a = Math.abs(Math.atan(dy / dx));
    if (a < Math.PI / 8) {
      return 'ew-resize';
    } else if (a > Math.PI * 3/8) {
      return 'ns-resize';
    } else {
      return dx * dy < 0 ? 'nesw-resize' : 'nwse-resize';
    }
  }
}

export { Resizer };