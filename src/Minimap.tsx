import * as React from 'react';

import { Filter } from './Filter';

import {
  MINIMAP_D,
  MINIMAP_D_PREVIEW,
  MINIMAP_MAR,
  MINIMAP_PAD,
} from './commons/constants';
import {
  Data,
  HandleHoverFilter,
  HandleRemoveFilter,
  MinimapScaleMap,
} from './commons/types';
import { FAButton } from './FAButton';

interface MinimapProps {
  readonly fid: number,
  readonly filter: Filter,
  readonly dataFiltered: Data,
  readonly onRemove: HandleRemoveFilter,
  readonly onHover: HandleHoverFilter,
  readonly scales: Readonly<MinimapScaleMap>,
  readonly xAttrName?: string,
  readonly yAttrName?: string,
  readonly dimension?: number,
  readonly isPreview?: boolean,
}

class Minimap extends React.PureComponent<MinimapProps> {

  private handleRemove = () =>
    this.props.onRemove(this.props.fid);

  private handleHover = (ev: React.MouseEvent<Element>) =>
    this.props.onHover(ev, this.props.filter)

  private getDimension = () => 
    this.props.dimension || this.props.isPreview ? MINIMAP_D_PREVIEW : MINIMAP_D


  private renderDots = () => {
    const { dataFiltered, xAttrName, yAttrName } = this.props;
    // const r = this.props.isPreview ? 1 : 2;
    const r = 1;
    const dimension = this.getDimension();

    let {scales: {xScale, yScale}} = this.props;
    xScale = xScale && xScale.copy().range([MINIMAP_PAD, dimension - MINIMAP_PAD]);
    yScale = yScale && yScale.copy().range([dimension - MINIMAP_PAD, MINIMAP_PAD]);
    
    if (xAttrName && yAttrName && xScale && yScale) {
      return dataFiltered.map(d => 
        <circle
              key={d.__id_extra__}
              className="minimap__dot"
              cx={xScale!(d[xAttrName])} 
              cy={yScale!(d[yAttrName])} 
              r={r}
        />
      )
    } else {
      return null;
    }
  }

  render() {
    const dimension = this.getDimension();

    return (
      <div
        className="minimap"
        style={{padding: `${MINIMAP_MAR}px 0`, flex: `0 0 ${dimension + MINIMAP_MAR * 2}px`}}
      >
        <svg 
          className="minimap__svg" 
          width={dimension}
          height={dimension}
        >
          {this.renderDots()}
        </svg>
        {!this.props.isPreview &&
          <div 
            className="minimap__overlay"
            style={{
              top: MINIMAP_MAR,
              width: dimension,
              height: dimension,
            }}
            onMouseEnter={this.handleHover}
            onMouseLeave={this.handleHover}
          >
            <div 
              className="minimap__overlay--buttons px-1"
            > 
              <FAButton
                faName="times"
                onClick={this.handleRemove}
                hoverEffect={true}
                title="Remove"
              />
              <FAButton
                faName="filter"
                title="Toggle on/off"
              />
            </div>
          </div>
        }
      </div>
    );
  }
}

export { Minimap };