import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';
import { RecommendPanel } from './RecommendPanel';
import { Classifier } from './Classifier';
import { Encodings } from './Encodings'
import { ColorUtil } from './util';

export class MainPlot extends Component {
  constructor(props) {
    super(props);
    this.d3ContainerRef = React.createRef();
    this.state = {
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      suggestedAttrList: [],
      // plotConfig: {},
      plotConfig: {x_attr: {name: 'Horsepower', type: 'number'}, y_attr: {name: 'Miles_per_Gallon', type: 'number'}}
    }

    this.chartConfig = {
      pad: {t: 40, r: 40, b: 160, l: 160},
      svgW: 720,
      svgH: 720,
    };
  }

  _initializeMainPlotter = () => {
    this.mp = new MainPlotter(
      this.props.data,
      this.d3ContainerRef.current,
      this.chartConfig,
      this.updateColorPicker,
      this.props.onDataPointHover,
    );
    this.classifier = new Classifier(this.props.data);
    this.mp.update(this.state.plotConfig); // REMOVE THIS LATER
  }

  componentDidMount() {
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
      this.setState((prevState) => ({plotConfig}));

      const { x_attr, y_attr } = plotConfig;
      if (x_attr && y_attr) {
        this.mp.update(plotConfig)
      }
    }
  };

  updateColorPicker = (style) => {
    this.setState((prevState) => (
      {colorPickerStyle: {...prevState.colorPickerStyle, ...style}}
    ));
  };

  hideColorPicker = () => {
    this.updateColorPicker({display: 'none'});
  };

  handleChangeColorOnPicker = (colorObj) => {
    this.mp.assignColor(colorObj);
    this.updateRecommendation();
    this.setPlotConfig('color_attr', undefined);
  };

  handleClickResetAllColor = () => {
    this.mp.resetAllColor();
    this.setPlotConfig(
      'color_attr', undefined,
    );
    this.updateRecommendation();
  };


  updateRecommendation = () => {
    this.setState((prevState) => (
      { 
        suggestedAttrList: this.classifier.getMostSimilarAttr(
            this.mp.getActiveSelections().getAllColorGroups(),
            2,
          ),
      }
    ));
  };

  clearRecommendation = () => {
    this.setState((prevState) => ({suggestedAttrList: []}));
  }

  // shouldDisableRecommendation = () => {
  //   return !this.state.suggestedAttr;
  // }

  updateColorByRecommendation = (color_attr) => {
    const colorScale = ColorUtil.interpolateColorScale(
      this.mp.getActiveSelections().getAllColorGroupsWithColor(),
      this.props.data,
      color_attr,
    );
    this.mp.updateColorWithScale(color_attr, colorScale)
  };

  handleClickAccept = (color_attr) => {
    this.updateColorByRecommendation(color_attr);
    // this.setPlotConfig('color_attr', undefined);
    this.clearRecommendation();
  }


  handleHoverRecommendCard = (color_attr, action) => {
    if (action === 'mouseenter') {
      this.updateColorByRecommendation(color_attr);
    } else if (action === 'mouseleave') {
      if (this.state.plotConfig.color_attr) {
        this.mp.update()
      } else {
        this.mp.updateColorByUserSelection();
      }
    }
  }



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
          <button 
            className="btn btn-sm btn-outline-danger m-1"
            onClick={this.handleClickResetAllColor}
          >
            Reset Color
          </button>
        </div>
      </div>
    )
  }
}