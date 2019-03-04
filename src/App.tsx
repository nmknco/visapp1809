import * as React from 'react';

import { Attributes } from './Attributes';
import { ChartSelector } from './ChartSelector';
import { ColorPicker, LIT, SAT } from './ColorPicker';
import { Dropdown } from './DropDown';
import { Encodings } from './Encodings';
import { FAButton } from './FAButton';
import { FileSelector } from './FileSelector';
import { Filters } from './Filters';
import { Legends } from './Legends';
import {
  OverlayMenuAffordancePage,
  OverlayMenuColorNumPage,
  OverlayMenuContainer,
  OverlayMenuSizePage,
} from './OverlayMenus';
import { RecommendedEncodings } from './RecommendedEncodings';
import { RecommendedFilters } from './RecommendedFilters';
import { RecommendedOrders } from './RecommendedOrders';
import { Search } from './Search';

import { Attribute } from './Attribute';
import { BarPlotter } from './BarPlotter';
import { BarStackPlotter } from './BarStackPlotter';
import { DragAnimator } from './DragAnimator';
import { FilterList, RecommendedFilter } from './Filter';
import { FilterManager } from './FilterManager';
import { PlotConfigEntry } from './PlotConfigEntry'
import { MainPlotter } from './Plotter';
import { Searcher } from './Searcher';

import {
  DEBUG,
  DEFAULT_BAR_COLOR,
  DEFAULT_BAR_SIZE,
  DEFAULT_BAR_SIZE_RANGE,
  DEFAULT_DOT_COLOR,
  DEFAULT_DOT_SIZE,
  DEFAULT_DOT_SIZE_RANGE,
  FILTER_PANEL_WIDTH,
  INITIAL_ATTR,
  MAX_BAR_SIZE_RANGE,
  MAX_DOT_SIZE_RANGE,
} from './commons/constants';
import { ElementNotFoundError } from './commons/errors';
import {
  memoizedGetAttributes,
} from './commons/memoized';
import {
  ChartType,
  ColorNumRange,
  ColorPickerStyle, 
  D3Scheme,
  Data,
  DataEntry,
  DefaultVisualValues,
  GField,
  HandleAcceptRecommendedEncoding,
  HandleAcceptRecommendedFilter,
  HandleAcceptRecommendedOrder,
  HandleAddFilter,
  HandleChangeVisualByUser,
  HandleDismissAllRecommendations,
  HandleDismissRecommendedEncoding,
  HandleDismissRecommendedFilter,
  HandleDismissRecommendedOrder,
  HandleFilterListChange,
  HandleHoverDrop,
  HandleHoverFilter,
  HandleHoverRecommendedEncoding,
  HandleHoverRecommendedFilter,
  HandlePickColor,
  HandleRemoveFilter,
  HandleSearchInputChange,
  HandleSelectChartType,
  HandleSetFilter,
  HandleUpdateDataFile,
  Order,
  OverlayMenu,
  PField,
  PlotConfig,
  PointState,
  PointStateGetter,
  RecommendedEncoding,
  SetPlotConfig,
  SetVisualScales,
  ToggleColorPicker,
  UpdateRecommendedEncodings,
  UpdateRecommendedOrders,
  VField,
  VisualScaleMap,
  VisualScaleRanges,
  VisualScaleType,
} from './commons/types';
import { ColorUtil, HSLColor, SelUtil } from './commons/util';


interface AppProps {
  readonly data: Data;
  readonly fileName: string;
  readonly onUpdateDataFile: HandleUpdateDataFile;
}

// For all the object states, such as plotConfig or colorPickerStyle,
//  the properties are set as readonly, and
//  a new object is always created when updating its value, 
//  so components receiving them can be PURE.
interface AppState {
  readonly activeEntry: DataEntry | undefined;
  readonly colorPickerStyle: Readonly<ColorPickerStyle>;
  readonly plotConfig: Readonly<PlotConfig>;
  readonly filterList: Readonly<FilterList>;
  readonly filteredIds: ReadonlySet<string>;
  readonly visualScaleMap: Readonly<VisualScaleMap>;
  readonly visualScaleRanges: Readonly<VisualScaleRanges>;
  readonly isDragging: boolean;
  readonly isHoveringFilterPanel: boolean;
  readonly recommendedFilters: ReadonlyArray<RecommendedFilter>;

  readonly chartType: ChartType;

  readonly activeOverlayMenu: OverlayMenu | null;
  readonly showAffordance: {[ChartType.SCATTER_PLOT]: boolean, [ChartType.BAR_CHART]: boolean};

  readonly defaultVisualValues: DefaultVisualValues;
  
  // Plotter knows the following but they need to be in the state to trigger render on change
  readonly hasSelection: boolean;
  readonly hasActiveSelection: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>;
  readonly recommendedEncodings: ReadonlyArray<RecommendedEncoding>;

  readonly recommendedOrders: ReadonlyArray<Order>;
  
  readonly searchResultsIdSet: ReadonlySet<string> | null; // null for empty keyword
  readonly isSearchResultSelected: boolean;

  readonly shouldHideCustomAttrTag: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>;
}

class App extends React.PureComponent<AppProps, AppState> {

  private d3ContainerRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private mp: MainPlotter;
  private fm: FilterManager;
  private searcher: Searcher;

  private bp: BarPlotter;
  private bsp: BarStackPlotter;

  private plt: MainPlotter | BarPlotter | BarStackPlotter;

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
      filteredIds: new Set(),
      visualScaleMap: {
        [VisualScaleType.COLOR_NUM]: null,
        [VisualScaleType.COLOR_ORD]: null,
        [VisualScaleType.SIZE]: null,
      },
      visualScaleRanges: {
        [VisualScaleType.COLOR_NUM]: [
          ColorUtil.hslToString(new HSLColor(5, SAT, LIT)), 
          ColorUtil.hslToString(new HSLColor(275, SAT, LIT))
        ],
        [VisualScaleType.COLOR_ORD]: D3Scheme.CATEGORY10,
        [VisualScaleType.SIZE]: DEFAULT_DOT_SIZE_RANGE,
      },
      isDragging: false,
      isHoveringFilterPanel: false,
      recommendedFilters: [],
      chartType: ChartType.SCATTER_PLOT,
      activeOverlayMenu: null,
      showAffordance: {[ChartType.BAR_CHART]: true, [ChartType.SCATTER_PLOT]: true},
      defaultVisualValues: {[VField.COLOR]: DEFAULT_DOT_COLOR, [VField.SIZE]: DEFAULT_DOT_SIZE},
      hasSelection: false,
      hasActiveSelection: {[VField.COLOR]: false, [VField.SIZE]: false}, // i.e. has visuals set on user selection
      recommendedEncodings: [],
      recommendedOrders: [],
      searchResultsIdSet: null,
      isSearchResultSelected: false,
      shouldHideCustomAttrTag: {[VField.COLOR]: false, [VField.SIZE]: false}
    }
  }

  private createNewMainPlotter = (): MainPlotter => new MainPlotter(
    this.props.data,
    this.d3ContainerRef.current,
    this.updateColorPicker,
    this.handleHoverDataPoint,
    this.updateRecommendedEncodings,
    this.handleChangeVisualByUser, // for resizer, which needs direct interaction with plot
    this.handleDragEnd,
    this.setVisualScales,
    this.updateHasSelection,
    this.updateHasActiveSelection,
    this.setIsDragging,
    this.onSelectionChange,
    this.getVisualScaleRange,
    this.getDefaultVisualValue,
  );

  private createNewBarPlotter = (): BarPlotter => {
    if (!this.d3ContainerRef.current) {
      throw new ElementNotFoundError();
    }
    return new BarPlotter(
      this.props.data,
      this.d3ContainerRef.current,
      this.toggleColorPicker,
      this.updateRecommendedEncodings,
      this.updateRecommendedOrder,
      this.setVisualScales,
      this.getVisualScaleRange,
      this.getDefaultVisualValue,
      this.handleChangeVisualByUser,
      this.setIsDragging,
      this.handleDragBarsEnd,
    );
  };

  private createNewBarStackPlotter = (): BarStackPlotter => {
    if (!this.d3ContainerRef.current) {
      throw new ElementNotFoundError();
    }
    return new BarStackPlotter(
      this.props.data,
      this.d3ContainerRef.current,
      this.setVisualScales,
      this.getVisualScaleRange,
      this.getDefaultVisualValue,
    );
  }

  private setupInitialMainPlot = () => {
    if (!this.props.data.length) {
      return;
    };
    // const attrs = [
    //   ...memoizedGetAttributes(this.props.data)
    // ].sort((a1: Attribute, a2: Attribute) => {
    //   if (a1.type === a2.type || (a1.type !== 'number' && a2.type !== 'number')) {
    //     return -a1.name.localeCompare(a2.name)
    //   } else {
    //     return a1.type === 'number' ? -1 : 1; 
    //   } 
    // });
    this.setPlotConfig(VField.COLOR, undefined);
    this.setPlotConfig(VField.SIZE, undefined);
    // this.setPlotConfig(PField.X, new PlotConfigEntry(attrs[0]));
    // this.setPlotConfig(PField.Y, new PlotConfigEntry(attrs[attrs.length ? 1 : 0]));
    this.setPlotConfig(PField.X, new PlotConfigEntry(INITIAL_ATTR[this.props.fileName][PField.X]));
    this.setPlotConfig(PField.Y, new PlotConfigEntry(INITIAL_ATTR[this.props.fileName][PField.Y]));
    this.setPlotConfig(GField.GROUP, undefined);

  };

  private setupAndRedrawMainPlot = () => {
    this.dropCustomScales();
    this.setState(
      prevState => ({
        visualScaleRanges: {
          ...prevState.visualScaleRanges,
          [VisualScaleType.SIZE]: DEFAULT_DOT_SIZE_RANGE,
        },
        defaultVisualValues: {
          [VField.COLOR]: DEFAULT_DOT_COLOR, 
          [VField.SIZE]: DEFAULT_DOT_SIZE,
        },
      }),
      () => this.mp.redrawAll(this.state.plotConfig),
    );
  }

  private initializeMainPlot = (initializePlotConfig: boolean = false) => {
    this.mp = this.createNewMainPlotter();
    this.plt = this.mp;
    
    this.searcher = new Searcher(this.props.data, (id: string) => this.fm.getIsFiltered(id));

    // TODO: reset all filter and search states??

    if (initializePlotConfig) {
      this.setupInitialMainPlot();
    } else {
      this.setupAndRedrawMainPlot();
      // this.mp.redrawAll(this.state.plotConfig);
    }

    this.updateScatterPlotOnFilter(this.state.filteredIds);
  };

  private setupAndRedrawBarChart = (
    barChartType: ChartType.BAR_CHART | ChartType.BAR_STACK = ChartType.BAR_CHART,
  ) => {
    //  (0) Set default X and Y attribute if not present
    //  (1) replace X attr with ordinal if current is numeric
    //  (2) drop custom status of color/size if present
    //  (3) change default size ranges to bar sizes
    //  (4) change default size/color to bar size/color defaults

    const {
      [PField.X]: x1,
      [PField.Y]: y1,
      x2,
    } = INITIAL_ATTR[this.props.fileName];

    const {x, y} = this.state.plotConfig;
    if (barChartType === ChartType.BAR_STACK) {
      this.setPlotConfig(PField.X,
          new PlotConfigEntry((x && x.attribute.name === x1.name) ? x2 : x1));
    } else if (!x || x && x.attribute.type === 'number') {
      this.setPlotConfig(PField.X, new PlotConfigEntry(x1));
    }
    if (!y) {
      this.setPlotConfig(PField.Y, new PlotConfigEntry(y1));
    }
    if (barChartType === ChartType.BAR_STACK) {
      this.setPlotConfig(VField.COLOR, undefined);
      this.setPlotConfig(VField.SIZE, undefined);
      this.setPlotConfig(GField.GROUP,
        new PlotConfigEntry((x && x.attribute) || x2));
    }
    this.dropCustomScales();
    
    this.setState(
      prevState => ({
        visualScaleRanges: {
          ...prevState.visualScaleRanges,
          [VisualScaleType.SIZE]: DEFAULT_BAR_SIZE_RANGE,
        },
        defaultVisualValues: {
          [VField.COLOR]: DEFAULT_BAR_COLOR, 
          [VField.SIZE]: DEFAULT_BAR_SIZE,
        },
      }),
      // @ts-ignore
      () => this.plt.redrawAll(this.state.plotConfig),
    );
  };
  
  
  private initializeBarChart = (
    barChartType: ChartType.BAR_CHART | ChartType.BAR_STACK = ChartType.BAR_CHART,
  ) => {
    if (barChartType === ChartType.BAR_STACK) {
      this.bsp = this.createNewBarStackPlotter();
      this.plt = this.bsp; 
    } else {
      this.bp = this.createNewBarPlotter();
      this.plt = this.bp;
    }

    this.searcher = new Searcher(this.props.data, (id: string) => this.fm.getIsFiltered(id));
    
    this.plt.setFilteredData(this.state.filteredIds);
    
    this.setupAndRedrawBarChart(barChartType);
  };

  private dropCustomScales = () => {
    const {[VField.COLOR]: color, [VField.SIZE]: size} = this.state.plotConfig;
    if (color && color.useCustomScale) {
      this.setPlotConfig(VField.COLOR, {...color, useCustomScale: false});
    }
    if (size && size.useCustomScale) {
      this.setPlotConfig(VField.SIZE, {...size, useCustomScale: false});
    }
  };

  // componentDidMount() {
  //   if (this.props.data) {
  //     this.fm = new FilterManager(this.props.data, this.handleFilterListChange);
  //     this.initializeMainPlot(true);
  //   }
  // }

  componentDidUpdate(prevProps: AppProps) {
    if (prevProps.data !== this.props.data) {
      console.log('App received processed new data');
      this.fm = new FilterManager(this.props.data, this.handleFilterListChange);
      this.setState(
        () => this.createInitialState(),
        // () => this.initializeMainPlot(true),

        // temp
        () => {
          this.setState({chartType: ChartType.BAR_CHART});
          this.initializeBarChart();
          this.showOverlayMenu(OverlayMenu.AFFORDANCE);
        }
      );
    }
  }

  private handleHoverDataPoint = (activeEntry: DataEntry): void => 
    this.setState(() => ({activeEntry}));

  setPlotConfig : SetPlotConfig = (
    field, 
    plotConfigEntry?,
    callback?,
  ) => {

    this.setState((prevState) => ({
      plotConfig: {
        ...prevState.plotConfig,
        [field]: plotConfigEntry,
      }
    }), () => {
      
      // const plotConfig = this.state.plotConfig;
      // if (field === Field.X || field === Field.Y) {
      //   const { [Field.X]: x, [Field.X]: y } = plotConfig;
      //   // @ts-ignore
      //   this.plt.updatePosition(plotConfig); // This clears plot if x or y is undefined
   
      //   if (!x || !y) {
      //     this.removeAllFilters();
      //   }
      //   if (!(prevX && prevY) && x && y) {
      //     // @ts-ignore
      //     this.plt.updateVisual(Object.values(VField), plotConfig); // restore color and size
      //   }
      // }
      
      // if (field === Field.COLOR || field === Field.SIZE) {
      //   // @ts-ignore
      //   this.plt.updateVisual([field,], plotConfig, keepSelection);
      // }

      // @ts-ignore
      this.plt.redrawAll(this.state.plotConfig);

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

  private toggleColorPicker: ToggleColorPicker = (ev, on) => {
    if (!this.d3ContainerRef.current) {
      return;
    }
    const pos = SelUtil.getEventPosRelativeToBox(ev, this.d3ContainerRef.current);
    this.updateColorPicker({
      left: pos.x - 18,
      top: pos.y + 20,
      display: on ? undefined : 'none',
    });
  };

  // Note: now no need to call updateRecommendation (oldname for updateRecommendedEncodings) 
  //   in the three methods below
  //   as recommendations are sync-ed in ActiveSelectionsWithRec
  private handleChangeVisualByUser: HandleChangeVisualByUser = (
    field,
    value,
    options?,
  ) => {
    const clearSelection = options && options.clearSelection;
    
    const update = () => {
      // @ts-ignore
      this.plt.assignVisual(field, value, options);
      if (clearSelection) {
        // @ts-ignore
        this.plt.clearSelection();
      }
    }
    if (this.state.plotConfig[field]) {
      this.setPlotConfig(
        field, 
        undefined,
        update,
      ); // note this now always updates(clears) color
    } else {
      update();
    }
  };

  private handlePickColor: HandlePickColor = (colorObj) => {
    this.handleChangeVisualByUser(
      VField.COLOR,
      ColorUtil.hslToString(colorObj.hsl),
      {
        clearSelection: true,
      }
    );
    this.updateColorPicker({display: 'none'});
  }


  private unVisualAll = (field: VField) => {
    // @ts-ignore
    this.plt.unVisualAll(field);
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

  private updateRecommendedEncodings: UpdateRecommendedEncodings = (
    recommendedEncodings: ReadonlyArray<RecommendedEncoding>
  ) => {
    this.setState(() => ({ recommendedEncodings }));
  };

  // clearRecommendation = () => {
  //   // in principle recommendation should be in sync with the colored groups
  //   // this function may be defined for potential cases where we want to 
  //   // clear recommendations but preserve the color groups backstage.
  // };

  private handleAcceptRecommendeedEncoding: HandleAcceptRecommendedEncoding = (field, attrName) => {
    // @ts-ignore
    this.plt.clearSelection();
    this.setPlotConfig(
      field, 
      new PlotConfigEntry(new Attribute(attrName, 'number'), field !== GField.GROUP),
      () => {
        if (field === GField.GROUP) {
          this.handleSelectChartType(ChartType.BAR_STACK);
        }
      }
    );

    // // Drag Animation
    // this.hideCustomAttrTag(field, true);
    // DragAnimator.showDragAttrTagAnimation(
    //   field,
    //   attrName,
    // ).then(
    //   () => this.hideCustomAttrTag(field, false)
    // );
  };

  // private hideCustomAttrTag = (field: VField, shouldHide: boolean) => {
  //   this.setState((prevState) => {
  //     const shouldHideCustomAttrTag = { ...prevState.shouldHideCustomAttrTag };
  //     shouldHideCustomAttrTag[field] = shouldHide;
  //     return {shouldHideCustomAttrTag};
  //   });
  // }

  private handleHoverRecommendedEncoding: HandleHoverRecommendedEncoding = (ev, field, attrName) => {
    if (!this.state.isDragging) {
      if (field === PField.X || field === PField.Y) {
        return;
      }
      if (ev.type === 'mouseenter') {
        // @ts-ignore
        this.plt.updateVisualWithRecommendation(field, attrName);
      } else if (ev.type === 'mouseleave') {
        // @ts-ignore
        this.plt.syncVisualToUserSelection(field);
      }
    }
  };

  private handleDismissRecommendedEncoding: HandleDismissRecommendedEncoding = (field, attrName) => {
    this.setState((prevState) => ({
      recommendedEncodings: prevState.recommendedEncodings
          .filter(d => !(d.field === field && d.attrName === attrName))
    }), () => {
      if (field === PField.X) {
        return;
      }
      if (field === PField.Y || field === GField.GROUP) {
        // @ts-ignore
        this.plt.redrawAll();
        return;
      }
      if (this.state.recommendedEncodings.filter(d => d.field === field).length === 0) {
        this.unVisualAll(field);
      } else {
        // @ts-ignore
        this.plt.syncVisualToUserSelection(field); // manually reset since mouseleave is not fired
      }
    });
  }

  private handleDismissAllRecommendedEncodings: HandleDismissAllRecommendations = () => {
    this.setState(() => ({
      recommendedEncodings: [],
    }));
    for (const field of Object.values(VField)) {
      this.unVisualAll(field);
    }
  };


  private updateRecommendedOrder: UpdateRecommendedOrders = (recommendedOrders) => {
    this.setState(() => ({ recommendedOrders }));
  };

  private handleAcceptRecommendedOrder: HandleAcceptRecommendedOrder = (
    order: Order,
  ) => {
    this.bp.updateOrderAndPlot(order);
    this.bp.clearSelection();
  };

  private handleDismissRecommendedOrder: HandleDismissRecommendedOrder = (
    order: Order,
  ) => {
    if (this.state.recommendedOrders.length === 1) {
      this.handleDismissAllRecommendedOrders();
    } else {
      this.setState((prevState) => ({
        recommendedOrders: prevState.recommendedOrders
            .filter(d => !(d.attrName === order.attrName && d.asce === order.asce))
      }));
    }
  };

  private handleDismissAllRecommendedOrders: HandleDismissAllRecommendations = () => {
    this.setState(() => ({
      recommendedOrders: [],
    }));
    this.bp.redrawAll(this.state.plotConfig);
    this.bp.clearSelection();
  };


  private handleOrderBarsByCurrentYAsce = () => 
    this.handleOrderBarsByCurrentY(true);
  
  private handleOrderBarsByCurrentYDesc = () => 
    this.handleOrderBarsByCurrentY(false);

  private handleOrderBarsByCurrentY = (asce: boolean) => {
    const yEntry = this.state.plotConfig[PField.Y];
    if (yEntry) {
      const order = {
        attrName: yEntry.attribute.name,
        asce,
      };
      this.handleAcceptRecommendedOrder(order);
    }
  };

  private setIsHoveringFilterPanel = (isHoveringFilterPanel: boolean) => {
    this.setState({isHoveringFilterPanel});
  };

  private setIsDragging = (isDragging: boolean) => {
    this.setState({isDragging});
  };

  private handleHoverDrop: HandleHoverDrop = (ev) => {
    if (ev.type === 'mouseenter') {
      this.setIsHoveringFilterPanel(true);
    } else if (ev.type === 'mouseleave') {
      this.setIsHoveringFilterPanel(false);
    }
  };

  private handleDragEnd = (idSetDroppedToFilter: ReadonlySet<string>) => {
    if (this.state.isHoveringFilterPanel) {
      // console.log('Points dropped in filter');
      const recommendedFilters = FilterManager.getRecommendedFilters({
        idSetDroppedToFilter,
        data: this.props.data,
        xAttr: this.state.plotConfig.x && this.state.plotConfig.x.attribute,
        yAttr: this.state.plotConfig.y && this.state.plotConfig.y.attribute,
      });
      this.setState(() => ({recommendedFilters}));
    }
  };

  private handleDragBarsEnd = (xSetDroppedToFilter: ReadonlySet<string>) => {
    const xAttr = this.state.plotConfig[PField.X];
    if (this.state.isHoveringFilterPanel && xAttr) {
      // console.log('Points dropped in filter');
      const recommendedFilters = FilterManager.getBarRecommendedFilters({
        xSetDroppedToFilter,
        xName: xAttr.attribute.name,
        data: this.props.data,
      });
      this.setState(() => ({recommendedFilters}));
    }
  };


  private updateScatterPlotOnFilter = (filteredIds: ReadonlySet<string>) => {
    // This draws plot only and does not clean up, animation, etc.
    // Use this for initializing plot with filters
    const getState = this.fm.getStateGetterOnNoPreview();
    this.hideOrDimPointsByState(getState);
  };

  private handleFilterListChange: HandleFilterListChange = () => {
    // Update states
    const filteredIds = this.fm.getFilteredIdSet();
    this.setState(() => ({
      filterList: this.fm.getFilterListCopy(),
      filteredIds,
    }));

    if (this.state.chartType === ChartType.SCATTER_PLOT) {
      // Draw
      this.updateScatterPlotOnFilter(filteredIds);
      // Clean up selections
      this.cleanUpFilteredPoints(filteredIds)
      // Update search using current keyword
      this.updateSearchResult();
      // Show drag animations
      DragAnimator.showDragFilteredPointsAnimation(
        this.fm.getNewFilteredIds()
      ).then(() => console.log('Points drag animation finished'));
    }
    if (this.state.chartType === ChartType.BAR_CHART || this.state.chartType === ChartType.BAR_STACK) {
      // @ts-ignore
      this.plt.updateDataAndPlot(filteredIds, this.state.plotConfig);
    }
  };

  private handleAcceptRecommendedFilter: HandleAcceptRecommendedFilter = (filter) => {
    // 1. Add filter
    this.handleAddFilter(filter);
    // 2. Set filterlist 
    //    (now done by filter manager as callback)
    // 3. Clear recommended filters
    this.clearAllRecommendedFilters();
    // 4. Draw
    //    (now done by filter manager as callback)
    // 5. Clean up selections for filtered points.
    this.cleanUpFilteredPoints(new Set(this.props.data.filter(filter.filterFn).map(d => d.__id_extra__)));
  };

  private handleHoverRecommendedFilter: HandleHoverRecommendedFilter = (ev, filter) => {
    if (ev.type === 'mouseenter') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnPreviewAdd(filter.filterFn));
    } else if (ev.type === 'mouseleave') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview());
    }
  };

  private handleDismissRecommendedFilter: HandleDismissRecommendedFilter = (key) => {
    this.setState((prevState) => ({
      recommendedFilters: prevState.recommendedFilters.filter(rf => rf.key !== key),
    }), () => {
      // manually reset since mouseleave is not fired
      this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview());
    });
  }

  private clearAllRecommendedFilters = () => {
    this.setState(() => ({recommendedFilters: []}));
  };

  private handleDismissAllRecommendedFilters: HandleDismissAllRecommendations = () => {
    this.clearAllRecommendedFilters();
  };


  private handleAddFilter: HandleAddFilter = (filter) => {
    this.fm.addFilter(filter); // fm calls callback which sets filterList state and draw plot
  };

  private handleSetFilter: HandleSetFilter = (fid, filter) => {
    this.fm.setFilter(fid, filter); // fm calls callback which sets filterList state and draw plot
  };

  private handleRemoveFilter: HandleRemoveFilter = (fid) => {
    this.fm.removeFilter(fid); // fm calls callback which sets filterList state and draw plot
  };

  private handleHoverFilter: HandleHoverFilter = (ev, filter) => {
    if (ev.type === 'mouseenter') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnPreviewRemove(filter.filterFn))
    } else if (ev.type === 'mouseleave') {
      this.hideOrDimPointsByState(this.fm.getStateGetterOnNoPreview())
    }
  };

  // private removeAllFilters = () => {
  //   // used to clear filters when plot is cleared (e.g. removing X/Y)
  //   this.fm.removeAllFilter();
  //   this.clearAllRecommendedFilters();
  // };

  private hideOrDimPointsByState = (getState: PointStateGetter) => {
    const shouldHide = (d: DataEntry) => getState(d) === PointState.FILTERED;
    const shouldDim = (d: DataEntry) => {
      const s = getState(d);
      return s === PointState.TO_FILTER || s === PointState.TO_RESTORE
    }
    this.mp.hideOrDimPoints(shouldHide, shouldDim);
  };

  private cleanUpFilteredPoints = (filteredIds: ReadonlySet<string>) => {
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
    this.mp.clearSelection(filteredIds);
  };


  private setVisualScales: SetVisualScales = (
    visualScaleType,
    scale,
    updateRangeFromScale?,
  ) => {
    this.setState((prevState) => ({
      visualScaleMap: {
        ...prevState.visualScaleMap,
        [visualScaleType]: scale,
      },
    }));
    if (updateRangeFromScale && scale) {
      this.setState((prevState) => ({
        visualScaleRanges: {
          ...prevState.visualScaleRanges,
          [visualScaleType]: scale.range()
        },
      }));
    }
  }

  private handleSearchInputChange: HandleSearchInputChange = (keyword) => {
    this.updateSearchResult(keyword);
    if (this.state.chartType === ChartType.SCATTER_PLOT) {
      this.selectSearchResult();
    }
  };

  private updateSearchResult = (keyword?: string) => {
    // update with current keyword if not provided
    const searchResultsIdSet = this.searcher.searchAndGetResultsIdSet(keyword);
    this.setState(() => ({ searchResultsIdSet })); 
  };

  private selectSearchResult = () => {
    // Do not use the react component state: this is non-react-controlled
    //  and takes effect outside render(), so state is not guaranteed to be updated
    // Use the non-react state instead.
    // Here's the ugly part: we have searchResultsIdSet in both the react
    //    component state and the non-react Searcher state, as it is needed
    //    in both rendering the react part and updating the non-react part (plot)
    this.mp.selectByIds(this.searcher.getCurrentSearchResultsIdSet());
    this.setState(() => ({ isSearchResultSelected: true }));
  };

  private handleClickSelectSearchButton = () => {
    this.selectSearchResult();
  };

  private onSelectionChange = () => {
    this.setState(() => ({ isSearchResultSelected: false }));
  };

  private getVisualScaleRange = (type: VisualScaleType) =>
    this.state.visualScaleRanges[type];

  private handleSetVisualScaleRange = (
    type: VisualScaleType,
    range: ColorNumRange | D3Scheme | Readonly<[number, number]>,
    shouldCloseMenu?: boolean
  ) => {
    const vfield = (type === VisualScaleType.SIZE ? VField.SIZE : VField.COLOR);
    this.setState(
      (prevState) => ({
        visualScaleRanges: {
          ...prevState.visualScaleRanges,
          [type]: range,
        },
      }),
      () => {
        // Use setPlotConfig to update the visual - otherwise need
        //   to reset custom encodings before update visual
        const currentEntry = this.state.plotConfig[vfield]
        if (currentEntry) {
          this.setPlotConfig(
            vfield,
            new PlotConfigEntry(currentEntry.attribute)
          );
        }
      }
    );
    
    if (shouldCloseMenu) {
      this.closeOverlayMenu();
    }
  }

  private handleSetColorNumRange = (range: ColorNumRange) => 
    this.handleSetVisualScaleRange(VisualScaleType.COLOR_NUM, range);

  private handleSetSizeRange = (range: Readonly<[number, number]>) =>
    this.handleSetVisualScaleRange(VisualScaleType.SIZE, range);


  private showOverlayMenu = (overlayMenu: OverlayMenu | null) => 
    this.setState(() => ({activeOverlayMenu: overlayMenu}));

  private closeOverlayMenu = () => this.showOverlayMenu(null);

  private handleOpenColorNumMenu = () => this.showOverlayMenu(OverlayMenu.COLOR_NUM);

  private handleOpenColorOrdMenu = () => this.showOverlayMenu(OverlayMenu.COLOR_ORD);

  private handleOpenSizeMenu = () => this.showOverlayMenu(OverlayMenu.SIZE);

  private renderOverlayMenu = () => {
    switch(this.state.activeOverlayMenu) {
      case OverlayMenu.COLOR_NUM:
        const cScale = this.state.visualScaleMap[VisualScaleType.COLOR_NUM]
        if (!cScale) {
          return;
        }
        return (
          <OverlayMenuColorNumPage
            range={this.state.visualScaleRanges[VisualScaleType.COLOR_NUM]}
            scale={cScale}
            onSetColorNumRange={this.handleSetColorNumRange}
          />
        );
      case OverlayMenu.COLOR_ORD:
        return (<div>color menu ordinal</div>);
      case OverlayMenu.SIZE:
        return (
          <OverlayMenuSizePage
            onSetSizeRange={this.handleSetSizeRange}
            currentRange={this.state.visualScaleRanges[VisualScaleType.SIZE]}
            maxRange={this.state.chartType === ChartType.SCATTER_PLOT ? MAX_DOT_SIZE_RANGE : MAX_BAR_SIZE_RANGE}
          />
        );
      case OverlayMenu.AFFORDANCE:
        return <OverlayMenuAffordancePage 
          chartType={this.state.chartType}
          onClickDisableAffordance={this.handleClickDisableAffordance}
        />;
      default:
        return;
    }
  };

  private handleClickDisableAffordance = (chartType: ChartType) =>
    this.setState((prevState) => ({
      showAffordance: {
        ...prevState.showAffordance,
        [chartType]: false,
      },
      activeOverlayMenu: null,
    }));

  private getDefaultVisualValue = (vfield: VField) => this.state.defaultVisualValues[vfield];

  private handlePickVisualAll = (vfield: VField, value: number | string) => {
    // console.log(value);

    // set default color/size and update plot
    this.setState(
      (prevState) => ({
        defaultVisualValues: {
          ...prevState.defaultVisualValues,
          [vfield]: value,
        },
      }),
      // use SetPlotConfig to update visual - this clears
      //    existing encoding and user assigned visuals for the field
      // Otherwise has to clear both manually before updating visual
      () => this.setPlotConfig(
        vfield,
        undefined,
        // restore the user assignment in the other vfield that is not set
        // @ts-ignore
        () => this.plt.syncVisualToUserSelection(vfield === VField.COLOR ? VField.SIZE : VField.COLOR),
      ),
    );
  };

  private handlePickColorAll: HandlePickColor = (colorObj) => {
    this.handlePickVisualAll(
      VField.COLOR,
      ColorUtil.hslToString(colorObj.hsl)
    );
    // this.updateColorPicker({display: 'none'});
  };

  private handlePickSizeAll = (size: number) =>
    this.handlePickVisualAll(VField.SIZE, size);

  
  private handleSelectChartType: HandleSelectChartType = (chartType) => {
    console.log('Switching chart to: ' + chartType);
    this.setState(
      () => ({chartType}),
    );
    if (chartType === ChartType.SCATTER_PLOT) {
      this.initializeMainPlot();
    } else if (chartType === ChartType.BAR_CHART) {
      this.initializeBarChart();
      this.handleSearchInputChange('');
    } else if (chartType === ChartType.BAR_STACK) {
      this.initializeBarChart(ChartType.BAR_STACK);
      this.handleSearchInputChange('');
    }
    if (this.state.showAffordance[chartType]) {
      this.showOverlayMenu(OverlayMenu.AFFORDANCE);
    }
  };

  private handleUpdateDataFile: HandleUpdateDataFile = (fileName) => {
    this.setState(
      () => ({plotConfig: {}}),
      () => this.props.onUpdateDataFile(fileName),
    );
  };

  private shouldShowLegend = () => {
    if (this.state.chartType === ChartType.BAR_STACK) {
      return !!this.state.plotConfig[GField.GROUP]
    } else {
      return !!(this.state.plotConfig[VField.COLOR] || this.state.plotConfig[VField.SIZE])
    }
  }


  render() {
    return (
      <div className="app">
        <nav
          className="navbar navbar-expand-lg navbar-light bg-light"
        >
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav">
              <li className="nav-item mx-2">
                <Dropdown
                  text="Data"
                  width={240}
                >
                  <FileSelector 
                    currentFile={this.props.fileName}
                    onUpdateDataFile={this.handleUpdateDataFile}
                  />
                </Dropdown>
              </li>
              <li className="nav-item mx-2">
                <Dropdown
                  text="Show Me"
                  width={240}
                >
                  <ChartSelector 
                    selectedChartType={this.state.chartType}
                    onSelectChartType={this.handleSelectChartType}
                  />
                </Dropdown>
              </li>
              {/* <li className="nav-item mx-2">
                <Dropdown
                  text="Search"
                  width={240}
                >
                  <Search
                    onSearchInputChange={this.handleSearchInputChange}
                    resultsIdSet={this.state.searchResultsIdSet}
                    shouldShowSelectButton={!this.state.isSearchResultSelected}
                    onClickSelectSearchButton={this.handleClickSelectSearchButton}
                  />
                </Dropdown>
              </li> */}
              <li 
                className="nav-item mx-2 align-items-center d-flex"
                style={{visibility: this.state.chartType === ChartType.BAR_CHART ? 'visible' : 'hidden'}}
              >
                <div className="p-1">Sort Bars:</div>
                <div className="align-items-center" style={{fontSize: 18}}>
                  <FAButton
                    faName="sort-amount-up"
                    onClick={this.handleOrderBarsByCurrentYAsce}
                    title="Sort Bars Ascending"
                  />
                  <FAButton
                    faName="sort-amount-down"
                    onClick={this.handleOrderBarsByCurrentYDesc}
                    title="Sort Bars Descending"
                  />
                </div>
              </li>
            </ul>
          </div>
        </nav>
        
        <div className="d-flex m-2 content">
          <div
            className="left-panel"
          >
            <Search
              onSearchInputChange={this.handleSearchInputChange}
              resultsIdSet={this.state.searchResultsIdSet}
              shouldShowSelectButton={!this.state.isSearchResultSelected}
              onClickSelectSearchButton={this.handleClickSelectSearchButton}
              shouldDisableSearch={this.state.chartType !== ChartType.SCATTER_PLOT}
            />
            <Attributes 
              attributes={memoizedGetAttributes(this.props.data)}  
              activeEntry={this.state.activeEntry}
            />
          </div>

          
          <div
            className="right-panel"
            style={{flex: `0 0 ${FILTER_PANEL_WIDTH}px`}}
          >
            <Filters
              data={this.props.data}
              filterList={this.state.filterList}
              filteredIds={this.state.filteredIds}
              xAttr={this.state.plotConfig[PField.X] && this.state.plotConfig[PField.X]!.attribute}
              yAttr={this.state.plotConfig[PField.Y] && this.state.plotConfig[PField.Y]!.attribute}
              onAddFilter={this.handleAddFilter}
              onSetFilter={this.handleSetFilter}
              onRemoveFilter={this.handleRemoveFilter}
              onHoverFilter={this.handleHoverFilter}
              onHoverDrop={this.handleHoverDrop}
              isDragging={this.state.isDragging}
              random={Math.random()}
            />
            <RecommendedFilters
              recommendedFilters={this.state.recommendedFilters}
              onAcceptRecommendedFilter={this.handleAcceptRecommendedFilter}
              onDismissRecommendedFilter={this.handleDismissRecommendedFilter}
              onHoverRecommendedFilter={this.handleHoverRecommendedFilter}
              onDismissAllRecommendedFilter={this.handleDismissAllRecommendedFilters}
            />
            <RecommendedEncodings
              recommendedEncodings={this.state.recommendedEncodings}
              onAcceptRecommendedEncoding={this.handleAcceptRecommendeedEncoding}
              onDismissRecommendedEncoding={this.handleDismissRecommendedEncoding}
              onHoverRecommendedEncoding={this.handleHoverRecommendedEncoding}
              onDismissAllRecommendedEncodings={this.handleDismissAllRecommendedEncodings}
            />
            <RecommendedOrders
              recommendedOrders={this.state.recommendedOrders}
              onAcceptRecommendedOrder={this.handleAcceptRecommendedOrder}
              onDismissRecommendedOrder={this.handleDismissRecommendedOrder}
              onDismissAllRecommendedOrders={this.handleDismissAllRecommendedOrders}
            />

            {/* for debugging only */}
            {DEBUG && Object.values(VField).map(field => {
              const handleClickClearSelected = () => 
                this.unVisualSelected(field)
              const handleClickClearAll = () => 
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
                    onClick={handleClickClearAll}
                  >
                    {`All`}
                  </button>
                </div>
              );
            })}
          </div>


          <div className="mid-panel">
            <Encodings 
              setPlotConfig={this.setPlotConfig}
              plotConfig={this.state.plotConfig}
              chartType={this.state.chartType}
              shouldHideCustomAttrTag={this.state.shouldHideCustomAttrTag}
              onPickColor={this.handlePickColorAll}
              onPickSize={this.handlePickSizeAll}
              currentDefaultSize={this.state.defaultVisualValues[VField.SIZE]}
              currentDefaultColor={this.state.defaultVisualValues[VField.COLOR]}
            />

            <div className="d-flex">
              <div className="plot-container">
                <div ref={this.d3ContainerRef} className="plot-container__scroll">
                  <div style={{height: 0}}>
                    <ColorPicker 
                      style={this.state.colorPickerStyle} 
                      onChangeComplete={this.handlePickColor}
                    />
                  </div>
                </div>
              </div>
              <div className="panel-4">
                {this.shouldShowLegend() &&
                  <Legends
                    data={this.props.data}
                    visualScaleMap={this.state.visualScaleMap}
                    plotConfig={this.state.plotConfig}
                    chartType={this.state.chartType}
                    onOpenColorNumMenu={this.handleOpenColorNumMenu}
                    onOpenColorOrdMenu={this.handleOpenColorOrdMenu}
                    onOpenSizeMenu={this.handleOpenSizeMenu}
                  />
                }
                {/* <VisualAllPanel
                  onPickColor={this.handlePickColorAll}
                  onPickSize={this.handlePickSizeAll}
                  currentDefaultSize={this.state.defaultVisualValues[VField.SIZE]}
                  currentDefaultColor={this.state.defaultVisualValues[VField.COLOR]}
                /> */}
              </div>
            </div>
          </div>

        </div>

        <div className="drag-animation-container" />

        <OverlayMenuContainer
          isHidden={this.state.activeOverlayMenu === null}
          onClose={this.closeOverlayMenu}
        >
          {this.state.activeOverlayMenu !== null &&
              this.renderOverlayMenu()}
        </OverlayMenuContainer>

      </div>
    )
  }
}

export { App };