import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';
import { RecommendPanel } from './RecommendPanel';
import { Encodings } from './Encodings'
import { ColorUtil } from './util';

export class MainPlot extends Component {
  constructor(props) {
    super(props);
    this.d3ContainerRef = React.createRef();
    this.state = {
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      suggestedAttrList: [],
      isShowingUserColor: true,
      // plotConfig: {},
      plotConfig: {x_attr: {name: 'Horsepower', type: 'number'}, y_attr: {name: 'Miles_per_Gallon', type: 'number'}}
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
    );
    this.mp.update(this.state.plotConfig);
  }

  componentDidMount() {
    // Ultimately this should be called in componentDidUpdate too
    if (this.props.data) {
      this._initializeMainPlotter();
    }
  }

  componentDidUpdate(prevProps) {
    // console.log('MainPlot update')
    if (prevProps.data !== this.props.data) {
      console.log('Dataset Changed!');
      this._initializeMainPlotter();
    }
  }

  componentWillUnmount() {}

  setPlotConfig = (key, attribute) => {
    const plotConfig = { ...this.state.plotConfig }

    if (plotConfig[key] !== attribute) {
      plotConfig[key] = attribute;
      this.setState((prevState) => ({
        plotConfig,
      }));

      const { x_attr, y_attr } = plotConfig;
      if (x_attr && y_attr) {
        this.mp.update(plotConfig)
      }
    }
    if (plotConfig.color_attr) {
      this.setState((prevState) => ({
        isShowingUserColor: false,
      }));
    };
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
    this.setPlotConfig('color_attr', undefined); // this won't change color but it's still safer to call first
    this.mp.assignColor(colorObj);
    this.setState({ isShowingUserColor: true });
  };

  handleClickUncolorAll = () => {
    this.setPlotConfig('color_attr', undefined);
    this.mp.uncolorAll();
    this.setState({ isShowingUserColor: true });
  };

  handleClickUncolorSelected = () => {
    this.mp.uncolorSelected();
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
    this.mp.updateColorWithRecommendationAndResetColorGroup(color_attr);
    this.setState({ isShowingUserColor: false });
    // TODO: add attribute text to the color encoding field
  };


  handleHoverRecommendCard = (color_attr, action) => {
    if (action === 'mouseenter') {
      this.mp.updateColorWithRecommendation(color_attr);
    } else if (action === 'mouseleave') {
      if (this.state.plotConfig.color_attr) {
        this.mp.update()
      } else {
        this.mp.updateColorByUserSelection();
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
                onChangeComplete={this.handleChangeColorOnPicker}
                onClick={this.hideColorPicker}
              />
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          {
            <RecommendPanel
              // disabled={this.shouldDisableRecommendation()}
              suggestedAttrList={this.state.suggestedAttrList}
              onClickAccept={this.handleClickAccept}
              onHoverRecommendCard={this.handleHoverRecommendCard}
            />
          }

          {/* TODO: Use a drop down for reset options */}
          <button
            disabled={!this.state.isShowingUserColor}
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