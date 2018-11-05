import * as React from 'react';

import { PanelWithDismiss } from './Panel';
import { RecCard } from './RecCard';

import {
  HandleAcceptRecCard,
  HandleAcceptRecommendedFilter,
  HandleDismissAllRecommendations,
  HandleDismissRecCard,
  HandleDismissRecommendedFilter,
  HandleHoverRecCard,
  HandleHoverRecommendedFilter,
} from './commons/types';
import { RecommendedFilter } from './Filter';


interface RecommendedFiltersProps {
  readonly recommendedFilters: ReadonlyArray<RecommendedFilter>
  readonly onAcceptRecommendedFilter: HandleAcceptRecommendedFilter,
  readonly onDismissRecommendedFilter: HandleDismissRecommendedFilter,
  readonly onHoverRecommendedFilter?: HandleHoverRecommendedFilter,
  readonly onDismissAllRecommendedFilter?: HandleDismissAllRecommendations,
}

class RecommendedFilters extends React.PureComponent<RecommendedFiltersProps & React.HTMLAttributes<HTMLDivElement>> {

  private renderCards = () => {
    const {
      recommendedFilters,
      onAcceptRecommendedFilter,
      onDismissRecommendedFilter,
      onHoverRecommendedFilter,
    } = this.props
    return recommendedFilters.map((rFilter: RecommendedFilter) => (
        <FilterRecCard
          key={rFilter.key}
          { ...{
            rFilter,
            onAcceptRecommendedFilter,
            onDismissRecommendedFilter,
            onHoverRecommendedFilter,
          }}
        />
      )
    );
  }

  render() {
    return (
      <PanelWithDismiss
        className="recommended-filters-panel"
        heading="Recommended Filters"
        onClickDismissAll={this.props.onDismissAllRecommendedFilter}
      >
        {this.props.recommendedFilters.length > 0 &&
          (<div>{this.renderCards()}</div>)
        }
      </PanelWithDismiss>
    )
  }
}


interface FilterRecCardProps {
  readonly rFilter: RecommendedFilter,
  readonly onAcceptRecommendedFilter: HandleAcceptRecommendedFilter,
  readonly onDismissRecommendedFilter: HandleDismissRecommendedFilter,
  readonly onHoverRecommendedFilter?: HandleHoverRecommendedFilter,
}

class FilterRecCard extends React.PureComponent<FilterRecCardProps> {

  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedFilter(this.props.rFilter.filter);

  private handleDismissCard: HandleDismissRecCard =
    () => this.props.onDismissRecommendedFilter(this.props.rFilter.key)

  private handleHoverCard: HandleHoverRecCard = (ev) => {
    if (!this.props.onHoverRecommendedFilter) {
      return;
    }
    return this.props.onHoverRecommendedFilter(ev, this.props.rFilter.filter);
  }

  render() {
    return (
      <RecCard 
        onAcceptCard={this.handleAcceptCard}
        onDismissCard={this.handleDismissCard}
        onHoverCard={this.handleHoverCard}
      >
        {this.props.rFilter.getTextDescription()}
      </RecCard>
    );
  }
}

export { RecommendedFilters };