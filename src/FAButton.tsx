import * as React from 'react';

interface FAButtonProps {
  readonly faName: string,
  readonly color?: string,
  readonly colorClass?: string,
  readonly hoverEffect?: boolean,
  readonly onClick?: () => void,
  readonly title?: string,
}

class FAButton extends React.PureComponent<FAButtonProps> {
  render() {
    return (
      <span
        className={this.props.colorClass}
        style={{
          color: this.props.color,
        }}
        onClick={this.props.onClick}
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