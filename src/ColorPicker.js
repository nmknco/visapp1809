import React, { Component } from 'react';
import { GithubPicker } from 'react-color';

class ColorPicker extends React.Component {

  render() {
    return (
      <div 
        className="color-picker" 
        style={this.props.style}
      >
        <GithubPicker
          width={215}
          color={this.props.color}
          onChangeComplete={this.props.onChangeComplete} 
        />
      </div>
    )
  }
}

export { ColorPicker }