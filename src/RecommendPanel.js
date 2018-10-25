import React, { Component } from 'react';

import { Panel } from './Panel';
import { RecCard } from './RecCard';

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
        heading="Recommended Mappings"
      >
        {flattenRecList.length > 0 &&
          <div>
            {/* <div className="p-1">Do you want to:</div> */}
            {
              flattenRecList.map(
                ({ field, attrName }) =>
                  <RecCard
                    key={`${field}_${attrName}`}
                    onClickAccept={
                      () => this.props.onClickAccept(field, attrName)
                    }
                    onHoverCard={
                      ev => this.props.onHoverCard(ev, field, attrName)
                    }
                  >
                    {'Assign '} <strong>{attrName}</strong> {` to ${field}`}
                  </RecCard>
              )
            }
          </div>
        }
      </Panel>
    );
  }
}



export { RecommendPanel }