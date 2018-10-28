import * as React from 'react';

import { Attribute, Attributes } from './Attributes';
import { ColorPicker } from './ColorPicker';
import { Description } from './Description';
import { Encodings } from './Encodings';
import { FileSelector } from './FileSelector';
import { Filters } from './Filters';
import { MainPlotter } from './Plotter'
import { RecommendedEncodings } from './RecommendedEncodings';

import { RIGHT_PANEL_WIDTH } from './Constants';
import { ColorUtil, memoizedGetAttributes } from './util';

import {
  ColorObj, 
  ColorPickerStyle, 
  Data,
  Field, 
  HandleAcceptEncoding,
  HandleHoverEncodingCard,
  PlotConfig,
  PlotConfigEntry,
  ScaleMap,
  SetPlotConfig,
  SuggestedAttrListsByField,
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
  readonly activeEntry: object,
  readonly colorPickerStyle: Readonly<ColorPickerStyle>,
  readonly suggestedAttrListsByField: Readonly<SuggestedAttrListsByField>,
  readonly plotConfig: Readonly<PlotConfig>,
  readonly scaleMap: Readonly<ScaleMap>,
  readonly isDraggingPoints: boolean,
  readonly isHoveringFilterPanel: boolean
  readonly idSetPendingFilter: Readonly<Set<number> | null>,
  readonly idSetsFiltered: Readonly<Array<Set<number>>>,
  readonly hasSelection: boolean,
  readonly hasActiveSelection: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>,
}

class App extends React.Component<AppProps, AppState> {

  private d3ContainerRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private mp: MainPlotter;

  constructor(props: AppProps) {
    super(props);
    this.state = this.createInitialState();
  }

  private createInitialState = (): Readonly<AppState>  => {
    // create a fresh copy of initial state for resetting upon new data
    return {
      activeEntry: {},
      colorPickerStyle: {left: 0, top: 0, display: 'none'},
      suggestedAttrListsByField: {color: [], size: []},
      plotConfig: {},
      scaleMap: {xScale: null, yScale: null},
      isDraggingPoints: false,
      isHoveringFilterPanel: false,
      idSetPendingFilter: null,
      idSetsFiltered: [],
      hasSelection: false,
      hasActiveSelection: {[VField.COLOR]: false, [VField.SIZE]: false}, // i.e. has visuals set on user selection
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

  private drawInitialPlot = () => {
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

  private initializePlot = () => {
    this.mp = this.createNewMainPlotter();
    this.drawInitialPlot();
  };

  componentDidMount() {
    if (this.props.data) {
      this.initializePlot();
    }
  }

  componentDidUpdate(prevProps: AppProps) {
    if (prevProps.data !== this.props.data) {
      console.log('App received processed new data');
      this.setState(
        () => this.createInitialState(),
        this.initializePlot,
      );
    }
  }

  handleHoverDataPoint = (activeEntry: object): void => 
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
          this.clearAllFilters();
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

  updateColorPicker = (style: Partial<ColorPickerStyle>) => {
    this.setState((prevState) => (
      {colorPickerStyle: {...prevState.colorPickerStyle, ...style}}
    ));
  };

  hideColorPicker = () => {
    this.updateColorPicker({display: 'none'});
  };

  // Note: now no need to call updateRecommendation the three methods below
  // as recommendations are sync-ed in ActiveSelectionsWithRec
  handleChangeVisualByUser = (field: VField, value: string | number) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined, true); // note this now always updates(clears) color
    }
    this.mp.assignVisual(field, value);
  };

  handlePickColor = (colorObj: ColorObj) => {
    this.handleChangeVisualByUser(VField.COLOR, ColorUtil.hslToString(colorObj.hsl))
  }


  handleClickUnVisualAll = (field: VField) => {
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(field, undefined); // note this now always updates(clears) color
    }
    this.mp.unVisualAll(field);
  };

  handleClickUnVisualSelected = (field: VField) => {
    this.mp.unVisualSelected(field);
  };

  updateHasSelection = (hasSelection: boolean) => {
    this.setState(() => ({hasSelection}))
  };

  updateHasActiveSelection = (field: VField, hasActiveSelection: boolean) => {
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

  updateRecommendation = (suggestedAttrListsByField: SuggestedAttrListsByField) => {
    this.setState(() => ({ suggestedAttrListsByField }));
  };

  // clearRecommendation = () => {
  //   // in principle recommendation should be in sync with the colored groups
  //   // this function may be defined for potential cases where we want to 
  //   // clear recommendations but preserve the color groups backstage.
  // };

  handleAcceptEncoding: HandleAcceptEncoding = (field, attrName) => {
    this.mp.clearSelection();
    this.setPlotConfig(
      field, 
      new PlotConfigEntry(new Attribute(attrName, 'number'), true)
    );
  };

  handleHoverEncodingCard: HandleHoverEncodingCard = (ev, field, attrName) => {
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

  setIsHoveringFilterPanel = (isHoveringFilterPanel: boolean) => {
    this.setState({isHoveringFilterPanel});
  };

  handleDragPointsEnd = (idSetPendingFilter: Set<number>) => {
    if (this.state.isHoveringFilterPanel) {
      // console.log('Drag release in filter');
      this.setState(() => ({idSetPendingFilter}));
    }
  };

  handleAcceptFilter = (filteredIds: Set<number>) => {
    this.filterOutPoints(filteredIds);
    this.setState((prevState) => ({
      idSetPendingFilter: null,
      idSetsFiltered: [...prevState.idSetsFiltered, filteredIds],
    }));
  }

  handleRestoreFilter = (filteredIds: Set<number>) => {
    this.toggleHidePoints(filteredIds, false);
    this.setState((prevState) => {
      // assuming sets are exclusive - so every id can be used as set-id
      const i = filteredIds.values().next().value;
      return {
        idSetsFiltered: prevState.idSetsFiltered.filter(set => !set.has(i))
      }
    });
  }

  handleCancelFilter = () => {
    this.setState(() => ({idSetPendingFilter: null}));
  };


  private clearAllFilters = () => {
    this.setState(() => ({idSetPendingFilter: null, idSetsFiltered: []}));
  }

  private filterOutPoints = (filteredIds: Set<number>) => {
    // 1. hide visual 
    this.toggleHidePoints(filteredIds);
    // 2. remove from active selections (and unvisual)
    // Do this ONLY WHEN active selection is present (so no encoding visual is reset)
    for (const field of Object.values(VField)) {
      if (this.state.hasActiveSelection[field]) {
        this.mp.unVisualGivenIds(field, filteredIds);
      }
    }
    // 3. clear selection 
    this.mp.clearSelection();
  };


  handleHoverFilterCard = (ev: MouseEvent, idSet: Set<number>) => {
    if (ev.type === 'mouseenter') {
      this.toggleDimPoints(idSet, true);
    } else if (ev.type === 'mouseleave') {
      this.toggleDimPoints(idSet, false);
    }
  }

  handleHoverMinimap = (ev: MouseEvent, idSet: Set<number>) => {
    if (ev.type === 'mouseenter') {
      this.toggleHidePoints(idSet, false);
      this.toggleDimPoints(idSet, true);
    } else if (ev.type === 'mouseleave') {
      this.toggleHidePoints(idSet, true); // this will reset dim classes
    }
  }

  toggleHidePoints = (idSet: Set<number>, shouldHide: boolean = true) => {
    this.mp.toggleHideOrDimPoints(idSet, shouldHide);
  };

  toggleDimPoints = (idSet: Set<number>, shouldHide: boolean = true) => {
    this.mp.toggleHideOrDimPoints(idSet, shouldHide, true);
  }


  setMinimapScales = (scaleMap: ScaleMap = {xScale: null, yScale: null}) => {
    this.setState(() => ({scaleMap}));
  };

  setIsDraggingPoints = (isDraggingPoints: boolean) => {
    this.setState({isDraggingPoints});
  }

  render() {
    return (
      <div className="app d-flex m-2">
        <div className="left-panel">
          <FileSelector />
          <Attributes 
            attributes={memoizedGetAttributes(this.props.data)}  
            activeEntry={this.state.activeEntry}
          />
          <Description />
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
                onClick={this.hideColorPicker}
              />
            </div>
          </div>
        </div>
        
        <div 
          className="right-panel" 
          style={{flex: `0 0 ${RIGHT_PANEL_WIDTH}px`}}
        >
          <Filters
            data={this.props.data}
            idSetPendingFilter={this.state.idSetPendingFilter}
            idSetsFiltered={this.state.idSetsFiltered}
            scales={this.state.scaleMap}
            plotConfig={this.state.plotConfig}
            setIsHoveringFilterPanel={this.setIsHoveringFilterPanel}
            onClickAccept={this.handleAcceptFilter}
            onClickCancel={this.handleCancelFilter}
            onHoverCard={this.handleHoverFilterCard}
            onHoverMinimap={this.handleHoverMinimap}
            onClickRestore={this.handleRestoreFilter}
            isDraggingPoints={this.state.isDraggingPoints}
            isHoveringFilterPanel={this.state.isHoveringFilterPanel}
          />
          <RecommendedEncodings
            suggestedAttrListsByField={this.state.suggestedAttrListsByField}
            onClickAccept={this.handleAcceptEncoding}
            onHoverCard={this.handleHoverEncodingCard}
          />

          {/* TODO: Use a drop down for reset options */}
          {Object.values(VField).map(field => {
            const handleClickClearSelected = () => 
              this.handleClickUnVisualSelected(field)
            const handleClikcClearAll = () => 
              this.handleClickUnVisualAll(field)
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

export { PlotConfigEntry, App };