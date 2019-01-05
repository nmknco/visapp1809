import * as d3 from 'd3';
import * as React from 'react';

import { StringRangeScale } from './commons/types';


const NTICK = 10;

interface GradientBarProps {
  readonly scale: StringRangeScale<number>,
  readonly width: number,
  readonly height: number,
}

class GradientBar extends React.PureComponent<GradientBarProps> {

  render() {
    const {scale, width, height} = this.props;
    const convertingScale = d3.scaleLinear()
        .domain([0, 1]).range(scale.domain());
    const id = Math.random() + '';

    return (
      <div
        style={{width, height}}
      >
        <svg width="100%" height="100%">
          <defs>
            <linearGradient id={'gradient-bar-' + id}>
              {(new Array(NTICK)).fill(0).map((d, i) => (
                <stop
                  key={`tick-${i}`}
                  offset={i*100/(NTICK - 1) + '%'}
                  stopColor={scale(convertingScale(i/(NTICK-1)))}
                />
              ))}
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#gradient-bar-${id})`} />
        </svg>
      </div>
    );
  }
}

export { GradientBar }