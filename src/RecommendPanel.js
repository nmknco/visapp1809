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
    const flattenRecList = this.flatten(this.props.suggestedAttrListsByField);
    return (
      <Panel 
        className="recommendations-panel"
        heading="Recommendations"
      >
        {flattenRecList.length > 0 &&
          <div>
            <div className="p-1">Do you want to:</div>
            {
              flattenRecList.map(
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
          </div>
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
                  className="btn btn-sm btn-success px-3"
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