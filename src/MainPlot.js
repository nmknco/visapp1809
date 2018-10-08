import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';
import { RecommendPanel } from './RecommendPanel';
import { Attribute } from './Attributes';
import { Encodings } from './Encodings';
import { ColorUtil } from './util';

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
    }

    this.chartConfig = {
      pad: {t: 40, r: 40, b: 160, l: 160},
      svgW: 720,
      svgH: 720
    };
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

  _shouldEnableUnVisualSelected = (field) => {
    const entry = this.state.plotConfig[field];
    return !entry && this.mp && this.mp.selector.hasSelection();
  };
  _shouldEnableUnVisualAll = (field) => {
    const entry = this.state.plotConfig[field];
    return !entry && this.mp && this.mp.activeSelections.hasActiveSelection(field);
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


  render() {
    return (
      <div style={{display: 'flex'}}>
        <div className="mid-panel">
          <Encodings 
            setPlotConfig={this.setPlotConfig}
            plotConfig={this.state.plotConfig}
          />
          <div ref={this.d3ContainerRef}>
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
        
        <div className="right-panel">
          {
            <RecommendPanel
              suggestedAttrListsByField={this.state.suggestedAttrListsByField}
              onClickAccept={this.handleClickAccept}
              onHoverRecommendCard={this.handleHoverRecommendCard}
            />
          }

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