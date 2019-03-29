import * as React from 'react';

interface DropdownProps {
  readonly text: string | JSX.Element,
  readonly width?: number,
  readonly offset?: {left: number, top: number},
}

interface DropdownState {
  visible: boolean;
}


class Dropdown extends React.Component<DropdownProps, DropdownState> {
  constructor(props: DropdownProps) {
    super(props);
    this.state = {
      visible: false,
    }
  }

  private show = () =>
    this.setState(()=> ({visible: true}));
  
  private hide = () =>
    this.setState(() => ({visible: false}));

  render() {
    return (
      <div 
        className="dropdown--button m-1 p-1"
        onClick={this.show}
        onMouseLeave={this.hide}
      >
        <div 
          className="dropdown--window p-0"
          style={{
            visibility: this.state.visible ? 'visible' : 'hidden',
            left: this.props.offset && this.props.offset.left,
            top: this.props.offset && this.props.offset.top,
            width: this.props.width,
          }}
        >
          {this.props.children}
        </div>
        <div className="p-1">{this.props.text}</div>
      </div>
    );
  }
}


export { Dropdown };