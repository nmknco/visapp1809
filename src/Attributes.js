import React, { Component } from 'react';

import { DragSource } from 'react-dnd';
import { ItemTypes } from './Constants';

export class Attributes extends Component {
  render() {
    return (
      <div className="my-4">
        {this.props.attributes.map(
          attr => (
            <AttrTag key={attr} attribute={attr} />
          )
        )}
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
      <div className="btn btn-sm btn-primary mx-2 my-1">
        {this.props.attribute}
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