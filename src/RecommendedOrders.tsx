import * as React from 'react';

import { PanelWithDismiss } from './Panel';
import { RecCard } from './RecCard';

import { 
  HandleAcceptRecCard,
  HandleAcceptRecommendedOrder,
  HandleDismissAllRecommendations, 
  HandleDismissRecCard,
  HandleDismissRecommendedOrder,
  RecommendedOrder,
} from './commons/types';


interface RecommendedOrdersProps {
  readonly recommendedOrders: ReadonlyArray<RecommendedOrder>,
  readonly onAcceptRecommendedOrder: HandleAcceptRecommendedOrder,
  readonly onDismissRecommendedOrder: HandleDismissRecommendedOrder,
  readonly onDismissAllRecommendedOrders?: HandleDismissAllRecommendations,
}

class RecommendedOrders extends React.PureComponent<RecommendedOrdersProps> {
  


  render() {
    console.log('Recommended orders render')
    const {
      recommendedOrders,
      onAcceptRecommendedOrder,
      onDismissRecommendedOrder,
    } = this.props;

    return (
      <PanelWithDismiss 
        className="recommended-orders-panel"
        heading="Recommended Orders"
        onClickDismissAll={this.props.onDismissAllRecommendedOrders}
      >
        {recommendedOrders.map(
          ({ attrName, asce }) =>
            <RecommendedOrdersCard
              key={`${attrName}-${asce ? 'ascending' : 'descending'}`}
              {...{ attrName, asce,
                onAcceptRecommendedOrder,
                onDismissRecommendedOrder,
              }}
            />
        )}
      </PanelWithDismiss>
    );
  }
}

interface RecommendedOrdersCardProps {
  readonly attrName: string,
  readonly asce: boolean,
  readonly onAcceptRecommendedOrder: HandleAcceptRecommendedOrder,
  readonly onDismissRecommendedOrder: HandleDismissRecommendedOrder,
}

class RecommendedOrdersCard extends React.PureComponent<RecommendedOrdersCardProps> {
  
  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedOrder(this.props.attrName, this.props.asce);
  
  private handleDismissCard: HandleDismissRecCard =
    () => this.props.onDismissRecommendedOrder(this.props.attrName, this.props.asce);

  render() {
    console.log('Recommended encoding cards render')
    const { attrName, asce } = this.props;
    return (
      <RecCard
        key={`${attrName}-${asce ? 'ascending' : 'descending'}`}
        onAcceptCard={this.handleAcceptCard}
        onDismissCard={this.handleDismissCard}
      >
        {'Order bars by'} <strong> {`${attrName} (${asce ? 'ascending' : 'descending'})`} </strong>
      </RecCard>
    );
  }
}


export { RecommendedOrders }