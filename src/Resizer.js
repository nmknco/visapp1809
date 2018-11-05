import { Pos, SelUtil } from './util';

class Resizer {
  constructor(chartBoxNode, onResizing) {
    this.chartBoxNode = chartBoxNode;
    this.onResizing = onResizing;

    this.isResizing = false;
    this.isHovering = false;
    this.currentDot = null;

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
  };

  handleMouseMove = (e) => {
    if (this.isResizing) {
      const cPos = new Pos(
        this.currentDot.getAttribute('data-x'),
        this.currentDot.getAttribute('data-y')
      );
      const r = SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode).distTo(cPos);
      this.onResizing(r);
    }
  };

  handleMouseUp = (e) => {
    this.isResizing = false;
  };

  handleMouseEnter = (e) => {
    this.isHovering = true;
    e.target.style.cursor = this._getCursorStyle(e);
  }

  handleMouseLeave = (e) => {
    this.isHovering = false;
    e.target.style.cursor = 'pointer';
  }

  _getCursorStyle = (e) => {
    const {x, y} = SelUtil.getEventPosRelativeToBoxClipped(e, this.chartBoxNode);
    const g = e.target.parentNode;
    const dx = x - g.getAttribute('data-x');
    const dy = y - g.getAttribute('data-y');
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