import * as React from 'react';
import { GithubPicker } from 'react-color';

import { ColorPickerStyle, HandlePickColor } from './commons/types';
import { ColorUtil } from './commons/util';

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