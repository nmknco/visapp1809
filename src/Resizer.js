import { Pos, SelUtil } from './util';

class Resizer {
  constructor(chartBgNode, isSelected, onResizing) {
    this.chartBgNode = chartBgNode;
    this.isSelected = isSelected;
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

  handleMouseDown = (e, id) => {
    if (this.isSelected(id)) {
      e.preventDefault();
      this.currentDot = e.target.parentNode;
      this.isResizing = true;
    }
  };

  handleMouseMove = (e) => {
    if (this.isResizing) {
      const cPos = new Pos(
        this.currentDot.getAttribute('data-x'),
        this.currentDot.getAttribute('data-y')
      );
      const r = SelUtil.calcPos(e, this.chartBgNode).distTo(cPos);
      this.onResizing(r);
    }
  };

  _getCursorStyle = (e) => {
    const {x, y} = SelUtil.calcPos(e, this.chartBgNode);
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

  handleMouseUp = (e) => {
    this.isResizing = false;
  };

  handleMouseOver = (e, id) => {
    if (this.isSelected(id)) {
      this.isHovering = true;
      e.target.style.cursor = this._getCursorStyle(e);
    }
  }

  handleMouseOut = (e) => {
    this.isHovering = false;
    e.target.style.cursor = 'pointer';
  }
}

export { Resizer };