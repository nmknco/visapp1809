import * as React from 'react';

import {
  HandleHoverDrop,
} from './commons/types';
import { getDropBackgroundColor } from './commons/util';


interface DropProps {
  readonly isDragging: boolean,
  readonly onHoverDrop?: HandleHoverDrop,
}

interface DropState {
  readonly isHovered: boolean, // Drop should know this itself
}

class Drop extends React.Component<DropProps, DropState> {
  // Always rerender because of children

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

  render() {
    return (
      <div
        className="drop"
        style={{backgroundColor: getDropBackgroundColor(
          this.props.isDragging && this.state.isHovered, 
          this.props.isDragging
        )}}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        {this.props.children}
      </div>
    );
  }
}

export { Drop };