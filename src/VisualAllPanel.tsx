import * as React from 'react';

import { ColorPicker } from './ColorPicker';
import { Panel } from './Panel';

import { DEFAULT_DOT_COLOR } from './commons/constants';
import { 
  HandlePickColor,
} from './commons/types';
import { ColorUtil } from './commons/util';


interface VisualAllPanelProps {
  readonly onPickColor: HandlePickColor,
  readonly onPickSize: (size: number) => void,
  readonly currentSize: number,
}

interface VisualAllPanelState {
  size: number,
}

class VisualAllPanel extends React.PureComponent<VisualAllPanelProps, VisualAllPanelState> {
  constructor(props: VisualAllPanelProps) {
    super(props);
  }

  private handleSizeSliderChange = (ev: React.FormEvent<HTMLInputElement>) => {
    const size = Number(ev.currentTarget.value);
    this.props.onPickSize(size);
  }

  private handleResetColor = () => 
    this.props.onPickColor({hsl: ColorUtil.stringToHSL(DEFAULT_DOT_COLOR)})
  
  render() {
    return (
      <Panel
        heading="Change Color/Size For All"
      >
        <div className="p-1">
          <div className="mb-2">
            <div className="p-1">
              Set Color For All:
            </div>
            <div
              className="d-flex justify-content-center p-1"
              style={{
                height: 88,
              }}
            >
              <ColorPicker
                style={{
                  top: 10,
                  left: 0,
                }} 
                onChangeComplete={this.props.onPickColor}
              />
            </div>
            <div className="d-flex justify-content-center">
              <button
                className="btn btn-sm btn-outline-secondary px-1"
                onClick={this.handleResetColor}
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <div className="p-1">
              Set Size For All:
            </div>
            <div className="d-flex align-items-center py-3 px-1">
              <input
                type="range"
                min="2"
                max="30"
                value={this.props.currentSize}
                onChange={this.handleSizeSliderChange}
              />
              <div className="p-1">{this.props.currentSize}</div>
            </div>
          </div>

        </div>
        
      </Panel>
    );
  }
}

export { VisualAllPanel }