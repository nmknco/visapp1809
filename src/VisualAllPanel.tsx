import * as React from 'react';

import { RectPopupColorPicker } from './ColorPicker';
import { Panel } from './Panel';

import { DEFAULT_DOT_COLOR } from './commons/constants';
import { 
  HandlePickColor,
} from './commons/types';
import { ColorUtil } from './commons/util';


interface VisualAllPanelProps {
  readonly onPickColor: HandlePickColor,
  readonly onPickSize: (size: number) => void,
  readonly currentDefaultSize: number,
  readonly currentDefaultColor: string,
}

class VisualAllPanel extends React.PureComponent<VisualAllPanelProps> {
  constructor(props: VisualAllPanelProps) {
    super(props);
    this.state = {
      useInitialColor: true,
    };
  }

  private handleSizeSliderChange = (ev: React.FormEvent<HTMLInputElement>) => {
    const size = Number(ev.currentTarget.value);
    this.props.onPickSize(size);
  }
  
  private handleResetColor = () => {
    // Reset to the "default default"
    this.props.onPickColor({hsl: ColorUtil.stringToHSL(DEFAULT_DOT_COLOR)});
    this.setState(() => ({useInitialColor: true}));
  }

  
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
              }}
            >
              <RectPopupColorPicker
                width={25}
                height={25}
                currentColor={this.props.currentDefaultColor}
                onPickColor={this.props.onPickColor}
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
                value={this.props.currentDefaultSize}
                onChange={this.handleSizeSliderChange}
              />
              <div className="p-1">{this.props.currentDefaultSize}</div>
            </div>
          </div>

        </div>
        
      </Panel>
    );
  }
}

export { VisualAllPanel }