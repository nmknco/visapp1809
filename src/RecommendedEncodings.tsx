import * as React from 'react';

import { Panel } from './Panel';
import { RecCard } from './RecCard';

import { 
  HandleAcceptEncoding,
  HandleHoverEncodingCard,
  SuggestedAttrListsByField,
  VField 
} from './commons/types';


interface RecommendedEncodingsProps {
  readonly suggestedAttrListsByField: SuggestedAttrListsByField,
  readonly onClickAccept: HandleAcceptEncoding,
  readonly onHoverCard: HandleHoverEncodingCard,
}

class RecommendedEncodings extends React.PureComponent<RecommendedEncodingsProps> {
  
  private flatten = (suggestedAttrListsByField: SuggestedAttrListsByField): Readonly<Array<{field: VField, attrName: string}>> => {
    const flat = [];
    for (const [field, list] of Object.entries(suggestedAttrListsByField)) {
      for (const attrName of list) {
        flat.push({field: field as VField, attrName: attrName as string});
      }
    }
    return flat;
  };

  render() {
    console.log('Recommended encodings render')
    const { suggestedAttrListsByField, onClickAccept, onHoverCard } = this.props;
    const flattenRecList = this.flatten(suggestedAttrListsByField);
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
                    {...{ field, attrName, onClickAccept, onHoverCard }}
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
  readonly onClickAccept: HandleAcceptEncoding,
  readonly onHoverCard: HandleHoverEncodingCard,
}

class RecommendedEncodingsCard extends React.PureComponent<RecommendedEncodingsCardProps> {
  
  private handleClickAccept =
    () => this.props.onClickAccept(this.props.field, this.props.attrName)
  private handleHoverCard =
    (ev: MouseEvent) => this.props.onHoverCard(ev, this.props.field, this.props.attrName)

  render() {
    console.log('Recommended encoding cards render')
    const { field, attrName } = this.props;
    return (
      <RecCard
        key={`${field}-${attrName}`}
        onClickAccept={this.handleClickAccept}
        onHoverCard={this.handleHoverCard}
      >
        {'Assign '} <strong>{attrName}</strong> {` to ${field}`}
      </RecCard>
    )
  }
}


export { RecommendedEncodings }