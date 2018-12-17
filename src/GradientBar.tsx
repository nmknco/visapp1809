import * as d3 from 'd3';
import * as React from 'react';

import {
  D3Interpolate,
} from './commons/types';


const NTICK = 10;

interface GradientBarProps {
  readonly palette: D3Interpolate,
  readonly width: number,
  readonly height: number,
  readonly range?: Readonly<[number, number]>
}

class GradientBar extends React.PureComponent<GradientBarProps> {

  render() {
    const {palette, width, height} = this.props;
    const adjustingScale = d3.scaleLinear()
        .domain([0,1]).range(this.props.range || [0, 1]);
    const colorScale = d3['interpolate' + palette];

    return (
      <div
        style={{width, height}}
      >
        <svg width="100%" height="100%">
          <defs>
            <linearGradient id={'gradient-bar-' + palette}>
              {(new Array(NTICK)).fill(0).map((d, i) => (
                <stop
                  key={`tick-${palette}-${i}`}
                  offset={i*100/(NTICK - 1) + '%'}
                  stopColor={colorScale(adjustingScale(i/(NTICK-1)))}
                />
              ))}
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#gradient-bar-${palette})`} />
        </svg>
      </div>
    );
  }
}

export { GradientBar }