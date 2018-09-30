import React, { Component } from 'react';
import { GithubPicker } from 'react-color';
import { ColorUtil } from './util';

const HUES = [5, 35, 55, 110, 170, 200, 235, 275];
const SAT = 0.9;
const LIT = 0.5;

class ColorPicker extends Component {

  render() {
    return (
      <div 
        className="color-picker" 
        style={this.props.style}
        onClick={this.props.onClick}
      >
        <GithubPicker
          width={114}
          // colors={['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB']}
          colors = {HUES.map(h => ColorUtil.hslToString({
            h, s: SAT, l: LIT,
          }))}
          onChangeComplete={this.props.onChangeComplete}
        />
      </div>
    )
  }
}

export { ColorPicker, HUES, SAT, LIT }