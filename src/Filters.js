import * as d3 from 'd3';
import React, { Component } from 'react';

import { Panel } from './Panel';
import { RecCard } from './RecCard';
import { Classifier } from './Classifier';
import { MINIMAP_D, MINIMAP_PAD, MINIMAP_MAR, MINIMAP_PERROW, MINIMAP_D_PREVIEW } from './Constants';


class Minimap extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let {
      dataFiltered, scales: {xScale, yScale}, x, y, 
      isPreview, onClickRestore, onHover,
      dimension,
    } = this.props;

    if (!dimension) {
      dimension = isPreview ? MINIMAP_D_PREVIEW : MINIMAP_D;
    }
    const r = isPreview ? 1 : 2;

    const filteredIds = new Set(dataFiltered.map(d => d.__id_extra__)); 
    xScale = xScale && xScale.copy().range([MINIMAP_PAD, dimension - MINIMAP_PAD]);
    yScale = yScale && yScale.copy().range([dimension - MINIMAP_PAD, MINIMAP_PAD]);
    return (
      <div
        className="minimap"
        style={{padding: MINIMAP_MAR, flex: `0 0 ${dimension + MINIMAP_MAR * 2}px`}}
      >
        <svg 
          className="minimap__svg" 
          width={dimension}
          height={dimension}
        >
          {x && y && xScale && yScale &&
            dataFiltered.map(
            d => <circle
              key={d.__id_extra__}
              className="minimap__dot"
              cx={xScale(d[x.attribute.name])} 
              cy={yScale(d[y.attribute.name])} 
              r={r}
            ></circle>
          )}
        </svg>
        {!isPreview &&
          <div 
            className="minimap__overlay text-right"
            style={{
              top: MINIMAP_MAR,
              left: MINIMAP_MAR,
              width: dimension,
              height: dimension,
            }}
            onClick={() => {onClickRestore(new Set(dataFiltered.map(d => d.__id_extra__)))}}
            onMouseEnter={onHover}
            onMouseLeave={onHover}
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
    const {miniMapProps, onClickAccept, onHoverCard} = this.props
    const previewMap = (
      <Minimap
        {...miniMapProps}
        isPreview={true}
      />
    )

    const filteredIds = new Set(
      miniMapProps.dataFiltered.map(d => d.__id_extra__));

    return (
      <RecCard 
        onHoverCard={ev => onHoverCard(ev, filteredIds)}
        onClickAccept={() => onClickAccept(filteredIds)}
        header={previewMap}
      >
        {this.props.children}
      </RecCard>
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
        simiAttr = cls.getMostSimilarAttr([idSetPendingFilter,], 1)[0];
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
      selected: <span>the points you <strong>selected</strong></span>,
      x: <span>all points within the <strong>same x range</strong></span>,
      y: <span>all points within the <strong>same y range</strong></span>,
      similar: <span>points with similar value of <strong>{label}</strong></span>,
    }
    return (<div>Filter out {dict[dataKey]}</div>);
  }

  render() {
    const {
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
          className={"filters__drop p-1" 
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
              {/* <div className="p-1">Do you want to: </div> */}
              {
                ['selected', 'x', 'y', 'similar'].map(dataKey => {
                  const subset = filteredSubsets[dataKey];
                  if (subset) {
                    const dataFiltered = subset.data;
                    return (
                      <FilterRecCard
                        key={dataKey}
                        miniMapProps={{dataFiltered, scales, x, y}}
                        {...{onClickAccept, onHoverCard}}
                      >
                        {this.getTextPrompt(dataKey, subset.label)}
                      </FilterRecCard>
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
                  <i className="fas fa-times text-white mr-1" /> Cancel
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
                onHover={ev => onHoverMinimap(ev, idSet)}
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