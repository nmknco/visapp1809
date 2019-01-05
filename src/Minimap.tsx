import * as d3 from 'd3';
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

interface MinimapPropsWithoutFilteredData {
  readonly scales: Readonly<MinimapScaleMap>,
  readonly xAttrName?: string,
  readonly yAttrName?: string,
  readonly dimension?: number,
  readonly isPreview?: boolean,
  readonly overlay?: JSX.Element,
}

interface MinimapProps extends MinimapPropsWithoutFilteredData {
  readonly filteredData: Data,
}

class Minimap extends React.PureComponent<MinimapProps> {
  
  private getDimension = () => 
  this.props.dimension || this.props.isPreview ? MINIMAP_D_PREVIEW : MINIMAP_D;
  
  private renderDots = () => {
    const { filteredData, xAttrName, yAttrName } = this.props;
    
    // const r = this.props.isPreview ? 1 : 2;
    const r = 1;
    const dimension = this.getDimension();
    
    const {scales: {xScale, yScale}} = this.props;
    if (!xScale || !yScale) {
      return;
    }
    const xMiniScale = d3.scaleLinear().domain(xScale.range()).range([MINIMAP_PAD, dimension - MINIMAP_PAD]);
    const yMiniScale = d3.scaleLinear().domain(xScale.range()).range([dimension - MINIMAP_PAD, MINIMAP_PAD]);
    
    if (xAttrName && yAttrName && xScale && yScale) {
      return filteredData.map(d => 
        <circle
          key={d.__id_extra__}
          className="minimap__dot"
          cx={xMiniScale(xScale(d[xAttrName]))} 
          cy={yMiniScale(yScale(d[yAttrName]))} 
          r={r}
        />
      );
    } else {
      return null;
    }
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
  readonly data: Data,
  readonly fid: number,
  readonly filter: Filter,
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
        filteredData={this.props.data.filter(this.props.filter.filterFn)}
        overlay={this.renderOverlay()}
      />
    )
  }
}

export { Minimap, PointFilterMinimap };