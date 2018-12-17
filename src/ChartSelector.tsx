import * as React from 'react';

import { Panel } from './Panel';

import { ChartType } from './commons/types';


const IMAGE_SOURCES = {
  [ChartType.BAR_CHART]: 'images/showme-bar.png',
  [ChartType.SCATTER_PLOT]: 'images/showme-scatter.png',
}

interface ChartSelectorProps {
  readonly selectedChartType: ChartType,
}

class ChartSelector extends React.PureComponent<ChartSelectorProps> {
  private getImageSrc = (type: ChartType) => IMAGE_SOURCES[type];

  render () {
    console.log('Chart selector panel render');
    return (
      <Panel
        heading="Show Me"
      >
        <div className="p-1 d-flex flex-wrap">
          {Object.values(ChartType).map((type) => (
            <div
              key={'chart-selector-item-' + type}
              className={'chart-selector__item m-1' + (
                type === this.props.selectedChartType ? 
                ' chart-selector__item--selected' : ''
              )}
            >
              <ChartSelectorItem
                imageSrc={this.getImageSrc(type)}
                chartType={type}
              />
            </div>
          ))}
        </div>
      </Panel>
    );
  }
}

interface ChartSelectorItemProps {
  readonly imageSrc: string,
  readonly chartType: ChartType,
}

class ChartSelectorItem extends React.PureComponent<ChartSelectorItemProps> {
  render() {
    console.log('Chart selector item render');
    return (
      <div>
        <div>
          <img
            className="chart-selector__item-image border border-secaondary rounded"
            src={this.props.imageSrc}
            alt={this.props.chartType}
          />
        </div>
      </div>
    );
  }
}

export { ChartSelector };