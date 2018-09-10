import React, { Component } from 'react';

import { MainPlotter } from './Plotter'
import { ColorPicker } from './ColorPicker';

export class MainPlot extends Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.state = {
      colorPickerStyle: {left: 0, top: 0, visibility: 'hidden'},
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
      this.myRef.current,
      this.chartConfig,
      this.updateColorPicker,
      this.updateColor,
    );
  }

  componentDidMount() {
    this._initializeMainPlotter();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      console.log('Dataset Changed!');
      this._initializeMainPlotter();
    }
    const { x_attr, y_attr } = this.props.plotConfig;
    if (x_attr && y_attr) {
      this.mp.update(this.props.plotConfig)
    }
  }

  componentWillUnmount() {}

  updateColorPicker = (style) => {
    this.setState((prevState) => (
      {colorPickerStyle: {...prevState.colorPickerStyle, ...style}}
    ));
  }

  updateSelectedColor = (color) => {
    console.log(color);
    this.mp.setSelectedColor(color.hex);
  }

  render() {
    return (
      <div ref={this.myRef}>
        <ColorPicker 
          style={this.state.colorPickerStyle} 
          color="#b80000" 
          onChangeComplete={this.updateSelectedColor}
        />
      </div>
    )
  }
}