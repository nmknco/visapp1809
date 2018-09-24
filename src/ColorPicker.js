import React, { Component } from 'react';
import { GithubPicker } from 'react-color';

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
          colors={['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB']}
          onChangeComplete={this.props.onChangeComplete}
        />
      </div>
    )
  }
}

export { ColorPicker }