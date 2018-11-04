import * as React from 'react';

import {
  HandleAcceptRecCard,
  HandleDismissRecCard,
  HandleHoverRecCard,
} from './commons/types';

interface RecCardProps {
  readonly onAcceptCard: HandleAcceptRecCard,
  readonly onDismissCard: HandleDismissRecCard,
  readonly onHoverCard?: HandleHoverRecCard,
  readonly header?: Readonly<JSX.Element>, // used to show minimap in filter cards
}


class RecCard extends React.PureComponent<RecCardProps> {
  constructor(props: RecCardProps) {
    super(props);
  }
  
  render() {
    console.log('Rec cards render');
    return (
      <div 
        className="rec-card border border-light rounded p-1 my-1"
        onMouseEnter={this.props.onHoverCard}
        onMouseLeave={this.props.onHoverCard}
      >
        <div className="px-1 w-100 text-right">
          <i 
            className="fas fa-check text-success p-1"
            onClick={this.props.onAcceptCard}
            title="Accept"
          />
          <i 
            className="fas fa-times text-danger p-1"
            onClick={this.props.onDismissCard}
            title="Dismiss"
          />
        </div>
        <div className="d-flex w-100 align-items-center p-1">
          <div className="rec-card__header">{this.props.header}</div>
          <div className="rec-card__content px-2">{this.props.children}</div>
        </div>
      </div>
    );
  }
}

export { RecCard };