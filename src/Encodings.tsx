import * as React from 'react';
import { ConnectDropTarget, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

import { DraggableAttrTag } from './Attributes';
import { FAButton } from './FAButton';
import { Panel } from './Panel';
import { PlotConfigEntry } from './PlotConfigEntry';

import { 
  DraggableType,
  Field,
  Fields,
  GField,
  PField,
  PlotConfig,
  SetPlotConfig,
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
  readonly shouldHideCustomAttrTag: Readonly<{[VField.COLOR]: boolean, [VField.SIZE]: boolean}>,
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
              setPlotConfig={setPlotConfig}
              shouldHideTag={shouldHideCustomAttrTag[field]}
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
    const { plotConfigEntry, field } = props;
    const { sourceAttribute, sourceField } = monitor.getItem();
    return (
      !(
        (sourceAttribute.type === 'string' && field === 'size') || 
        (plotConfigEntry && plotConfigEntry.attribute && 
          plotConfigEntry.attribute.type === 'string' && sourceField === 'size')
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
  readonly plotConfigEntry?: PlotConfigEntry,
  readonly shouldHideTag: boolean,
  readonly connectDropTarget?: ConnectDropTarget,
  readonly isOver?: boolean,
  readonly canDrop?: boolean,
}

class EncodingField extends React.PureComponent<EncodingFieldProps> {
  constructor(props: EncodingFieldProps) {
    super(props);
  }

  private removeAttribute = 
    () => this.props.setPlotConfig(this.props.field, undefined);

  renderContent = () => {
    const { plotConfigEntry, field, shouldHideTag } = this.props;
    if (plotConfigEntry) {
      const {attribute, useCustomScale} = plotConfigEntry
      return (
        !shouldHideTag &&
        <div className="d-flex justify-content-between align-items-center" style={{width: '100%'}}>
          <DraggableAttrTag
            attribute={attribute}
            field={field}
            isCustom={useCustomScale}
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

  render() {
    console.log('Encoding fields render');
    const { connectDropTarget, isOver, canDrop, field } = this.props;
    return connectDropTarget!(
      <div 
        className="encode-field m-1 d-flex align-items-center"
      >
        <div className="encode-field__header border border-light rounded-left d-flex align-items-center justify-content-end px-2 bg-secondary text-white">
          {DISPLAYNAME[field]}
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