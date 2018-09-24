import React, { Component } from 'react';

import { DragSource } from 'react-dnd';
import { ItemTypes } from './Constants';

export class Attributes extends Component {
  render() {
    return (
      <div className="attribute_panel card border-light m-1">
        <div className="card-header"> Attributes </div>
        <div className="card-body p-0"> 
          {this.props.attributes.map(
            (attribute) => {
              const {name, type} = attribute;
              return (
                <div key={name} className="d-flex align-items-center p-0">
                  <AttrTag name={name} type={type} />
                  <div className="attr_value px-1">{this.props.activeEntry[name]}</div>
                </div>
              )
            }
          )}
        </div>
      </div>
    );
  }
}


const attrSource = {
  beginDrag(props) {
    return { ...props };
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

class AttrTag extends Component {
  render() {
    const { connectDragSource, isDragging } = this.props;
    return connectDragSource(
      <div 
        className={`attr_tag btn`
          + ` btn-outline-${ this.props.type === 'number' ? 'info' : 'success'}`
          + ` d-flex align-items-center m-1 p-1`} 
      >
        {this.props.name}
      </div>
    );
  }
}

AttrTag = DragSource(
  ItemTypes.ATTRIBUTE,
  attrSource,
  collect
)(AttrTag);

export { AttrTag };