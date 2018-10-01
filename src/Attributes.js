import React, { Component } from 'react';

import { DragSource } from 'react-dnd';
import { ItemTypes } from './Constants';
import { Panel } from './Panel';

export class Attributes extends Component {
  render() {
    return (
      <Panel 
        className="attributes_panel"
        heading="Attributes"
      >
          {this.props.attributes.map(
            (attribute) => {
              const {name, type} = attribute;
              return (
                <div key={name} className="d-flex align-items-center p-0 m-1">
                  <AttrTag name={name} type={type} />
                  <div className="attr__value pl-2">{this.props.activeEntry[name]}</div>
                </div>
              )
            }
          )}
      </Panel>
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
        className={`attr__tag btn`
          + ` btn-outline-${ this.props.type === 'number' ? 'info' : 'success'}`
          + ` d-flex align-items-center p-1`} 
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