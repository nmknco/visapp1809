import * as React from 'react';

import { FAButton } from './FAButton';
import { Panel } from './Panel';

import { Attribute } from './Attribute';

import {
  ChartType,
  Data,
  GField,
  NumericRangeScale,
  PlotConfig,
  StringRangeScale,
  VField,
  VisualScaleMap,
  VisualScaleType,
} from './commons/types';
import { sumTo } from './commons/util';

const NUMERIC_W = 144;

interface LegendsProps {
  readonly data: Data,
  readonly visualScaleMap: VisualScaleMap,
  readonly plotConfig: PlotConfig,
  readonly chartType: ChartType,
  readonly onOpenColorNumMenu: () => void,
  readonly onOpenColorOrdMenu: () => void,
  readonly onOpenSizeMenu: () => void,
}


class Legends extends React.PureComponent<LegendsProps> {

  private renderColorNumLegend = (
    cScale: StringRangeScale<number>,
    cAttr: Attribute,
  ) => {

    let cTicks: ReadonlyArray<number> = [];
    const NCTick = 9;
    const cName = cAttr.name;
    const Ticks = [];
    const [min, max] = cScale.domain();
    for (let i = 0; i < NCTick; i++) {
      Ticks.push(min + (max-min)*i/(NCTick-1));
    }
    cTicks = Ticks;

    return (
      <div className="legend__box legend__box--color">
        <div className="py-1">
          {cName}
          <FAButton 
            faName="caret-down"
            onClick={this.props.onOpenColorNumMenu}
            hoverEffect={true}
            size={20}
          />
        </div>
        <div>
          <div>
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
          </div>
        </div>
      </div>
    );
  }

  private renderColorOrdLegend = (
    cScale: StringRangeScale<string>,
    cAttr: Attribute,
  ) => {

    return (
      <div className="legend__box legend__box--color">
        <div className="py-1">{cAttr.name}</div>
        <div>
          {cScale.domain().map((v) =>(
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
      </div>
    );
  }

  private renderSizeLegend = (
    zScale: NumericRangeScale<number>,
    zAttr: Attribute,
    chartType: ChartType,
  ) => {

    const NZTick = 5;
    const zName = zAttr.name;
    const zTicks = [];
    const [min, max] = zScale.domain();
    for (let i = 0; i < NZTick; i++) {
      zTicks.push(min + (max-min)*i/(NZTick-1));
    }
    const zValues = zTicks.map(zScale)
    const [minr, maxr] = zScale.range();

    const padding = 10;

    if (chartType === ChartType.SCATTER_PLOT) {
      return (
        <div className="legend__box legend__box--size">
          <div className="py-1">
            {zName} 
            <FAButton 
              faName="caret-down"
              onClick={this.props.onOpenSizeMenu}
              hoverEffect={true}
              size={20}
            />
          </div>
          <div>
            <svg width="184" height={(minr + maxr + padding) * 5 + 24}>
              <g transform={`translate(32, ${16 + minr / 2})`}>
                {zTicks.map((t, i) => {
                  return (
                    <g
                      key={'tick-' + t}
                      transform={`translate(0, ${sumTo(zValues, i + 1)*2 - zValues[i] + padding*i})`}
                    >
                      <text
                        key={'tick-text-'+t}
                        y={2}
                        textAnchor="end"
                        alignmentBaseline="middle"
                      >
                        {Number(t.toPrecision(3))}
                      </text>
                      <circle
                        className="circle circle-ring"
                        stroke="#999999"
                        cx={zScale(t) + 10}
                        r={zScale(t)}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      );
    } else if (chartType === ChartType.BAR_CHART) {
      const barH = 24;
      return (
        <div className="legend__box legend__box--size">
          <div className="py-1">
            {zName} 
            <FAButton 
              faName="caret-down"
              onClick={this.props.onOpenSizeMenu}
              hoverEffect={true}
              size={20}
            />
          </div>
          <div>
            <svg width="184" height={(barH + padding) * 5 + 24}>
              <g transform={`translate(32, 16)`}>
                  {zTicks.map((t, i) => {
                    return (
                      <g
                        key={'tick-' + t}
                        transform={`translate(0, ${(barH + padding) * i})`}
                      >
                        <text
                          key={'tick-text-'+t}
                          y={barH / 2}
                          textAnchor="end"
                          alignmentBaseline="middle"
                        >
                          {Number(t.toPrecision(3))}
                        </text>
                        <rect
                          className="circle circle-ring"
                          stroke="#999999"
                          height={barH}
                          x={16}
                          width={zScale(t)}
                        />
                      </g>
                    );
                  })}
              </g>
            </svg>
          </div>
        </div>
      );     
    }
    return;
  }

  
  render() {
    const {visualScaleMap: vs, plotConfig: pc} = this.props;
    const cnScale = vs[VisualScaleType.COLOR_NUM];
    const coScale = vs[VisualScaleType.COLOR_ORD];
    const cEntry = this.props.chartType === ChartType.BAR_STACK ? pc[GField.GROUP] : pc[VField.COLOR];
    // console.log(cEntry)
    const cType = this.props.chartType === ChartType.BAR_STACK ?
        VisualScaleType.COLOR_ORD :
        (cEntry && (cEntry.attribute.type === 'number' ?
          VisualScaleType.COLOR_NUM : VisualScaleType.COLOR_ORD))

    const zScale = vs[VField.SIZE];
    const zEntry = pc[VField.SIZE];


    return (
      <Panel
        className="legends-panel"
        // heading="Legends"
      >
        <div className="ml-2">
          <div className="p-1">{}</div>
          <div className="p-1 legends__container legends__container--color">
            {
              cType === VisualScaleType.COLOR_NUM && cEntry && cnScale && 
                this.renderColorNumLegend(cnScale, cEntry.attribute)
            }
            {
              cType === VisualScaleType.COLOR_ORD && cEntry && coScale && 
                this.renderColorOrdLegend(coScale, cEntry.attribute)
            }
          </div>
          <div className="p-1 legends__container legends__container--size">
            {zScale && zEntry &&
              this.renderSizeLegend(zScale, zEntry.attribute, this.props.chartType)
            }
          </div>
        </div>
      </Panel>
    );
  }
}

export { Legends }