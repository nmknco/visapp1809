import React, { Component } from 'react';

import { DropTarget } from 'react-dnd';
import { ItemTypes } from './Constants';

import { AttrTag } from './Attributes';

export class Encodings extends Component {
  render() {
    const { x_attr, y_attr, color_attr, size_attr } = this.props.plotConfig;
    return (
      <div className="encoding_panel card border-light m-1">
        <div className="card-header"> Encodings </div>
        <div className="card-body d-flex flex-wrap p-0">
          <EncodingField field="x_attr" attribute={x_attr} setPlotConfig={this.props.setPlotConfig} />
          <EncodingField field="y_attr" attribute={y_attr} setPlotConfig={this.props.setPlotConfig} />
          <EncodingField field="color_attr" attribute={color_attr} setPlotConfig={this.props.setPlotConfig} />
          <EncodingField field="size_attr" attribute={size_attr} setPlotConfig={this.props.setPlotConfig} />
        </div>
      </div>
    );
  }
}

const encodingTarget = {
  drop(props, monitor, component) {
    const { attribute } = props;
    const { name, type, encoding } = monitor.getItem();
    props.setPlotConfig(props.field, {name, type});
    if (encoding && attribute) { // swap encoding
      props.setPlotConfig(encoding, attribute)
    }
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
});

class EncodingField extends Component {
  constructor(props) {
    super(props);

    this.displayName = {
      'x_attr': 'X axis',
      'y_attr': 'Y axis',
      'color_attr': 'Color',
      'size_attr': 'Size',
    }
  }

  render() {
    const { connectDropTarget, isOver, attribute, field } = this.props;
    return connectDropTarget(
      <div 
        className="encode_field m-1 d-flex align-items-center"
      >
        <div className="encode_field_header border border-light rounded-left d-flex align-items-center justify-content-end px-2 bg-secondary text-white">
          {this.displayName[field]}
        </div>
        <div 
          className="encode_field_content border border-light rounded-right d-flex align-items-center px-2 text-muted"
          style={{backgroundColor: isOver ? '#cccccc' : undefined}}
        >
          {attribute ? <AttrTag { ...attribute } encoding={field} /> : 'Drag an attribute here'}
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