import React, { Component } from 'react';

import { Panel } from './Panel'

class RecommendPanel extends Component {
  
  flatten = (suggestedAttrListsByField) => {
    const flat = [];
    for (let [field, list] of Object.entries(suggestedAttrListsByField)) {
      for (let attrName of list) {
        flat.push({field, attrName});
      }
    }
    return flat;
  };

  render() {
    return (
      <Panel 
        className="recommendation_panel"
        heading="Do you want to..."
      >
        {
          this.flatten(this.props.suggestedAttrListsByField).map(
            ({ field, attrName }) =>
              (<RecommendCard
                key={`${field}_${attrName}`}
                field={field}
                attrName={attrName}
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
    const {attrName, field, onHoverRecommendCard, onClickAccept} = this.props
    return (
      <div 
        className="rec-card card border-light p-1 my-1"
        onMouseEnter={() => {onHoverRecommendCard(field, attrName, 'mouseenter')}}
        onMouseLeave={() => {onHoverRecommendCard(field, attrName, 'mouseleave')}}
      >
        <div className="card-body text-center">
          {
            attrName
          &&
            (<div>
              <p>{`Assign ${attrName} to ${field}?`} </p>
              <button 
                  type="button"
                  className='btn btn-sm btn-success'
                  onClick={() => {onClickAccept(field, attrName)}}
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