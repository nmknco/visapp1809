import React, { Component } from 'react';

import { DragSource } from 'react-dnd';
import { ItemTypes } from './Constants';
import { Panel } from './Panel';

class Attributes extends Component {
  render() {
    return (
      <Panel 
        className="attributes_panel"
        heading="Attributes"
      >
          {this.props.attributes.map(
            (attribute) => {
              const { name } = attribute;
              return (
                <div key={name} className="d-flex align-items-center p-0 m-1">
                  <AttrTag attribute={attribute} />
                  <div className="attr__value pl-2">{this.props.activeEntry[name]}</div>
                </div>
              )
            }
          )}
      </Panel>
    );
  }
}

class Attribute {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }
}

const attrSource = {
  beginDrag(props) {
    const { attribute, field } = props
    return {
      attribute_source: attribute,
      field_source: field,
    };
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

class AttrTag extends Component {
  // AttrTag knows some extra info that Attribute does not: 
  //  (1) if it's in an encoding field (for drag-swapping)
  //  (2) if it's using custom color/size scale (from recommendation)
  render() {
    const { connectDragSource, isDragging, attribute: {name, type}, isCustom } = this.props;
    return connectDragSource(
      <div 
        style={{ opacity: isDragging ? 0.5 : 1, flex: isCustom ? '0 0 180px' : undefined}}
        className={`attr__tag btn`
          + ` btn-outline-${ type === 'number' ? 'info' : 'success'}`
          + ` d-flex align-items-center p-1`} 
      >
        {name + (isCustom ? ' (custom) ' : '')}
      </div>
    );
  }
}

AttrTag.defaultProps = {
  isCustom: false,
}

AttrTag = DragSource(
  ItemTypes.ATTRIBUTE,
  attrSource,
  collect
)(AttrTag);

export { Attribute, AttrTag, Attributes };