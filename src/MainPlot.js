import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';
import { RecommendPanel } from './RecommendPanel';
import { Classifier } from './Classifier';
import { Encodings } from './Encodings'

export class MainPlot extends Component {
  constructor(props) {
    super(props);
    this.d3ContainerRef = React.createRef();
    this.state = {
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      suggestedAttr: undefined,
      userColor: undefined,
      plotConfig: {},
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
      this.updateRecommendation,
      this.props.onDataPointHover,
    );
    this.classifier = new Classifier(this.props.data);
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
    plotConfig[key] = attribute;

    this.setState((prevState) => ({plotConfig}));

    const { x_attr, y_attr } = plotConfig;
    if (x_attr && y_attr) {
      this.mp.update(plotConfig)
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

  updateRecommendation = () => {
    this.setState((prevState) => (
      { suggestedAttr: this.classifier.getMostSimilarAttr(this.mp.getSelectedIds()) }
    ));
  };

  handleChangeColorOnPicker = (colorObj) => {
    this.mp.setUserSelectedColor(colorObj);
    this.setState((prevState) => ({userColor: colorObj}));
    this.setPlotConfig('color_attr', undefined);
  };

  updateColorByRecommendation = () => {
    const pivot_value = this.classifier.getSelectedMedian(this.mp.getSelectedIds(), this.state.suggestedAttr);
    this.mp.updateColorWithUserColor(this.state.suggestedAttr, pivot_value, this.state.userColor.hsl);
  };

  handleClickAccept = () => {
    this.mp.setColorSource('recommendation');
    this.updateColorByRecommendation();
    // this.setPlotConfig('color_attr', undefined);
  }

  handleClickResetAllColor = () => {
    this.setState((prevState) => ({ userColor: undefined }));
    this.mp.resetAllColor();
    this.setPlotConfig('color_attr', undefined);
  }

  shouldDisableRecommendation = () => {
    return !this.state.suggestedAttr || !this.state.userColor 
  }

  handleHoverRecommendCard = (action) => {
    if (!this.shouldDisableRecommendation()) {
      if (action === 'mouseenter') {
        this.updateColorByRecommendation();
      } else if (action === 'mouseleave') {
        if (this.mp.getColorSource() === 'selection') {
          this.mp.resetAllColor();
          this.handleChangeColorOnPicker(this.state.userColor);
        }
      }
    }
  }

  render() {
    return (
      <div style={{display: 'flex'}}>
        <div>
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
        
        <div>
          <RecommendPanel 
            disabled={this.shouldDisableRecommendation()}
            suggestedAttr={this.state.suggestedAttr}
            onClickAccept={this.handleClickAccept}
            onHoverRecommendCard={this.handleHoverRecommendCard}
          />
          <button 
            className="btn btn-sm btn-danger m-1"
            onClick={this.handleClickResetAllColor}
          >
            Reset Color
          </button>
        </div>
      </div>
    )
  }
}