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
      suggestedAttrList: [],
      // plotConfig: {},
      plotConfig: {
        x: {attribute: {name: 'Horsepower', type: 'number'}},
        y: {attribute: {name: 'Miles_per_Gallon', type: 'number'}},
      },
    }

    this.isShowingUserSelectedColor = true; 

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
    );
    this.mp.updateXY(this.state.plotConfig);
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
        this.mp.updateXY(plotConfig); // updateXY() clears plot if x or y is undefined
        if (!(prevX && prevY) && x && y) {
          this.mp.updateFields(['color', 'size'], plotConfig); // restore color and size
        }
      }
      
      if (field === 'color' || field === 'size') {
        this.mp.updateFields([field,], plotConfig, keepSelection);
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
  handleChangeColorOnPicker = (colorObj) => {
    if (this.state.plotConfig.color) {
      this.setPlotConfig('color', undefined, true); // note this now always updates(clears) color
    }
    this.mp.assignColor(colorObj);
  };

  handleClickUncolorAll = () => {
    if (this.state.plotConfig.color) {
      this.setPlotConfig('color', undefined); // note this now always updates(clears) color
    }
    this.mp.uncolorAll();
  };

  handleClickUncolorSelected = () => {
    this.mp.uncolorSelected();
  };

  _shouldDisableUncolorSelected = () => {
    const { color } = this.state.plotConfig;
    return !!color;
  };

  updateRecommendation = (suggestedAttrList) => {
    this.setState((prevState) => ({ suggestedAttrList }));
  };

  // clearRecommendation = () => {
  //   // in principle recommendation should be in sync with the colored groups
  //   // this function may be used for potential cases where we want to 
  //   // clear recommendations but preserve the color groups backstage.
  //   this.setState((prevState) => ({suggestedAttrList: []}));
  // };

  handleClickAccept = (color_attr) => {
    this.mp.clearSelection();
    this.setPlotConfig(
      'color', 
      new PlotConfigEntry(new Attribute(color_attr, 'number'), true)
    );
  };


  handleHoverRecommendCard = (color_attr, action) => {
    if (action === 'mouseenter') {
      this.mp.updateColorWithRecommendation(color_attr);
    } else if (action === 'mouseleave') {
      if (this.state.plotConfig.color) {
        this.mp.updateColor(this.state.plotConfig)
      } else {
        this.mp.syncColorToUserSelection();
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
            // isShowingCustomColor={this.state.isShowingCustomColor}
          />
          <div ref={this.d3ContainerRef}>
            <div style={{height: 0}}>
              <ColorPicker 
                style={this.state.colorPickerStyle} 
                onChangeComplete={this.handleChangeColorOnPicker}
                onClick={this.hideColorPicker}
              />
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          {
            <RecommendPanel
              suggestedAttrList={this.state.suggestedAttrList}
              onClickAccept={this.handleClickAccept}
              onHoverRecommendCard={this.handleHoverRecommendCard}
            />
          }

          {/* TODO: Use a drop down for reset options */}
          <button
            disabled={this._shouldDisableUncolorSelected()}
            className="btn btn-sm btn-outline-danger m-1"
            onClick={this.handleClickUncolorSelected}
          >
            Clear color for selected points
          </button>
          <button 
            className="btn btn-sm btn-outline-danger m-1"
            onClick={this.handleClickUncolorAll}
          >
            Clear color for all
          </button>
        </div>
      </div>
    )
  }
}

export { PlotConfigEntry, MainPlot };