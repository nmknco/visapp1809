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
            "rec-card d-flex border border-light rounded align-items-center p-1 my-1"
        }
        onMouseEnter={this.props.onHoverCard}
        onMouseLeave={this.props.onHoverCard}
      >
        <div className="d-flex w-100 justify-content-between align-items-center p-2 text-center">
          <div className="rec-card__header">{this.props.header}</div>
          <div className="rec-card__content px-2">{this.props.children}</div>
          <div className="px-2 text-center">
            <div>
              <i 
                className="fas fa-check text-success py-1"
                onClick={this.props.onClickAccept}
                title="Accept"
              />
            </div>
            <div>
              <i 
                className="fas fa-times text-danger py-1"
                onClick={this._dismiss}
                title="Dismiss"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export { RecCard };