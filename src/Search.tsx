import * as React from 'react';

import { Panel } from './Panel';

import { 
  HandleInputChange,
  HandleSearchInputChange,
} from './commons/types';


interface SearchProps {
  readonly onSearchInputChange: HandleSearchInputChange,
  readonly resultsIdSet: ReadonlySet<string> | null,
  readonly shouldShowSelectButton: boolean,
  readonly onClickSelectSearchButton: () => void,
  readonly shouldDisableSearch?: boolean
}

class Search extends React.PureComponent<SearchProps> {
  constructor(props: SearchProps) {
    super(props);
  }

  private handleSearchInputChange: HandleSearchInputChange = (keyword) => {
    this.props.onSearchInputChange(keyword);
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
        className="search-panel"
        // noMargin={true}
      >
        <div>
          <div className="p-1">
            <Input 
              onInputChange={this.handleSearchInputChange}
              shouldDisable={this.props.shouldDisableSearch}
            />
          </div>
          { (this.props.resultsIdSet) &&
          <div className="p-1 d-flex align-items-center">
            {this.renderResultText(this.props.resultsIdSet.size)}
            {this.props.shouldShowSelectButton && 
                this.props.resultsIdSet.size > 0 &&
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
  readonly shouldDisable?: boolean,
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

  componentDidUpdate() {
    if (this.props.shouldDisable) {
      this.setState(() => ({value: ''}));
    }
  }

  private handleInputChange = (ev: React.FormEvent<HTMLInputElement>) => {
    const value = ev.currentTarget.value;
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
            disabled={this.props.shouldDisable}
          />
        </label>
      </div>
    );
  }
}

export { Search };