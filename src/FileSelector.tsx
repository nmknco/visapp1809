import * as React from 'react';

import { Panel } from './Panel';

import { FILES } from './commons/constants';
import { HandleUpdateDataFile } from './commons/types';

interface FileSelectorProps {
  readonly currentFile: string;
  readonly onUpdateDataFile: HandleUpdateDataFile;
}

class FileSelector extends React.PureComponent<FileSelectorProps> {
  private clickHandler: {[key: string]: () => void} = {};
  
  constructor(props: FileSelectorProps) {
    super(props);
    for (const fn of FILES) {
      this.clickHandler[fn] = () => this.props.onUpdateDataFile(fn);
    }
  }

  render() {
    return (
      <Panel 
        className="file_selector"
        heading="Data"
        noMargin={true}
      >
        {FILES.map(fn => {
          return (
            <div
              className="file-item p-1"
              style={{border: fn === this.props.currentFile ? '1px gray solid' : 'none'}}
              key={fn}
              onClick={this.clickHandler[fn]}
            >
              {fn}
            </div>
          )
        })}
      </Panel>
    );
  }
}

export { FileSelector }