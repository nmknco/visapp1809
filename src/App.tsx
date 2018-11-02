import * as React from 'react';

import { Attributes } from './Attributes';
import { ColorPicker } from './ColorPicker';
import { Encodings } from './Encodings';
import { FileSelector } from './FileSelector';
import { Filters } from './Filters';
import { RecommendedEncodings } from './RecommendedEncodings';
import { RecommendedFilters } from './RecommendedFilters';

import { FilterList, RecommendedFilter } from './Filter';
import { FilterManager } from './FilterManager';
import { MainPlotter } from './Plotter';

import { FILTER_PANEL_WIDTH } from './commons/constants';
import { Attribute, PointState, PointStateGetter } from './commons/types';
import { ColorUtil, memoizedGetAttributes } from './util';

import {
  ColorPickerStyle, 
  Data,
  DataEntry,
  Field, 
  HandleAcceptRecommendedEncoding,
  HandleAcceptRecommendedFilter,
  HandleDismissAllRecommendations,
  HandleHoverDrop,
  HandleHoverFilter,
  HandleHoverRecommendedEncoding,
  HandleHoverRecommendedFilter,
  HandlePickColor,
  HandleRemoveFilter,
  MinimapScaleMap,
  PlotConfig,
  PlotConfigEntry,
  RecommendedAttrListsByField,
  SetPlotConfig,
  VField,
} from './commons/types';


interface AppProps {
  readonly data: Data,
}

// For all the object states, such as plotConfig or colorPickerStyle,
//  the properties are set as readonly, and
//  a new object is always created when updating its value, 
//  so components receiving them can be PURE.
interface AppState {
  readonly activeEntry: DataEntry | undefined,
  readonly colorPickerStyle: Readonly<ColorPickerStyle>,
  readonly plotConfig: Readonly<PlotConfig>,
  readonly filterList: Readonly<FilterList>,
  readonly minimapScaleMap: Readonly<MinimapScaleMap>,
  readonly isDraggingPoints: boolean,
  readonly isHoveringFilterPanel: boolean,
  readonly recommendedFilters: ReadonlyArray<RecommendedFilter>
  
  // Plotter knows the following but they need to be in the state to call render on change
  readonly hasSelection: boolean,
  readonly hasActiveSelection: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>,
  readonly recommendedAttrListsByField: Readonly<RecommendedAttrListsByField>,
}

class App extends React.Component<AppProps, AppState> {

  private d3ContainerRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private mp: MainPlotter;
  private fm: FilterManager;

  constructor(props: AppProps) {
    super(props);
    this.state = this.createInitialState();
  }

  private createInitialState = (): Readonly<AppState>  => {
    // create a fresh copy of initial state for resetting upon new data
    return {
      activeEntry: undefined,
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      plotConfig: {},
      filterList: [],
      minimapScaleMap: {xScale: null, yScale: null},
      isDraggingPoints: false,
      isHoveringFilterPanel: false,
      recommendedFilters: [],
      hasSelection: false,
      hasActiveSelection: {[VField.COLOR]: false, [VField.SIZE]: false}, // i.e. has visuals set on user selection
      recommendedAttrListsByField: {color: [], size: []},
    }
  }

  private createNewMainPlotter = (): MainPlotter => new MainPlotter(
    this.props.data,
    this.d3ContainerRef.current,
    this.updateColorPicker,
    this.handleHoverDataPoint,
    this.updateRecommendation,
    this.handleChangeVisualByUser, // for resizer, which needs direct interaction with plot
    this.handleDragPointsEnd,
    this.setMinimapScales,
    this.updateHasSelection,
    this.updateHasActiveSelection,
    this.setIsDraggingPoints,
  );

  private setupInitialPlot = () => {
    if (!this.props.data.length) {
      return
    };
    const attrs = memoizedGetAttributes(this.props.data);
    attrs.sort((a1: Attribute, a2: Attribute) => {
      if (a1.type === a2.type || (a1.type !== 'number' && a2.type !== 'number')) {
        return -a1.name.localeCompare(a2.name)
      } else {
        return a1.type === 'number' ? -1 : 1; 
      } 
    });
    this.setPlotConfig(Field.X, new PlotConfigEntry(attrs[0]));
    this.setPlotConfig(Field.Y, new PlotConfigEntry(attrs[attrs.length ? 1 : 0]));
  };

  private initialize = () => {
    this.mp = this.createNewMainPlotter();
    this.setupInitialPlot();
    this.fm = new FilterManager(this.props.data);
  };

  componentDidMount() {
    if (this.props.data) {
      this.initialize();
    }
  }

  componentDidUpdate(prevProps: AppProps) {
    if (prevProps.data !== this.props.data) {
      console.log('App received processed new data');
      this.setState(
        () => this.createInitialState(),
        this.initialize,
      );
    }
  }

  private handleHoverDataPoint = (activeEntry: DataEntry): void => 
    this.setState(() => ({activeEntry}));

  setPlotConfig : SetPlotConfig = (
    field, 
    plotConfigEntry,
    keepSelection, 
    callback,
  ) => {
    const { [Field.X]: prevX, [Field.Y]: prevY } = this.state.plotConfig;

    this.setState((prevState) => ({
      plotConfig: {
        ...prevState.plotConfig,
        [field]: plotConfigEntry,
      }
    }), () => {
      const plotConfig = this.state.plotConfig;
      if (field === Field.X || field === Field.Y) {
        const { [Field.X]: x, [Field.X]: y } = plotConfig;
        this.mp.updatePosition(plotConfig); // updateXY() clears plot if x or y is undefined
        if (!x || !y) {
          this.removeAllFilters();
        }
        if (!(prevX && prevY) && x && y) {
          this.mp.updateVisual(Object.values(VField), plotConfig); // restore color and size
        }
      }
      
      if (field === Field.COLOR || field === Field.SIZE) {
        this.mp.updateVisual([field,], plotConfig, keepSelection);
      }

      if (callback) {
        callback();
      }
    });
  };

  private updateColorPicker = (style: Partial<ColorPickerStyle>) => {
    this.setState((prevState) => (
      {colorPickerStyle: {...prevState.colorPickerStyle, ...style}}
    ));
  };

  // Note: now no need to call updateRecommendation the three methods below
  // as recommendations are sync-ed in ActiveSelectionsWithRec
  private handleChangeVisualByUser = (field: VField, value: string | number) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined, true); // note this now always updates(clears) color
    }
    this.mp.assignVisual(field, value);
  };

  private handlePickColor: HandlePickColor = (colorObj) => {
    this.handleChangeVisualByUser(VField.COLOR, ColorUtil.hslToString(colorObj.hsl))
    this.updateColorPicker({display: 'none'});
  }


  private unVisualAll = (field: VField) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined); // note this now always updates(clears) color
    }
    this.mp.unVisualAll(field);
  };

  private unVisualSelected = (field: VField) => {
    this.mp.unVisualSelected(field);
  };

  private updateHasSelection = (hasSelection: boolean) => {
    this.setState(() => ({hasSelection}))
  };

  private updateHasActiveSelection = (field: VField, hasActiveSelection: boolean) => {
    this.setState((prevState) => ({hasActiveSelection: {
      ...prevState.hasActiveSelection,
      [field]: hasActiveSelection,
    }}));
  };

  private shouldEnableUnVisualSelected = (field: VField) => {
    return !this.state.plotConfig[field] && 
      this.state.hasActiveSelection[field] && this.state.hasSelection;
  };
  private shouldEnableUnVisualAll = (field: VField) => {
    return !this.state.plotConfig[field] && 
      this.state.hasActiveSelection[field];
  };

  private updateRecommendation = (recommendedAttrListsByField: RecommendedAttrListsByField) => {
    this.setState(() => ({recommendedAttrListsByField: {
      ...recommendedAttrListsByField,
    }}));
  };

  // clearRecommendation = () => {
  //   // in principle recommendation should be in sync with the colored groups
  //   // this function may be defined for potential cases where we want to 
  //   // clear recommendations but preserve the color groups backstage.
  // };

  private handleAcceptRecommendeedEncoding: HandleAcceptRecommendedEncoding = (field, attrName) => {
    this.mp.clearSelection();
    this.setPlotConfig(
      field, 
      new PlotConfigEntry(new Attribute(attrName, 'number'), true)
    );
  };

  private handleHoverRecommendedEncoding: HandleHoverRecommendedEncoding = (ev, field, attrName) => {
    if (!this.state.isDraggingPoints) {
      if (ev.type === 'mouseenter') {
        this.mp.updateVisualWithRecommendation(field, attrName);
      } else if (ev.type === 'mouseleave') {
        if (this.state.plotConfig[field]) {
          this.mp.updateVisual([field,], this.state.plotConfig)
        } else {
          this.mp.syncVisualToUserSelection(field);
        }
      }
    }
  };

  private handleDismissAllRecommendedEncodings: HandleDismissAllRecommendations = () => {
    for (const field of Object.values(VField)) {
      this.unVisualAll(field);
    }
  };


  private setIsHoveringFilterPanel = (isHoveringFilterPanel: boolean) => {
    this.setState({isHoveringFilterPanel});
  };

  private setIsDraggingPoints = (isDraggingPoints: boolean) => {
    this.setState({isDraggingPoints});
  };

  private handleHoverDrop: HandleHoverDrop = (ev) => {
    if (ev.type === 'mouseenter') {
      this.setIsHoveringFilterPanel(true);
    } else if (ev.type === 'mouseout') {
      this.setIsHoveringFilterPanel(false);
    }
  }

  private handleDragPointsEnd = (idSetDroppedToFilter: ReadonlySet<number>) => {
    if (this.state.isHoveringFilterPanel) {
      // console.log('Points dropped in filter');
      const recommendedFilters = FilterManager.getRecommendedFilters({
        idSetDroppedToFilter,
        data: this.props.data,
        xAttr: this.state.plotConfig.x && this.state.plotConfig.x.attribute,
        yAttr: this.state.plotConfig.y && this.state.plotConfig.y.attribute,
      })
      this.setState(() => ({recommendedFilters}));
    }
  };

  private syncFilterList = () => {
    this.setState(() => ({
      filterList: this.fm.getFilterListCopy(),
    }));
  }

  private handleAcceptRecommendedFilter: HandleAcceptRecommendedFilter = (filter) => {
    // 1. Add filter
    this.fm.addFilter(filter);
    // 2. Set filterlist 
    this.syncFilterList();
    // 3. Clear recommended filters
    this.clearAllRecommendedFilters();
    // 4. Draw
    this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview());
    // 5. Clean up selections for filtered points.
    this.cleanUpPoints(new Set(this.props.data.filter(filter.filterFn).map(d => d.__id_extra__)));
  };

  private handleHoverRecommendedFilter: HandleHoverRecommendedFilter = (ev, filter) => {
    if (ev.type === 'mouseenter') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnPreviewAdd(filter.filterFn))
    } else if (ev.type === 'mouseleave') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview())
    }
  };

  private clearAllRecommendedFilters = () => {
    this.setState(() => ({recommendedFilters: []}));
  };

  private handleDismissAllRecommendedFilters = () => {
    this.clearAllRecommendedFilters();
  };

  
  private handleHoverFilter: HandleHoverFilter = (ev, filter) => {
    if (ev.type === 'mouseenter') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnPreviewRemove(filter.filterFn))
    } else if (ev.type === 'mouseleave') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview())
    }
  };

  private handleRemoveFilter: HandleRemoveFilter = (fid) => {
    // 1. Remove
    this.fm.removeFilter(fid);
    // 2. Set filterlist
    this.syncFilterList();
    // 3. Draw
    this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview());
  };

  private removeAllFilters = () => {
    this.fm.removeAllFilter();
    this.syncFilterList();
    this.clearAllRecommendedFilters();
  };

  private hideOrDimPointsByState = (getState: PointStateGetter) => {
    const shouldHide = (d: DataEntry) => getState(d) === PointState.FILTERED;
    const shouldDim = (d: DataEntry) => {
      const s = getState(d);
      return s === PointState.TO_FILTER || s === PointState.TO_RESTORE
    }
    this.mp.hideOrDimPoints(shouldHide, shouldDim);
  };

  private cleanUpPoints = (filteredIds: ReadonlySet<number>) => {
    // 1. remove from active selections (and unvisual)
    // Note that operations updating active selection always sync visual 
    //    by design (see Plotter class), thereore we should
    //    do this ONLY WHEN active selection is present so that
    //    no encoding visual is reset
    for (const field of Object.values(VField)) {
      if (this.state.hasActiveSelection[field]) {
        this.mp.unVisualGivenIds(field, filteredIds);
      }
    }
    // 2. clear selection
    this.mp.clearSelection();
  };

  private setMinimapScales = (minimapScaleMap: MinimapScaleMap = {xScale: null, yScale: null}) => {
    this.setState(() => ({minimapScaleMap}));
  };

  render() {
    return (
      <div className="app d-flex m-2">
        <div
          className="left-panel"
        >
          <FileSelector />
          <Attributes 
            attributes={memoizedGetAttributes(this.props.data)}  
            activeEntry={this.state.activeEntry}
          />
        </div>

        <div className="mid-panel">
          <Encodings 
            setPlotConfig={this.setPlotConfig}
            plotConfig={this.state.plotConfig}
          />
          <div ref={this.d3ContainerRef} className="main-plot-container">
            <div style={{height: 0}}>
              <ColorPicker 
                style={this.state.colorPickerStyle} 
                onChangeComplete={this.handlePickColor}
              />
            </div>
          </div>
        </div>
        
        <div
          className="right-panel"
          style={{flex: `0 0 ${FILTER_PANEL_WIDTH}px`}}
        >
          <Filters
            filterList={this.state.filterList}
            minimapScaleMap={this.state.minimapScaleMap}
            onHoverFilter={this.handleHoverFilter}
            onRemoveFilter={this.handleRemoveFilter}
            onHoverDrop={this.handleHoverDrop}
            isDraggingPoints={this.state.isDraggingPoints}
          />
          <RecommendedFilters
            recommendedFilters={this.state.recommendedFilters}
            onAcceptRecommendedFilter={this.handleAcceptRecommendedFilter}
            onHoverRecommendedFilter={this.handleHoverRecommendedFilter}
            onDismissAllRecommendedFilter={this.handleDismissAllRecommendedFilters}
          />
          <RecommendedEncodings
            recommendedAttrListsByField={this.state.recommendedAttrListsByField}
            onAcceptRecommendedEncoding={this.handleAcceptRecommendeedEncoding}
            onHoverRecommendedEncoding={this.handleHoverRecommendedEncoding}
            onDismissAllRecommendedEncodings={this.handleDismissAllRecommendedEncodings}
          />

          {/* for debugging only */}
          {Object.values(VField).map(field => {
            const handleClickClearSelected = () => 
              this.unVisualSelected(field)
            const handleClikcClearAll = () => 
              this.unVisualAll(field)
            return (
              <div key={`clear_${field}`} className="d-flex m-1 py-1">
                <div className="m-1 text-right"> {`Clear my assigned ${field} for`} </div>
                <button
                  disabled={!this.shouldEnableUnVisualSelected(field)}
                  className="btn btn-sm btn-outline-danger m-1"
                  onClick={handleClickClearSelected}
                >
                  {`Selected points`}
                </button>
                <button 
                  disabled={!this.shouldEnableUnVisualAll(field)}
                  className="btn btn-sm btn-outline-danger m-1"
                  onClick={handleClikcClearAll}
                >
                  {`All`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    )
  }
}

export { App };