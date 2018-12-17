import * as React from 'react';

import { DoubleSlider } from './DoubleSlider';
import { GradientBar } from './GradientBar';

import {
  D3Interpolate,
  HandleSetColorNumRange,
  HandleSetSizeRange,
} from './commons/types';

interface OverlayMenuContainerProps {
  readonly isHidden: boolean,
  readonly onClose: () => void,
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
  readonly onSetColorNumRange: HandleSetColorNumRange,
}

class OverlayMenuColorNumPage extends React.PureComponent<OverlayMenuColorNumPageProps> {
  
  private paletteList: ReadonlyArray<D3Interpolate> = 
    Object.values(D3Interpolate) as ReadonlyArray<D3Interpolate>;

  private paletteSetters: {[key: string]: () => void}

  constructor(props: OverlayMenuColorNumPageProps) {
    super(props);
    this.paletteSetters = {};
    for (const palette of this.paletteList) {
      this.paletteSetters[palette] = () => this.props.onSetColorNumRange(palette);
    }
  }
  
  render() {
    return (
      <div>
        {this.paletteList.map((palette) => (
          <div
            key={'palette-' + palette}
            className="om-color-num__palatte-item p-1"
            onClick={this.paletteSetters[palette]}
          >
            <GradientBar
              palette={palette}
              width={144}
              height={20}
              range={[0.1, 1]}
            />
          </div>
        ))}
      </div>
    );
  }
}


const SIZE_RANGE: Readonly<[number, number]> = [2, 30]

interface OverlayMenuSizePageProps {
  onSetSizeRange: HandleSetSizeRange,
  currentRange: Readonly<[number, number]>,
}

class OverlayMenuSizePage extends React.PureComponent<OverlayMenuSizePageProps> {
  render() {
    return (
      <div>
        <DoubleSlider
          extent={SIZE_RANGE}
          range={this.props.currentRange}
          onChangeRange={this.props.onSetSizeRange}
          reversed={true}
        />
      </div>
    );
  }
}



export {
  OverlayMenuContainer, 
  OverlayMenuColorNumPage,
  OverlayMenuSizePage,
};