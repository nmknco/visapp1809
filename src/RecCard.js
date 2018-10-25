import React, { Component } from 'react';

class RecCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dismissed: false,
    }
  }

  _dismiss = () => {
    this.setState({dismissed: true});
  };
  
  render() {
    return (
      <div 
        className={
          this.state.dismissed ? "d-none" : 
            "rec-card border border-light rounded p-1 my-1"
        }
        onMouseEnter={this.props.onHoverCard}
        onMouseLeave={this.props.onHoverCard}
      >
        <div className="px-2 w-100 text-right">
          <i 
            className="fas fa-check text-success p-1"
            onClick={this.props.onClickAccept}
            title="Accept"
          />
          <i 
            className="fas fa-times text-danger p-1"
            onClick={this._dismiss}
            title="Dismiss"
          />
        </div>
        <div className="d-flex w-100 align-items-center p-1">
          <div className="rec-card__header">{this.props.header}</div>
          <div className="rec-card__content px-2">{this.props.children}</div>
        </div>
      </div>
    );
  }
}

export { RecCard };