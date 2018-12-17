import * as React from 'react';

import { Pos, Rect, SelUtil } from './commons/util';

export const SLIDERW = 200;
export const SLIDERH = 8;
export const SLIDERHANDLESZIE = 16;

interface DoubleSliderProps {
  readonly extent: Readonly<[number, number]>,
  readonly range: Readonly<[number, number]>,
  readonly onChangeRange: (range: Readonly<[number, number]>) => void,
  readonly reversed?: boolean
}

class DoubleSlider extends React.PureComponent<DoubleSliderProps> {
  private readonly sliderBoxRef: React.RefObject<HTMLDivElement>;
  private isSliding: boolean;
  private slidingHandle: 'left' | 'right' | null;
  
  // the difference between mouse and handle center pos when sliding starts
  private startingOffset: Pos | null;

  private readonly sliderY: number= 20;
  private readonly sliderX: number= 10;

  constructor(props: DoubleSliderProps) {
    super(props);
    this.sliderBoxRef = React.createRef();
    this.initializeStates();
  }

  componentDidMount() {
    this.setUpDragListeners();
  }

  componentWillUnmount() {
    this.cleanUpDragListeners();
  }

  render() {
    const [lo, hi] = this.props.range;
    
    const handleStyle = {
      width: SLIDERHANDLESZIE,
      height: SLIDERHANDLESZIE,
      borderRadius: SLIDERHANDLESZIE / 2,
    }

    return(
      <div className="p-1">
        <div
          ref={this.sliderBoxRef}
          className="slider__container"
          style={{ width: SLIDERW, }}
        >
          <div
            className="slider__bg rounded border border-light"
            style={{
              width: '100%',
              height: SLIDERH,
              left: this.sliderX,
              top: this.sliderY - SLIDERH / 2,
            }}
          >
            <div 
              className="slider__overlay-container rounded"
            >
              {
                [0, this.scale(lo), this.scale(hi), SLIDERW].map((d, i, arr) => {
                  if (i < 3) {
                    return (
                      <div
                        key={i} // fixed array elements
                        className={`slider__overlay slider__overlay--${(i === 1) === !!this.props.reversed ? 'incl' : 'excl'} rounded`}
                        style={{
                          width: arr[i+1] - d,
                          left: d,
                        }}
                      />
                    );
                  } else {
                    return;
                  }
                })
              }
            </div>
          </div>

          <div
            className="slider__handle slider__handle__left"
            style={{
              ...handleStyle,
              left: this.sliderX + this.scale(lo) - SLIDERHANDLESZIE / 2,
              top: this.sliderY - SLIDERHANDLESZIE / 2 + 1,
            }}
            onMouseDown={this.handleMouseDownLeft}
          >
            <div className="slider__handle-label slider__handle-label--left">
              {Number(lo.toPrecision(3))}
            </div>
          </div>
          <div 
            className="slider__handle slider__handle__right"
            style={{
              ...handleStyle,
              left: this.sliderX + this.scale(hi) - SLIDERHANDLESZIE / 2,
              top: this.sliderY - SLIDERHANDLESZIE / 2 - 2,
            }}
            onMouseDown={this.handleMouseDownRight}
          >
            <div className="slider__handle-label slider__handle-label--right">
              {Number(hi.toPrecision(3))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  private initializeStates = () => {
    this.isSliding = false;
    this.slidingHandle = null;
    this.startingOffset = null;
  };

  private scale = (val: number): number => {
    const [min, max] = this.props.extent;
    const px = SLIDERW * (val - min) / (max - min);
    return px;
  };

  private invert = (px: number): number => {
    const [min, max] = this.props.extent;
    const val = min + (px / SLIDERW) * (max - min);
    return val;
  };

  private handleMouseDown = (ev: React.MouseEvent<Element>, slidingHandle: 'left' | 'right') => {
    ev.preventDefault();
    this.isSliding = true;
    this.slidingHandle = slidingHandle;
    // startingOffset is set when the first move event fires.
  };

  private handleMouseDownLeft = (ev: React.MouseEvent<Element>) => this.handleMouseDown(ev, 'left');

  private handleMouseDownRight = (ev: React.MouseEvent<Element>) => this.handleMouseDown(ev, 'right');
  
  private handleMouseMove = (ev: MouseEvent) => {
    if (this.isSliding && this.slidingHandle && this.sliderBoxRef.current) {
      const sliderBox = this.sliderBoxRef.current;
      let [lo, hi] = this.props.range;
      const evPosRelative = SelUtil.getPosRelativeToBox(
        new Pos(ev.clientX, ev.clientY),
        sliderBox
      );
      if (!this.startingOffset) {
        // Use the position of mouse relative to handle center as the offset,
        //    and this will be the reference point for computing the "effective" current mouse pos)
        // Both are absolute positions
        const handlePosRelative = new Pos(
           this.slidingHandle === 'left' ? this.scale(lo) : this.scale(hi),
           this.sliderY - SLIDERHANDLESZIE / 2,
        );
        this.startingOffset = evPosRelative.relativeTo(handlePosRelative)
      } else {
        const evPosClippedRelative = 
          SelUtil.clipRelativePosition(
            evPosRelative,
            sliderBox,
          ).clipToRect(
            // clip to the current range so that two handles won't cross
            //  (y will be clipped to 0)
            new Rect(
              new Pos(this.slidingHandle === 'left' ? 0 : this.scale(lo), 0), 
              new Pos(this.slidingHandle === 'right' ? sliderBox.offsetWidth : this.scale(hi), 0)
            )
          );
        const {x} = evPosClippedRelative;
        if (this.slidingHandle === 'left') {
          lo = this.invert(x);
        } else {
          hi = this.invert(x);
        }
        this.props.onChangeRange([lo, hi]);
      }
    }
  };

  private handleMouseUp = (ev: MouseEvent) => {
    console.log('mouseup event for filter - this should be cleaned up')
    if (this.isSliding) {
      this.initializeStates();
    }
  };

  private setUpDragListeners = () => {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  private cleanUpDragListeners = () => {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

}

export { DoubleSlider }