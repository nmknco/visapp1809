import * as React from 'react';

import { PanelWithDismiss } from './Panel';
import { RecCard } from './RecCard';

import { 
  HandleAcceptRecCard,
  HandleAcceptRecommendedOrder,
  HandleDismissAllRecommendations, 
  HandleDismissRecCard,
  HandleDismissRecommendedOrder,
  Order,
} from './commons/types';


interface RecommendedOrdersProps {
  readonly recommendedOrders: ReadonlyArray<Order>,
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
          (order) =>
            <RecommendedOrdersCard
              key={`${order.attrName}-${order.asce ? 'ascending' : 'descending'}`}
              {...{
                order,
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
  readonly order: Order,
  readonly onAcceptRecommendedOrder: HandleAcceptRecommendedOrder,
  readonly onDismissRecommendedOrder: HandleDismissRecommendedOrder,
}

class RecommendedOrdersCard extends React.PureComponent<RecommendedOrdersCardProps> {
  
  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedOrder(this.props.order);
  
  private handleDismissCard: HandleDismissRecCard =
    () => this.props.onDismissRecommendedOrder(this.props.order);

  render() {
    console.log('Recommended encoding cards render')
    const { attrName, asce } = this.props.order;
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