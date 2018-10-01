import React, { Component } from 'react';

import { Panel } from './Panel'

class RecommendPanel extends Component {
  
  render() {
    return (
      <Panel 
        className="recommendation_panel"
        heading="Do you want to..."
      >
        {
          this.props.suggestedAttrList.map(suggestedAttr =>
            (<RecommendCard
              key={suggestedAttr}
              suggestedAttr={suggestedAttr}
              onClickAccept={this.props.onClickAccept}
              onHoverRecommendCard={this.props.onHoverRecommendCard}
            />)
          )
        }
      </Panel>
    );
  }
}

class RecommendCard extends Component {
  
  render() {
    return (
      <div 
        className="rec-card card border-light p-1 my-1"
        onMouseEnter={() => {this.props.onHoverRecommendCard(this.props.suggestedAttr, 'mouseenter')}}
        onMouseLeave={() => {this.props.onHoverRecommendCard(this.props.suggestedAttr, 'mouseleave')}}
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
                  onClick={() => {this.props.onClickAccept(this.props.suggestedAttr)}}
                  // disabled={this.props.disabled}
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