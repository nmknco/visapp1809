import * as React from 'react';

import { RectPopupColorPicker } from './ColorPicker';
import { DoubleSlider } from './DoubleSlider';
import { GradientBar } from './GradientBar';

import {
  ChartType,
  ColorNumRange,
  HandleSetColorNumRange,
  HandleSetSizeRange,
  StringRangeScale,
} from './commons/types';
import { ColorObj, ColorUtil } from './commons/util';

interface OverlayMenuContainerProps {
  readonly isHidden: boolean;
  readonly onClose: () => void;
}

class OverlayMenuContainer extends React.PureComponent<OverlayMenuContainerProps> {
  
  render() {
    return (
      <div 
        className="overlay-menu__container"
        hidden={this.props.isHidden}
      >
        <div className="d-flex justify-content-center align-items-center h-100">
          <div className="overlay-menu__content p-4 rounded">
            <div className="d-flex justify-content-center">
              {this.props.children}
            </div>
            <div className="d-flex justify-content-center p-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={this.props.onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}


interface OverlayMenuColorNumPageProps {
  readonly range: ColorNumRange;
  readonly scale: StringRangeScale<number>;
  readonly onSetColorNumRange: HandleSetColorNumRange;
}

const COLORNUMHEIGHT = 30;

class OverlayMenuColorNumPage extends React.PureComponent<OverlayMenuColorNumPageProps> {

  private handlePickColor = (colorObj: ColorObj, index: number) => {
    const range = [...this.props.range];
    range[index] = ColorUtil.hslToString(colorObj.hsl);
    this.props.onSetColorNumRange(range as ColorNumRange);
  }

  private handlePickColorMin = (colorObj: ColorObj) => this.handlePickColor(colorObj, 0);

  private handlePickColorMax = (colorObj: ColorObj) => this.handlePickColor(colorObj, 1);

  render() {
    return (
      <div>
        <div className="d-flex">
          <div className="p-1 mx-2">
            <RectPopupColorPicker
              width={COLORNUMHEIGHT}
              height={COLORNUMHEIGHT}
              currentColor={this.props.range[0]}
              onPickColor={this.handlePickColorMin}
            />
          </div>
          <div className="p-1">
            <GradientBar
              scale={this.props.scale}
              width={144}
              height={COLORNUMHEIGHT}
            />
          </div>
          <div className="p-1 mx-2">
            <RectPopupColorPicker
              width={COLORNUMHEIGHT}
              height={COLORNUMHEIGHT}
              currentColor={this.props.range[1]}
              onPickColor={this.handlePickColorMax}
            />
          </div>
        </div>
        <div className="d-flex justify-content-between">
          <div className="px-2 mx-2">Min</div>
          <div className="px-2 mx-2">Max</div>
        </div>
      </div>
    );
  }
}



interface OverlayMenuSizePageProps {
  onSetSizeRange: HandleSetSizeRange;
  currentRange: Readonly<[number, number]>;
  maxRange: Readonly<[number, number]>;
}

class OverlayMenuSizePage extends React.PureComponent<OverlayMenuSizePageProps> {
  render() {
    return (
      <div>
        <DoubleSlider
          extent={this.props.maxRange}
          range={this.props.currentRange}
          onChangeRange={this.props.onSetSizeRange}
          reversed={true}
        />
      </div>
    );
  }
}

interface OverlayMenuAffordancePageProps {
  chartType: ChartType;
  onClickDisableAffordance: (chartType: ChartType) => void;
}

class OverlayMenuAffordancePage extends React.PureComponent<OverlayMenuAffordancePageProps> {
  private handleClickDisableAffordance = () => 
    this.props.onClickDisableAffordance(this.props.chartType);

  render() {
    const files = {
      [ChartType.BAR_CHART]: 'thumbnail_affordance1.png',
      [ChartType.SCATTER_PLOT]: 'thumbnail_affordance2.png',
    }
    return (
      <div className="">
        <img src={'images/' + files[this.props.chartType]} />
        <div className="d-flex justify-content-center p-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={this.handleClickDisableAffordance}
          >
            Close and do not show this tip again
          </button>
        </div>
      </div>
    );
  }
}



export {
  OverlayMenuContainer,
  OverlayMenuColorNumPage,
  OverlayMenuSizePage,
  OverlayMenuAffordancePage,
};