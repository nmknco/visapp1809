import * as d3 from 'd3';
import React, { Component } from 'react';

import { Panel } from './Panel';
import { Classifier } from './Classifier';
import { MINIMAP_D, MINIMAP_PAD, MINIMAP_MAR, MINIMAP_PERROW, } from './Constants';

class Minimap extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let {dataFiltered, scales: {xScale, yScale}, x, y, isPreview, onClickRestore, onHover} = this.props;
    const filteredIds = new Set(dataFiltered.map(d => d.__id_extra__)); 
    xScale = xScale && xScale.copy().range([MINIMAP_PAD, MINIMAP_D - MINIMAP_PAD]);
    yScale = yScale && yScale.copy().range([MINIMAP_D - MINIMAP_PAD, MINIMAP_PAD]);
    return (
      <div
        className="minimap"
        style={{padding: MINIMAP_MAR, flex: `0 0 ${MINIMAP_D + MINIMAP_MAR * 2}px`}}
      >
        <svg 
          className="minimap__svg" 
          width={MINIMAP_D}
          height={MINIMAP_D}
        >
          {x && y && xScale && yScale &&
            dataFiltered.map(
            d => <circle
              key={d.__id_extra__}
              className="minimap__dot"
              cx={xScale(d[x.attribute.name])} 
              cy={yScale(d[y.attribute.name])} 
              r="2"
            ></circle>
          )}
        </svg>
        {!isPreview &&
          <div 
            className="minimap__overlay text-right"
            style={{
              top: MINIMAP_MAR,
              left: MINIMAP_MAR,
              width: MINIMAP_D,
              height: MINIMAP_D,
            }}
            onClick={() => {onClickRestore(new Set(dataFiltered.map(d => d.__id_extra__)))}}
            onMouseEnter={() => {console.log(onHover); if(onHover) onHover(filteredIds, 'mouseenter')}}
            onMouseLeave={() => {if(onHover) onHover(filteredIds, 'mouseleave')}}
          >
            <div 
              className="minimap__restore-text text-center"
            > 
              Click to restore
            </div>
          </div>
        }
      </div>
    );
  }
}


class FilterRecCard extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {dataFiltered, scales, x, y, onClickAccept, onClickCancel, onHoverCard} = this.props
    const filterdIds = new Set(dataFiltered.map(d => d.__id_extra__));
    return (
      <div 
        className="filters__prompt card flex-row border-light align-items-center text-right p-3 my-1"
        onMouseEnter={() => onHoverCard(filterdIds, 'mouseenter')}
        onMouseLeave={() => onHoverCard(filterdIds, 'mouseleave')}
      >
        <div className={"filters__prompt-text mr-2"}>
          <div className="pb-1">{this.props.text}</div>
          <div className="pb-1">
            <button 
                type="button"
                className='btn btn-sm btn-success px-3'
                onClick={() => onClickAccept(filterdIds)}
              >
                Accept
            </button>
          </div>
        </div>
        <div className="filters__prompt-preview mx-2">
          <Minimap
            {...{dataFiltered, scales, x, y}}
            isPreview={true}
            onClickRestore={this.props.onClickRestore}
          />
        </div>
      </div>
    );
  }
}


class Filters extends Component {
  constructor(props) {
    super(props);
  }

  filterDataByIds = (idSet) => 
    this.props.data.filter(d => idSet.has(d.__id_extra__));

  isFiltered = (id) => {
    for (let filteredSet of this.props.idSetsFiltered) {
      if (filteredSet.has(id)) return true;
    }
    return false;
  }

  getFilteredSubsets = ({data, idSetPendingFilter, plotConfig: {x, y} }) => {
    const filteredSubsets = {};

    if (idSetPendingFilter) {
      let xName, yName, simiAttr;

      const selected = this.filterDataByIds(idSetPendingFilter);


      filteredSubsets.selected = {
        label: 'user-selection',
        data: selected,
      };
      
      if (x && x.attribute.type === 'number') {
        xName = x.attribute.name;
        const [xmin, xmax] = d3.extent(selected, d => d[xName]);
        filteredSubsets.x = {
          label: xName,
          data: data.filter(d => d[xName] >= xmin && d[xName] <= xmax 
            && !this.isFiltered(d.__id_extra__)),
        }
      }
      
      if (y && y.attribute.type === 'number') {
        yName = y.attribute.name;
        const [ymin, ymax] = d3.extent(selected, d => d[yName]);
        filteredSubsets.y = {
          label: yName,
          data: data.filter(d => d[yName] >= ymin && d[yName] <= ymax 
            && !this.isFiltered(d.__id_extra__)),
        }
      }

      if (idSetPendingFilter.size >= 2) {
        const cls = new Classifier(data);
        simiAttr = cls.getMostSimilarAttr([idSetPendingFilter,], 1);
        if (simiAttr && simiAttr !== xName && simiAttr !== yName) {
          const [smin, smax] = d3.extent(selected, d => d[simiAttr]);
          filteredSubsets.similar = {
            label: simiAttr,
            data: data.filter(d => d[simiAttr] >= smin && d[simiAttr] <= smax
              && !this.isFiltered(d.__id_extra__)),
          }
        }
      }
    }

    return filteredSubsets;
  }

  getTextPrompt = (dataKey, label) => {
    const dict = {
      selected: 'The points you selected',
      x: 'All points within the same x range',
      y: 'All points within the same y range',
      similar: `Points with similar value of ${label}`,
    }
    return `${dict[dataKey]}?`;
  }

  render() {
    const {
      data,
      idSetPendingFilter, idSetsFiltered, scales, 
      plotConfig: {x, y}, 
      setIsHoveringFilterPanel,
      onClickAccept, onClickCancel, onHoverCard, onHoverMinimap, onClickRestore,
      isDraggingPoints, isHoveringFilterPanel,
    } = this.props;

    const filteredSubsets = this.getFilteredSubsets(this.props);

    return (
      <Panel
        className="filters-panel"
        heading="Filters"
        noPadding={true}
      > 
        <div
          className={"filters__drop px-1" 
            + (isDraggingPoints ? isHoveringFilterPanel ? " filters__drop--is-over" : " filters__drop--can-drop" : "")}
          style={{
            cursor: isDraggingPoints && isHoveringFilterPanel ? 'pointer' : 'auto',
          }}
          onMouseEnter={() => {setIsHoveringFilterPanel(true)}}
          onMouseLeave={() => {setIsHoveringFilterPanel(false)}}
        >
          {!idSetPendingFilter && !idSetsFiltered.length &&
            <div className="p-3 text-center"> Drop selected points here to filter </div>
          }
          {idSetPendingFilter &&
            <div>
              <div className="p-1">Do you want to filter out: </div>
              {
                ['selected', 'x', 'y', 'similar'].map(dataKey => {
                  const subset = filteredSubsets[dataKey];
                  if (subset) {
                    const dataFiltered = subset.data;
                    const text = this.getTextPrompt(dataKey, subset.label);
                    return (
                      <FilterRecCard
                        key={dataKey}
                        {...{dataFiltered, scales, x, y, text, 
                          onClickAccept, onHoverCard}}
                      />
                    )
                  }
                })
              }
              <div className={"py-3 mx-2 text-center"
                + (idSetsFiltered.length > 0 ? " border-bottom border-light" : "")}
              >
                <button 
                  type="button"
                  className='btn btn-sm btn-danger px-3'
                  onClick={onClickCancel}
                >
                  Cancel
                </button>
              </div>
            </div>

          }

          {idSetsFiltered.length > 0 && 
              <div className="p-1">Currently filtered points: </div>
          }

          <div className="filters__container d-flex flex-wrap">
            {idSetsFiltered.map(idSet => 
              <Minimap
                key={idSet.values().next().value}
                dataFiltered={this.filterDataByIds(idSet)}
                onClickRestore={onClickRestore}
                onHover={onHoverMinimap}
                {...{scales, x, y}}
              />
            )}
          </div>
        </div>
      </Panel>
    );
  }
}

export { Filters };