import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';
import { RecommendPanel } from './RecommendPanel';
import { Attribute } from './Attributes';
import { Filters } from './Filters';
import { Encodings } from './Encodings';
import { ColorUtil } from './util';
import { MINIMAP_D, MINIMAP_MAR, RIGHT_PANEL_WIDTH } from './Constants';

class PlotConfigEntry {
  constructor(attribute, useCustomScale) {
    this.attribute = attribute;
    this.useCustomScale = useCustomScale || false;
  }
}

class MainPlot extends Component {
  constructor(props) {
    super(props);
    this.d3ContainerRef = React.createRef();
    this.state = {
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      suggestedAttrListsByField: {color: [], size: []},
      // plotConfig: {},
      plotConfig: {
        x: {attribute: {name: 'Horsepower', type: 'number'}},
        y: {attribute: {name: 'Miles_per_Gallon', type: 'number'}},
      },
      scales: {xScale: null, yScale: null},
      isDraggingPoints: false,
      isHoveringFilterPanel: false,
      idSetPendingFilter: null,
      idSetsFiltered: [],
      hasSelection: false,
      hasActiveSelection: {color: false, size: false},
    }

    this.chartConfig = {
      pad: {t: 40, r: 40, b: 160, l: 160},
      svgW: 720,
      svgH: 720
    };

    this.mp = null;
  }

  _initializeMainPlotter = () => {
    // A new plotter is needed for every new dataset
    this.mp = new MainPlotter(
      this.props.data,
      this.d3ContainerRef.current,
      this.chartConfig,
      this.updateColorPicker,
      this.props.onDataPointHover,
      this.updateRecommendation,
      this.handleChangeVisualByUser, // for resizer, which needs direct interaction with plot
      this.handleDragPointsEnd,
      this.setMinimapScales,
      this.updateHasSelection,
      this.updateHasActiveSelection,
      this.setIsDraggingPoints,
    );
    this.mp.updatePosition(this.state.plotConfig);
  }

  componentDidMount() {
    // Ultimately this should be called in componentDidUpdate too
    if (this.props.data) {
      this._initializeMainPlotter();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      console.log('Dataset Changed!');
      this._initializeMainPlotter();
    }
  }

  componentWillUnmount() {}

  setPlotConfig = (field, plotConfigEntry, keepSelection, callback) => {
    const { x: prevX, y: prevY, color: prevColor } = this.state.plotConfig;

    this.setState((prevState) => ({
      plotConfig: {
        ...prevState.plotConfig,
        [field]: plotConfigEntry,
      }
    }), () => {
      const plotConfig = this.state.plotConfig;
      if (field === 'x' || field === 'y') {
        const { x, y } = plotConfig;
        this.mp.updatePosition(plotConfig); // updateXY() clears plot if x or y is undefined
        if (!x || !y) {
          this._clearAllFilters();
        }
        if (!(prevX && prevY) && x && y) {
          this.mp.updateVisual(['color', 'size'], plotConfig); // restore color and size
        }
      }
      
      if (field === 'color' || field === 'size') {
        this.mp.updateVisual([field,], plotConfig, keepSelection);
      }

      if (callback) {
        callback();
      }
    });

  };

  updateColorPicker = (style) => {
    this.setState((prevState) => (
      {colorPickerStyle: {...prevState.colorPickerStyle, ...style}}
    ));
  };

  hideColorPicker = () => {
    this.updateColorPicker({display: 'none'});
  };

  // Note: now no need to call updateRecommendation the three methods below
  // as recommendations are sync-ed in ActiveSelectionsWithRec
  handleChangeVisualByUser = (field, value) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined, true); // note this now always updates(clears) color
    }
    this.mp.assignVisual(field, value);
  };


  handleClickUnVisualAll = (field) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined); // note this now always updates(clears) color
    }
    this.mp.unVisualAll(field);
  };

  handleClickUnVisualSelected = (field) => {
    this.mp.unVisualSelected(field);
  };

  updateHasSelection = (hasSelection) => {
    this.setState(() => ({hasSelection}))
  };

  updateHasActiveSelection = (field, hasActiveSelection) => {
    this.setState((prevState) => ({hasActiveSelection: {
      ...prevState.hasActiveSelection,
      field: hasActiveSelection,
    }}));
  };

  _shouldEnableUnVisualSelected = (field) => {
    return !this.state.plotConfig[field] && this.state.hasSelection;
  };
  _shouldEnableUnVisualAll = (field) => {
    const entry = this.state.plotConfig[field];
    return !entry && this.state.hasActiveSelection[field];
  };

  updateRecommendation = (suggestedAttrListsByField) => {
    this.setState((prevState) => ({ suggestedAttrListsByField }));
  };

  // clearRecommendation = () => {
  //   // in principle recommendation should be in sync with the colored groups
  //   // this function may be defined for potential cases where we want to 
  //   // clear recommendations but preserve the color groups backstage.
  // };

  handleClickAccept = (field, attrName) => {
    this.mp.clearSelection();
    this.setPlotConfig(
      field, 
      new PlotConfigEntry(new Attribute(attrName, 'number'), true)
    );
  };

  handleHoverRecommendCard = (field, attrName, action) => {
    if (action === 'mouseenter') {
      this.mp.updateVisualWithRecommendation(field, attrName);
    } else if (action === 'mouseleave') {
      if (this.state.plotConfig[field]) {
        this.mp.updateVisual([field,], this.state.plotConfig)
      } else {
        this.mp.syncVisualToUserSelection(field);
      }
    }
  };

  setIsHoveringFilterPanel = (isHoveringFilterPanel) => {
    this.setState({isHoveringFilterPanel});
  };

  handleDragPointsEnd = (idSetPendingFilter) => {
    if (this.state.isHoveringFilterPanel) {
      // console.log('Drag release in filter');
      this.setState(() => ({idSetPendingFilter}));
    }
  };

  handleAcceptFilter = (filteredIds) => {
    this._filterOutPoints(filteredIds);
    this.setState((prevState) => ({
      idSetPendingFilter: null,
      idSetsFiltered: [...prevState.idSetsFiltered, filteredIds],
    }));
  }

  handleRestoreFilter = (filteredIds) => {
    this.toggleHidePoints(filteredIds, false);
    this.setState((prevState) => {
      // assuming sets are exclusive - so every id can be used as set-id
      const i = filteredIds.values().next().value;
      return {
        idSetsFiltered: prevState.idSetsFiltered.filter(set => !set.has(i))
      }
    });
  }

  handleCancelFilter = () => {
    this.setState((prevState) => ({idSetPendingFilter: null}));
  };



  _clearAllFilters = () => {
    this.setState((prevState) => ({idSetPendingFilter: null, idSetsFiltered: []}));
  }

  _filterOutPoints = (filteredIds) => {
    // 1. hide visual 
    this.toggleHidePoints(filteredIds);
    // 2. remove from active selections, BUT DO NOT SYNC COLOR
    for (let field of ['color', 'size']) {
      this.mp.activeSelections.resetValue(field, this.state.idSetPendingFilter)
    }
    // 3. clear selection 
    this.mp.clearSelection();
  };


  handleHoverFilterCard = (idSet, action) => {
    if (action === 'mouseenter') {
      this.toggleDimPoints(idSet, true);
    } else if (action === 'mouseleave') {
      this.toggleDimPoints(idSet, false);
    }
  }

  handleHoverMinimap = (idSet, action) => {
    if (action === 'mouseenter') {
      this.toggleHidePoints(idSet, false);
      this.toggleDimPoints(idSet, true);
    } else if (action === 'mouseleave') {
      this.toggleHidePoints(idSet, true); // this will reset dim classes
    }
  }

  toggleHidePoints = (idSet, shouldHide=true) => {
    this.mp.toggleHideOrDimPoints(idSet, shouldHide);
  };

  toggleDimPoints = (idSet, shouldHide=true) => {
    this.mp.toggleHideOrDimPoints(idSet, shouldHide, true);
  }


  setMinimapScales = (scales = {xScale: null, yScale: null}) => {
    this.setState(() => ({scales}));
  };

  setIsDraggingPoints = (isDraggingPoints) => {
    this.setState({isDraggingPoints});
  }

  render() {
    return (
      <div style={{display: 'flex'}}>
        <div className="mid-panel">
          <Encodings 
            setPlotConfig={this.setPlotConfig}
            plotConfig={this.state.plotConfig}
          />
          <div ref={this.d3ContainerRef} className="main-plot-container">
            <div style={{height: 0}}>
              <ColorPicker 
                style={this.state.colorPickerStyle} 
                onChangeComplete={(colorObj) => {
                  this.handleChangeVisualByUser('color', ColorUtil.hslToString(colorObj.hsl))
                }}
                onClick={this.hideColorPicker}
              />
            </div>
          </div>
        </div>
        
        <div 
          className="right-panel" 
          style={{flex: `0 0 ${RIGHT_PANEL_WIDTH}px`}}
        >
          <Filters
            data={this.props.data}
            idSetPendingFilter={this.state.idSetPendingFilter}
            idSetsFiltered={this.state.idSetsFiltered}
            scales={this.state.scales}
            plotConfig={this.state.plotConfig}
            setIsHoveringFilterPanel={this.setIsHoveringFilterPanel}
            onClickAccept={this.handleAcceptFilter}
            onClickCancel={this.handleCancelFilter}
            onHoverCard={this.handleHoverFilterCard}
            onHoverMinimap={this.handleHoverMinimap}
            onClickRestore={this.handleRestoreFilter}
            isDraggingPoints={this.state.isDraggingPoints}
            isHoveringFilterPanel={this.state.isHoveringFilterPanel}
          />
          <RecommendPanel
            suggestedAttrListsByField={this.state.suggestedAttrListsByField}
            onClickAccept={this.handleClickAccept}
            onHoverRecommendCard={this.handleHoverRecommendCard}
          />

          {/* TODO: Use a drop down for reset options */}
          {['color', 'size'].map(field => {
            return (
              <div key={`clear_${field}`} className="d-flex m-1 py-1">
                <div className="m-1 text-right"> {`Clear my assigned ${field} for`} </div>
                <button
                  disabled={!this._shouldEnableUnVisualSelected(field)}
                  className="btn btn-sm btn-outline-danger m-1"
                  onClick={() => {this.handleClickUnVisualSelected(field)}}
                >
                  {`Selected points`}
                </button>
                <button 
                  disabled={!this._shouldEnableUnVisualAll(field)}
                  className="btn btn-sm btn-outline-danger m-1"
                  onClick={() => {this.handleClickUnVisualAll(field)}}
                >
                  {`All`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    )
  }
}

export { PlotConfigEntry, MainPlot };