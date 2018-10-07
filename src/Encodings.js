import React, { Component } from 'react';

import { DropTarget } from 'react-dnd';
import { ItemTypes } from './Constants';

import { PlotConfigEntry } from './MainPlot';
import { Attribute, AttrTag } from './Attributes';
import { Panel } from './Panel';

export class Encodings extends Component {
  render() {
    const {
      setPlotConfig, 
      plotConfig: { x, y, color, size },
    } = this.props;
    return (
      <Panel 
        className="encoding_panel"
        heading="Encodings"
      >
        <div className="card-body d-flex flex-wrap p-0">
          <EncodingField field="x" plotConfigEntry={x} setPlotConfig={setPlotConfig} />
          <EncodingField field="y" plotConfigEntry={y} setPlotConfig={setPlotConfig} />
          <EncodingField field="color" plotConfigEntry={color} setPlotConfig={setPlotConfig} />
          <EncodingField field="size" plotConfigEntry={size} setPlotConfig={setPlotConfig} />
        </div>
      </Panel>
    );
  }
}

const encodingTarget = {
  drop: (props, monitor, component) => {
    const { plotConfigEntry, field } = props;
    const { attribute_source, field_source } = monitor.getItem();
    props.setPlotConfig(field, new PlotConfigEntry(attribute_source));
    if (field_source && plotConfigEntry) { // swap encoding - need to clear useCustomScale
      plotConfigEntry.useCustomScale = false;
      props.setPlotConfig(field_source, plotConfigEntry);
    }
  },

  canDrop: (props, monitor, component) => {
    const { plotConfigEntry, field } = props;
    const { attribute_source, field_source } = monitor.getItem();
    return (
      !(
        (attribute_source.type === 'other' && field === 'size') || 
        (plotConfigEntry && plotConfigEntry.attribute && plotConfigEntry.attribute.type === 'other' && field_source === 'size')
      )
    );
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

class EncodingField extends Component {
  constructor(props) {
    super(props);

    this.displayName = {
      'x': 'X axis',
      'y': 'Y axis',
      'color': 'Color',
      'size': 'Size',
    }
  }

  _getContent = () => {
    const { plotConfigEntry, field, setPlotConfig } = this.props;
    if (plotConfigEntry) {
      const {attribute, useCustomScale} = plotConfigEntry
      return (
        <div className="d-flex justify-content-between" style={{width: '100%'}}>
          <AttrTag attribute={attribute} field={field} isCustom={useCustomScale} />
          <span style={{cursor: 'pointer'}} onClick={() => {setPlotConfig(field, undefined)}}>x</span>
        </div>
      );
    } else {
      return 'Drag an attribute here';
    }
  };

  render() {
    const { connectDropTarget, isOver, canDrop, field } = this.props;
    return connectDropTarget(
      <div 
        className="encode-field m-1 d-flex align-items-center"
      >
        <div className="encode-field__header border border-light rounded-left d-flex align-items-center justify-content-end px-2 bg-secondary text-white">
          {this.displayName[field]}
        </div>
        <div 
          className="encode-field__content border border-light rounded-right d-flex align-items-center px-1 text-muted"
          style={{
            backgroundColor: isOver ? (canDrop ? '#ccffcc' : '#eecccc') : (canDrop ? '#ffff99' : undefined),
          }}
        >
          {this._getContent()}
        </div>
      </div>
    );
  }
}

EncodingField = DropTarget(
  ItemTypes.ATTRIBUTE,
  encodingTarget,
  collect
)(EncodingField);