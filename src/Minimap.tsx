import * as d3 from 'd3';
import * as React from 'react';

import { FAButton } from './FAButton';
import { IdFilter } from './Filter';

import { Attribute } from './Attribute';

import {
  MINIMAP_D,
  MINIMAP_D_PREVIEW,
  MINIMAP_MAR,
  MINIMAP_PAD,
} from './commons/constants';
import { memoizedGetExtent, memoizedGetValueList } from './commons/memoized';
import {
  Data,
  HandleHoverFilter,
  HandleRemoveFilter,
} from './commons/types';
import { expandRange } from './commons/util';

interface MinimapPropsWithoutFilteredData {
  readonly data: Data,
  readonly xAttr?: Attribute,
  readonly yAttr?: Attribute,
  readonly dimension?: number,
  readonly isPreview?: boolean,
  readonly overlay?: JSX.Element,
}

interface MinimapProps extends MinimapPropsWithoutFilteredData {
  readonly filteredIds: ReadonlySet<string>,
}

class Minimap extends React.PureComponent<MinimapProps> {
  
  private getDimension = () => 
    this.props.dimension || this.props.isPreview ? MINIMAP_D_PREVIEW : MINIMAP_D;
  
  private renderDots = () => {
    const { filteredIds, data, xAttr, yAttr } = this.props;
    const filteredData = data.filter(d => filteredIds.has(d.__id_extra__));
    
    // const r = this.props.isPreview ? 1 : 2;
    const r = 1;
    const dimension = this.getDimension();
    
    if (!xAttr || !yAttr) {
      return null;
    }

    // scales: can't please d3's ts typing without setting range separately
    const xMiniScale = (xAttr.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(memoizedGetExtent(data, xAttr.name)))
          .range([MINIMAP_PAD, dimension - MINIMAP_PAD]) :
        d3.scalePoint()
          .domain(memoizedGetValueList(data, xAttr.name) as ReadonlyArray<string>)
          .range([MINIMAP_PAD, dimension - MINIMAP_PAD])
          .padding(0.2)

    const yMiniScale = (yAttr.type === 'number') ?
        d3.scaleLinear()
          .domain(expandRange(memoizedGetExtent(data, yAttr.name)))
          .range([dimension - MINIMAP_PAD, MINIMAP_PAD]) :
        d3.scalePoint()
          .domain(memoizedGetValueList(data, yAttr.name) as ReadonlyArray<string>)
          .range([dimension - MINIMAP_PAD, MINIMAP_PAD])
          .padding(0.2)
    
    return filteredData.map(d => 
      <circle
        key={d.__id_extra__}
        className="minimap__dot"
        // @ts-ignore
        cx={xMiniScale(d[xAttr.name])} 
        // @ts-ignore
        cy={yMiniScale(d[yAttr.name])} 
        r={r}
      />
    );
  }

  render() {
    console.log('Minimap render');
    const dimension = this.getDimension();
    
    return (
      <div
        className="minimap"
        style={{
          padding: `${MINIMAP_MAR}px 0`,
          flex: `0 0 ${dimension + MINIMAP_MAR * 2}px`
        }}
      >
        <svg 
          className="minimap__svg" 
          width={dimension}
          height={dimension}
          >
          {this.renderDots()}
        </svg>
        <div
          className="minimap__overlay"
          style={{
            top: MINIMAP_MAR,
            width: dimension,
            height: dimension,
          }}
        >
          {this.props.overlay}
        </div>
      </div>
    );
  }
}


interface PointFilterMinimapProps extends MinimapPropsWithoutFilteredData {
  // passing data instead of filtered ones to avoid unnecessary rerender
  // will recompute filtered data only if props change
  readonly fid: number,
  readonly filter: IdFilter,
  readonly onRemove: HandleRemoveFilter,
  readonly onHover: HandleHoverFilter,
}

class PointFilterMinimap extends React.PureComponent<PointFilterMinimapProps> {

  private handleRemove = () =>
    this.props.onRemove(this.props.fid);

  private handleHover = (ev: React.MouseEvent<Element>) =>
    this.props.onHover(ev, this.props.filter);

  private renderOverlay = () => (
    <div 
      style={{
        width: '100%',
        height: '100%',
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
  );

  render() {
    return (
      <Minimap
        {...this.props}
        filteredIds={this.props.filter.seed}
        overlay={this.renderOverlay()}
      />
    )
  }
}

export { Minimap, PointFilterMinimap };