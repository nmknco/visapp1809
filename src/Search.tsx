import * as React from 'react';

import { Panel } from './Panel';

import { 
  HandleInputChange,
  HandleSearchChange,
} from './commons/types';


interface SearchProps {
  readonly onSearchChange: HandleSearchChange,
  readonly resultsIdSet: ReadonlySet<number> | null,
  readonly shouldShowSelectButton: boolean,
  readonly onClickSelectSearchButton: () => void,
}

class Search extends React.PureComponent<SearchProps> {
  constructor(props: SearchProps) {
    super(props);
  }

  private handleSearchChange: HandleSearchChange = (keyword) => {
    this.props.onSearchChange(keyword);
  }

  private renderResultText = (count: number) => {
    return count ? 
    `${count} results are found.` :
    `No result is found.`;
  };

  render() {
    console.log('Search panel render');
    return (
      <Panel
        heading="Search"
      >
        <div>
          <div className="p-1">
            <Input 
              onInputChange={this.handleSearchChange}
            />
          </div>
          { (this.props.resultsIdSet) &&
          <div className="p-1 d-flex align-items-center">
            {this.renderResultText(this.props.resultsIdSet.size)}
            {this.props.shouldShowSelectButton &&
              <button
                className="btn btn-sm btn-outline-info ml-2"
                type="button"
                onClick={this.props.onClickSelectSearchButton}
              >
                Select Results
              </button>
            }
          </div>
          }
        </div>
      </Panel>
    );
  }
}


interface InputProps {
  readonly onInputChange: HandleInputChange,
}

interface InputState {
  readonly value: string,
}

class Input extends React.PureComponent<InputProps, InputState>{
  constructor(props: InputProps) {
    super(props);
    this.state = {
      value: '',
    };
  }

  private handleInputChange = (ev: React.FormEvent<HTMLInputElement>) => {
    const value = ev.currentTarget.value
    this.setState(() => ({ value }));
    this.props.onInputChange(value);
  };

  render() {
    return (
      <div className="w-100">
        <label htmlFor="search">
          <input
            className="search--input"
            type="text"
            value={this.state.value}
            onChange={this.handleInputChange}
            placeholder="e.g. 1980, toyota, japan"
          />
        </label>
      </div>
    );
  }
}

export { Search };