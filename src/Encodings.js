import React, { Component } from 'react';

import { DropTarget } from 'react-dnd';
import { ItemTypes } from './Constants';

import { AttrTag } from './Attributes';

export class Encodings extends Component {
  render() {
    return (
      <div>
        <EncodingField field="x_attr" setPlotConfig={this.props.setPlotConfig} />
        <EncodingField field="y_attr" setPlotConfig={this.props.setPlotConfig} />
      </div>
    );
  }
}

const encodingTarget = {
  drop(props, monitor, component) {
    const { attribute } = monitor.getItem();
    props.setPlotConfig(props.field, attribute);
    component.setState({attribute});
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
});

class EncodingField extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attribute: null,
    }
  }

  render() {
    const { connectDropTarget, isOver } = this.props;
    const { attribute } = this.state;
    return connectDropTarget(
      <div 
        className="m-2"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '270px',
          height: '40px',
          borderRadius: '2px',
          textAlign: 'left',
          paddingLeft: '10px',
          backgroundColor: isOver ? '#cccccc' : '#eeeeee'}}
      >
        {this.props.field + ' | '}
        {attribute ?
           <AttrTag attribute={attribute} /> :
           'Drag an attribute here'}
      </div>
    );
  }
}

EncodingField = DropTarget(
  ItemTypes.ATTRIBUTE,
  encodingTarget,
  collect
)(EncodingField);