import * as React from 'react';
import { GithubPicker } from 'react-color';

import {
  ColorPickerStyle,
  HandlePickColor,
} from './commons/types';
import {
  ColorObj,
  ColorUtil,
  HSLColor,
} from './commons/util';


const HUES = [5, 35, 55, 110, 170, 200, 235, 275];
const SAT = 0.9;
const LIT = 0.5;

const PICKERWIDTH = 114;

interface ColorPickerProps {
  readonly style: Readonly<ColorPickerStyle>,
  readonly onChangeComplete: HandlePickColor,
}

class ColorPicker extends React.PureComponent<ColorPickerProps> {

  render() {
    return (
      <div 
        className="color-picker" 
        style={this.props.style}
      >
        <GithubPicker
          width={PICKERWIDTH.toString()}
          // colors={['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB']}
          colors = {HUES.map(h => ColorUtil.hslToString(new HSLColor(h, SAT, LIT)))}
          onChangeComplete={this.props.onChangeComplete}
        />
      </div>
    )
  }
}

interface PopupColorPickerProps {
  readonly onPickColor: HandlePickColor,
  readonly offset: Readonly<{left: number, top: number}>,
}

interface PopupColorPickerState {
  display: 'none' | 'initial',
}

class PopupColorPicker extends React.PureComponent<PopupColorPickerProps, PopupColorPickerState> {
  constructor(props: PopupColorPickerProps) {
    super(props);
    this.state = {
      display: 'none',
    };
  }

  private toggleDisplay = () => {
    const display = this.state.display === 'none' ? 'initial' : 'none';
    this.setState(() => ({display}));
  };

  render() {
    return (
      <div
        onClick={this.toggleDisplay}
        style={{
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <ColorPicker
          style={{
            ...this.props.offset,
            ...this.state,
          }}
          onChangeComplete={this.props.onPickColor}
        />
        {this.props.children}
      </div>
    );
  }
}


interface RectPopupColorPickerProps {
  readonly width: number,
  readonly height: number,
  readonly currentColor: string
  readonly onPickColor: HandlePickColor,
}

class RectPopupColorPicker extends React.PureComponent<RectPopupColorPickerProps> {

  private handlePickColor = (colorObj: ColorObj) => {
    this.setState(() => ({hslColor: colorObj.hsl}));
    this.props.onPickColor(colorObj);
  };

  render() {
    return (
      <PopupColorPicker
        onPickColor={this.handlePickColor}
        offset={{
          left: this.props.width / 2 - 15,
          top: this.props.height / 2 + 5,
        }}
      >
        <div
          style={{
            width: this.props.width,
            height: this.props.height,
            backgroundColor: this.props.currentColor,
          }}
        />
      </PopupColorPicker>
    );
  }
}

export { ColorPicker, PopupColorPicker, RectPopupColorPicker, HUES, SAT, LIT }