import React, { Component } from 'react';

class RecommendPanel extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="recommendation_panel card border-light m-1" style={{width: 240}}>
        <div className="card-header"> Do you want to... </div>
        <div className="card-body p-1">
          <RecommendCard {...this.props} />
        </div>
      </div>
    );
  }
}

class RecommendCard extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div 
        className="card border-light p-1"
        onMouseEnter={() => {this.props.onHoverRecommendCard('mouseenter')}}
        onMouseLeave={() => {this.props.onHoverRecommendCard('mouseleave')}}
      >
        <div className="card-body text-center">
          {
            this.props.suggestedAttr
          &&
            (<div>
              <p>{`Assign ${this.props.suggestedAttr} to color?`} </p>
              <button 
                  type="button"
                  className='btn btn-sm btn-success'
                  onClick={this.props.onClickAccept}
                  disabled={this.props.disabled}
                >
                  Accept
              </button>
            </div>)
          }
        </div>
      </div>
    );
  }
}

export { RecommendPanel }