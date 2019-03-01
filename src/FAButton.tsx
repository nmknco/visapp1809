import * as React from 'react';

interface FAButtonProps {
  readonly faName: string,
  readonly color?: string,
  readonly colorClass?: string,
  readonly size?: number,
  readonly onClick?: () => void,
  readonly onHover?: (ev: React.MouseEvent<Element>) => void,
  readonly hoverEffect?: boolean,
  readonly title?: string,
}

class FAButton extends React.PureComponent<FAButtonProps> {
  render() {
    return (
      <span
        className={this.props.colorClass}
        style={{
          color: this.props.color,
          fontSize: this.props.size,
        }}
        onClick={this.props.onClick}
        onMouseEnter={this.props.onHover}
        onMouseLeave={this.props.onHover}
        title={this.props.title}
      >
        <i 
          className={`fas fa-${this.props.faName} p-1
            ${this.props.hoverEffect?' fas--hover-effect':''}`} 
        />
      </span>
    );
  }
}

export { FAButton }