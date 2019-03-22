import * as React from 'react';
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

import { DraggableAttrTag } from './Attributes';
import { FAButton } from './FAButton';
import { Panel } from './Panel';
import { PlotConfigEntry } from './PlotConfigEntry';
import { SetAllColor, SetAllSize } from './VisualAllPanel';

import { 
  ChartType,
  DraggableType,
  Field,
  Fields,
  GField,
  HandlePickColor,
  HandlePickSize,
  PField,
  PlotConfig,
  SetPlotConfig,
  Stat,
  VField,
} from './commons/types';
import { getDropBackgroundColor } from './commons/util';

const DISPLAYNAME = {
  [PField.X]: 'X axis',
  [PField.Y]: 'Y axis',
  [VField.COLOR]: 'Color',
  [VField.SIZE]: 'Size',
  [GField.GROUP]: 'Group',
}

interface EncodingsProps {
  readonly setPlotConfig: SetPlotConfig,
  readonly plotConfig: PlotConfig,
  readonly chartType: ChartType,
  readonly shouldHideCustomAttrTag: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>,
  readonly onPickColor: HandlePickColor,
  readonly onPickSize: HandlePickSize,
  readonly currentDefaultSize: number,
  readonly currentDefaultColor: string,
}

class Encodings extends React.PureComponent<EncodingsProps> {

  render() {
    console.log('Encodings panel render')
    const { setPlotConfig, plotConfig, shouldHideCustomAttrTag } = this.props;
    return (
      <Panel 
        className="encoding_panel"
        heading="Encodings"
      >
        <div className="card-body d-flex flex-wrap p-0">
          {Fields.map((field: Field) =>
            <DroppableEncodingField
              key={field}
              field={field}
              plotConfigEntry={plotConfig[field]}
              chartType={this.props.chartType}
              setPlotConfig={setPlotConfig}
              shouldHideTag={shouldHideCustomAttrTag[field]}
              onPickColor={this.props.onPickColor}
              onPickSize={this.props.onPickSize}
              currentDefaultSize={this.props.currentDefaultSize}
              currentDefaultColor={this.props.currentDefaultColor}
            />
          )}
        </div>
      </Panel>
    );
  }
}


const encodingTarget = {
  drop: (
    props: EncodingFieldProps,
    monitor: DropTargetMonitor,
  ): void => {
    const { plotConfigEntry, field } = props;
    const { sourceAttribute, sourceField } = monitor.getItem();
    props.setPlotConfig(field, new PlotConfigEntry(sourceAttribute));
    if (sourceField && plotConfigEntry) { // swap encoding - need to clear useCustomScale
      props.setPlotConfig(sourceField, new PlotConfigEntry(plotConfigEntry.attribute));
    }
  },

  canDrop: (
    props: EncodingFieldProps,
    monitor: DropTargetMonitor,
  ): boolean => {
    const { plotConfigEntry, field, chartType } = props;
    const { sourceAttribute, sourceField } = monitor.getItem();
    const check = (type: 'number' | 'string') => 
      plotConfigEntry && plotConfigEntry.attribute && plotConfigEntry.attribute.type === type;
    
    return (
      !(
        (sourceAttribute.type === 'string' && 
          field === VField.SIZE
        ) || 
        (sourceAttribute.type === 'number' &&
          field === GField.GROUP
        ) ||
        (chartType === ChartType.BAR_CHART && 
          (sourceAttribute.type === 'string' && 
            (field === VField.COLOR || field === VField.SIZE || field === PField.Y)
          )
        ) ||
        (chartType === ChartType.BAR_STACK && 
          (field === VField.SIZE || field === VField.COLOR || 
          (sourceAttribute.type === 'string' && field === PField.Y))
        ) ||
        // swapping (isomorphic to above)
        (check('string') && 
          sourceField === VField.SIZE
        ) || 
        (check('number') &&
          sourceField === GField.GROUP
        ) ||
        (chartType === ChartType.BAR_CHART && 
          (check('string') && 
            (sourceField === VField.COLOR || sourceField === VField.SIZE || sourceField === PField.Y)
          )
        ) ||
        (chartType === ChartType.BAR_STACK && 
          (sourceField === VField.SIZE || sourceField === VField.COLOR || 
          (check('string') && sourceField === PField.Y))
        )
      )
    );
  }
};

const collect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

interface EncodingFieldProps {
  readonly field: Field,
  readonly setPlotConfig: SetPlotConfig,
  readonly chartType: ChartType,
  readonly plotConfigEntry?: PlotConfigEntry,
  readonly shouldHideTag: boolean,
  readonly onPickColor?: HandlePickColor,
  readonly onPickSize?: HandlePickSize,
  readonly currentDefaultSize?: number,
  readonly currentDefaultColor?: string,
  readonly connectDropTarget?: ConnectDropTarget,
  readonly isOver?: boolean,
  readonly canDrop?: boolean,
}

interface EncodingFieldState {
  readonly shouldShowPopup: boolean,
}

class EncodingField extends React.PureComponent<EncodingFieldProps, EncodingFieldState> {
  constructor(props: EncodingFieldProps) {
    super(props);
    this.state = {
      shouldShowPopup: false,
    };
  }

  private removeAttribute = 
    () => this.props.setPlotConfig(this.props.field, undefined);

  private renderContent = () => {
    const { plotConfigEntry, field, shouldHideTag } = this.props;
    const statName = {[ChartType.BAR_CHART]: Stat.MEAN, [ChartType.BAR_STACK]: Stat.SUM}
    if (plotConfigEntry) {
      const {attribute, useCustomScale} = plotConfigEntry
      return (
        !shouldHideTag &&
        <div className="d-flex justify-content-between align-items-center" style={{width: '100%'}}>
          <DraggableAttrTag
            attribute={attribute}
            field={field}
            isCustom={useCustomScale}
            stat={field !== PField.X && field !== GField.GROUP && statName[this.props.chartType]}
          />
          <FAButton
            faName="times"
            onClick={this.removeAttribute}
            hoverEffect={true}
            title="Remove"
          />
        </div>
      );
    } else {
      return 'Drag an attribute here';
    }
  };

  private togglePopup = () => this.setState((prevState) => ({
    shouldShowPopup: !prevState.shouldShowPopup,
  }));

  private renderPopupContent = (vfield: VField) => {
    return (
      <div 
        className="encode-field__set-all-popup card p-1"
        style={{visibility: this.state.shouldShowPopup ? 'visible' : 'hidden'}}
      >
        {(vfield === VField.COLOR && this.props.onPickColor && this.props.currentDefaultColor) &&
          <SetAllColor
            onPickColor={this.props.onPickColor}
            currentDefaultColor={this.props.currentDefaultColor}
          />
        }
        {(vfield === VField.SIZE && this.props.onPickSize && this.props.currentDefaultSize) &&
          <SetAllSize
            onPickSize={this.props.onPickSize}
            currentDefaultSize={this.props.currentDefaultSize}
          />
        }
      </div>
    );
  }

  render() {
    console.log('Encoding fields render');
    const { connectDropTarget, isOver, canDrop, field } = this.props;
    return connectDropTarget!(
      <div 
        className="encode-field m-1 d-flex align-items-center"
      >
        <div className="encode-field__header border border-light rounded-left d-flex align-items-center justify-content-end px-2 bg-secondary text-white">
          {DISPLAYNAME[field]}
          {(field === VField.COLOR || field === VField.SIZE) && (
            <div className="encode-field__set-all">
              <FAButton
                faName={this.state.shouldShowPopup ? "caret-up" : "caret-down"}
                onClick={this.togglePopup}
                hoverEffect={true}
                title="Change All"
              />
              {this.renderPopupContent(field)}
            </div>
          )
          }
        </div>
        <div
          id={'encoding-' + field}
          className="encode-field__content border border-light rounded-right d-flex align-items-center px-1 text-muted"
          style={{ backgroundColor: getDropBackgroundColor(isOver, canDrop) }}
        >
          {this.renderContent()}
        </div>
      </div>
    );
  }
}

const DroppableEncodingField = DropTarget(
  DraggableType.ATTRIBUTE,
  encodingTarget,
  collect,
)(EncodingField);

export { Encodings }