import * as React from 'react';
import {
  HandleHoverDrop,
} from './commons/types';

interface DropProps {
  readonly isDragging: boolean,
  readonly onHoverDrop?: HandleHoverDrop,
}

interface DropState {
  readonly isHovered: boolean, // Drop should know this itself
}

class Drop extends React.PureComponent<DropProps, DropState> {
  constructor(props: DropProps) {
    super(props);
    this.state = {
      isHovered: false,
    }
  }

  private handleMouseEnter = (ev: React.MouseEvent<Element>) => {
    this.setState(() => ({ isHovered: true }));
    if (this.props.onHoverDrop) {
      this.props.onHoverDrop(ev);
    }
  };

  private handleMouseLeave = (ev: React.MouseEvent<Element>) => {
    this.setState(() => ({ isHovered: false }));
    if (this.props.onHoverDrop) {
      this.props.onHoverDrop(ev);
    }
  };

  private getClassName = () => {
    const base = 'drop';
    let mod = '';
    if (this.props.isDragging) {
      mod = this.state.isHovered ? '--is-over' : '--can-drop'
    }
    return mod ? `${base} ${base+mod}` : base;
  };

  render() {
    return (
      <div 
        className={this.getClassName()}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        {this.props.children}
      </div>
    );
  }
}

export { Drop };