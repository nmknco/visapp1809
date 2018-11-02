import * as React from 'react';

import { RecCard } from './RecCard';
import { RecommendedPanel } from './RecommendedPanel';

import {
  HandleAcceptRecCard,
  HandleAcceptRecommendedFilter,
  HandleHoverRecCard,
  HandleHoverRecommendedFilter,
} from './commons/types';
import { RecommendedFilter } from './Filter';


interface RecommendedFiltersProps {
  readonly recommendedFilters: ReadonlyArray<RecommendedFilter>
  readonly onAcceptRecommendedFilter: HandleAcceptRecommendedFilter,
  readonly onHoverRecommendedFilter?: HandleHoverRecommendedFilter,
  readonly onDismissAllRecommendedFilter?: () => void,
}

class RecommendedFilters extends React.PureComponent<RecommendedFiltersProps & React.HTMLAttributes<HTMLDivElement>> {

  private renderCards = () => {
    const { recommendedFilters, onAcceptRecommendedFilter, onHoverRecommendedFilter } = this.props
    return recommendedFilters.map((rFilter: RecommendedFilter) => (
        <FilterRecCard
          key={rFilter.key}
          { ...{
            rFilter,
            onAcceptRecommendedFilter,
            onHoverRecommendedFilter
          }}
        />
      )
    );
  }

  render() {
    return (
      <RecommendedPanel
        className="recommended-filters-panel"
        heading="Recommended Filters"
        onClickDismissAll={this.props.onDismissAllRecommendedFilter}
      >
        {this.props.recommendedFilters.length > 0 &&
          (<div>{this.renderCards()}</div>)
        }
      </RecommendedPanel>
    )
  }
}


interface FilterRecCardProps {
  readonly rFilter: RecommendedFilter,
  readonly onAcceptRecommendedFilter: HandleAcceptRecommendedFilter,
  readonly onHoverRecommendedFilter?: HandleHoverRecommendedFilter,
}

class FilterRecCard extends React.PureComponent<FilterRecCardProps> {

  private handleAcceptCard: HandleAcceptRecCard =
    () => this.props.onAcceptRecommendedFilter(this.props.rFilter.filter);

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
        onHoverCard={this.handleHoverCard}
      >
        {this.props.rFilter.getTextDescription()}
      </RecCard>
    );
  }
}

export { RecommendedFilters };