import * as React from 'react';

import { PanelWithDismiss } from './Panel';
import { RecCard } from './RecCard';

import { 
  HandleAcceptRecCard,
  HandleAcceptRecommendedEncoding,
  HandleDismissAllRecommendations, 
  HandleDismissRecCard,
  HandleDismissRecommendedEncoding,
  HandleHoverRecCard,
  HandleHoverRecommendedEncoding,
  RecommendedEncoding,
  VField,
} from './commons/types';


interface RecommendedEncodingsProps {
  readonly recommendedEncodings: ReadonlyArray<RecommendedEncoding>,
  readonly onAcceptRecommendedEncoding: HandleAcceptRecommendedEncoding,
  readonly onDismissRecommendedEncoding: HandleDismissRecommendedEncoding,
  readonly onHoverRecommendedEncoding?: HandleHoverRecommendedEncoding,
  readonly onDismissAllRecommendedEncodings?: HandleDismissAllRecommendations,
}

class RecommendedEncodings extends React.PureComponent<RecommendedEncodingsProps> {
  


  render() {
    console.log('Recommended encodings render')
    const {
      recommendedEncodings,
      onAcceptRecommendedEncoding,
      onDismissRecommendedEncoding,
      onHoverRecommendedEncoding } = this.props;
    return (
      <PanelWithDismiss 
        className="recommended-encodings-panel"
        heading="Recommended Encodings"
        onClickDismissAll={this.props.onDismissAllRecommendedEncodings}
      >
        {recommendedEncodings.map(
          ({ field, attrName }) =>
            <RecommendedEncodingsCard
              key={`${field}-${attrName}`}
              {...{ field, attrName,
                onAcceptRecommendedEncoding,
                onDismissRecommendedEncoding,
                onHoverRecommendedEncoding,
              }}
            />
        )}
      </PanelWithDismiss>
    );
  }
}

interface RecommendedEncodingsCardProps {
  readonly field: VField,
  readonly attrName: string,
  readonly onAcceptRecommendedEncoding: HandleAcceptRecommendedEncoding,
  readonly onDismissRecommendedEncoding: HandleDismissRecommendedEncoding,
  readonly onHoverRecommendedEncoding?: HandleHoverRecommendedEncoding,
}

class RecommendedEncodingsCard extends React.PureComponent<RecommendedEncodingsCardProps> {
  
  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedEncoding(this.props.field, this.props.attrName);
  
  private handleDismissCard: HandleDismissRecCard =
    () => this.props.onDismissRecommendedEncoding(this.props.field, this.props.attrName);
  
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
        onDismissCard={this.handleDismissCard}
        onHoverCard={this.handleHoverCard}
      >
        {'Assign '} <strong>{attrName}</strong> {` to ${field}`}
      </RecCard>
    );
  }
}


export { RecommendedEncodings }