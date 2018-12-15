import * as React from 'react';

import { Panel } from './Panel';

import { PlotConfigEntry } from './PlotConfigEntry';

import { memoizedGetExtent, memoizedGetUniqueValueList } from './commons/memoized';
import {
  Data,
  NumericRangeScale,
  PlotConfig,
  StringRangeScale,
  VField,
  VisualScaleMap,
} from './commons/types';

const NUMERIC_W = 144;

interface LegendsProps {
  data: Data,
  visualScaleMap: VisualScaleMap,
  plotConfig: PlotConfig,
}

class Legends extends React.PureComponent<LegendsProps> {

  private renderColorLegend = (
    cScale: StringRangeScale<number | string>,
    cEntry: PlotConfigEntry,
  ) => {
    if (!cScale || !cEntry) { return; }


    const data = this.props.data;
    let cTicks: ReadonlyArray<number | string> = [];
    const NCTick = 9;
    const cAttrName = cEntry.attribute.name;
    const valueType = typeof data[0][cAttrName];
    if (valueType === 'number') {
      const Ticks = [];
      const [min, max] = memoizedGetExtent(data, cAttrName);
      for (let i = 0; i < NCTick; i++) {
        Ticks.push(min + (max-min)*i/(NCTick-1));
      }
      cTicks = Ticks;
    } else {
      cTicks = memoizedGetUniqueValueList(data, cAttrName);
    }

    return (
      <div className="legend__box legend__box--color">
        <div className="py-1">{cAttrName}</div>
        {valueType === 'number' ?
          (
            <svg width={NUMERIC_W + 40} height="60">
              <g transform="translate(16, 4)">
                <defs>
                  <linearGradient id="color-scale-gradient">
                    {cTicks.map((t, i) => (
                      <stop
                        key={'tick-' + t}
                        offset={i*100/(NCTick - 1) + '%'}
                        stopColor={cScale(t)}
                      />
                    ))}
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width={NUMERIC_W} height="20" 
                  fill="url(#color-scale-gradient)"
                />
                <g transform="translate(0, 36)">
                  {cTicks
                    .map((t, i) => {
                      if (i % 2 === 0) {
                        return (
                          <text
                            key={'tick-text-'+t}
                            x={NUMERIC_W * i/(NCTick - 1)}
                            textAnchor="middle"
                          >
                            {typeof t === 'number' && Number(t.toPrecision(3))}
                          </text>
                        );
                      }
                      return;
                    })
                  }
                </g>
              </g>
            </svg>
          ) : (
            <div>
              {cTicks.map((v) =>(
                <div
                  key={'tick-v-' + v}
                  className="d-flex"
                >
                  <div style={{minWidth: 20}}>
                    <svg width="20" height="20">
                      <g>
                        <rect
                          y="2"
                          width="15"
                          height="15"
                          fill={cScale(v)} 
                        />
                      </g>
                    </svg>
                  </div>
                  <div className='px-1'>{v}</div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    );
  }

  private renderSizeLegend = (
    zScale: NumericRangeScale,
    zEntry: PlotConfigEntry,
  ) => {
    if (!zScale || !zEntry) { return; }

    const data = this.props.data;
    let zTicks: ReadonlyArray<number> = [];
    const NZTick = 5;
    const zAttrName = zEntry.attribute.name;
    const Ticks = [];
    const [min, max] = memoizedGetExtent(data, zAttrName);
    for (let i = 0; i < NZTick; i++) {
      Ticks.push(min + (max-min)*i/(NZTick-1));
    }
    zTicks = Ticks;

    return (
      <div className="legend__box legend__box--color">
        <div className="py-1">{zAttrName}</div>
        <svg width="184" height="100">
          <g transform="translate(16, 16)">
            <g>
              {zTicks.map((t, i) => (
                <g
                  key={'tick-' + t}
                  transform={`translate(${NUMERIC_W * i/(NZTick - 1)}, 0)`}
                >
                  <circle
                    className="circle circle-ring"
                    stroke="#999999"
                    r={zScale(t)}
                  />
                </g>
              ))}
            </g>
            <g transform="translate(0, 32)">
              {zTicks
                .map((t, i) => {
                  if (i % 1 === 0) {
                    return (
                      <text
                        key={'tick-text-'+t}
                        x={NUMERIC_W * i/(NZTick - 1)}
                        textAnchor="middle"
                      >
                        {Number(t.toPrecision(3))}
                      </text>
                    );
                  }
                  return;
                })
              }
            </g>
          </g>
        </svg>
      </div>
    );
  }
  
  render() {
    const {visualScaleMap: vs, plotConfig: pc} = this.props;
    const cScale = vs[VField.COLOR];
    const cEntry = pc[VField.COLOR];
    const zScale = vs[VField.SIZE];
    const zEntry = pc[VField.SIZE];

    return (
      <Panel
        className="legends-panel"
        heading="Legends"
      >
        <div className="">
          <div className="p-1">{}</div>
          <div className="p-1 legends__container legends__container--color">
            {cScale && cEntry &&
              this.renderColorLegend(cScale, cEntry)
            }
          </div>
          <div className="p-1 legends__container legends__container--size">
            {zScale && zEntry &&
              this.renderSizeLegend(zScale, zEntry)
            }
          </div>
        </div>
      </Panel>
    );
  }
}

export { Legends }