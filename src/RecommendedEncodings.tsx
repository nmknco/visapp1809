import * as React from 'react';

import { Panel } from './Panel';
import { RecCard } from './RecCard';

import { 
  HandleAcceptRecCard,
  HandleAcceptRecommendedEncoding,
  HandleDismissAllRecommendations, 
  HandleHoverRecCard,
  HandleHoverRecommendedEncoding,
  RecommendedAttrListsByField,
  VField,
} from './commons/types';


interface RecommendedEncodingsProps {
  readonly recommendedAttrListsByField: Readonly<RecommendedAttrListsByField>,
  readonly onAcceptRecommendedEncoding: HandleAcceptRecommendedEncoding,
  readonly onHoverRecommendedEncoding: HandleHoverRecommendedEncoding,
  readonly onDismissAllRecommendedEncodings: HandleDismissAllRecommendations,
}

class RecommendedEncodings extends React.PureComponent<RecommendedEncodingsProps> {
  
  private flatten = (recommendedAttrListsByField: RecommendedAttrListsByField): ReadonlyArray<{field: VField, attrName: string}> => {
    const flat = [];
    for (const [field, list] of Object.entries(recommendedAttrListsByField)) {
      for (const attrName of list) {
        flat.push({field: field as VField, attrName: attrName as string});
      }
    }
    return flat;
  };

  render() {
    console.log('Recommended encodings render')
    const { recommendedAttrListsByField, onAcceptRecommendedEncoding, onHoverRecommendedEncoding } = this.props;
    const flattenRecList = this.flatten(recommendedAttrListsByField);
    return (
      <Panel 
        className="recommended-encodings-panel"
        heading="Recommended Encoding"
      >
        {flattenRecList.length > 0 &&
          <div>
            {/* <div className="p-1">Do you want to:</div> */}
            {
              flattenRecList.map(
                ({ field, attrName }) =>
                  <RecommendedEncodingsCard
                    key={`${field}-${attrName}`}
                    {...{ field, attrName,
                      onAcceptRecommendedEncoding,
                      onHoverRecommendedEncoding,
                    }}
                  />
              )
            }
          </div>
        }
      </Panel>
    );
  }
}

interface RecommendedEncodingsCardProps {
  readonly field: VField,
  readonly attrName: string,
  readonly onAcceptRecommendedEncoding: HandleAcceptRecommendedEncoding,
  readonly onHoverRecommendedEncoding?: HandleHoverRecommendedEncoding,
}

class RecommendedEncodingsCard extends React.PureComponent<RecommendedEncodingsCardProps> {
  
  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedEncoding(this.props.field, this.props.attrName);
  private handleHoverCard: HandleHoverRecCard = (ev) => {
    if (!this.props.onHoverRecommendedEncoding) {
      return;
    }
    return this.props.onHoverRecommendedEncoding(ev, this.props.field, this.props.attrName);
  }

  render() {
    console.log('Recommended encoding cards render')
    const { field, attrName } = this.props;
    return (
      <RecCard
        key={`${field}-${attrName}`}
        onAcceptCard={this.handleAcceptCard}
        onHoverCard={this.handleHoverCard}
      >
        {'Assign '} <strong>{attrName}</strong> {` to ${field}`}
      </RecCard>
    );
  }
}


export { RecommendedEncodings }