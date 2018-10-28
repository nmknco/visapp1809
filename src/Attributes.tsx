import * as React from 'react';
import { ConnectDragSource, DragSource, DragSourceConnector, DragSourceMonitor } from 'react-dnd';

import { Panel } from './Panel';

import {
  AttrType,
  DraggableType,
  Field,
} from './commons/types';


class Attribute {
  readonly name: string;
  readonly type: AttrType;

  constructor(name: string, type: AttrType) {
    this.name = name;
    this.type = type;
  }
}


interface AttributesProps {
  readonly activeEntry: object,
  readonly attributes: Attribute[],
}

class Attributes extends React.PureComponent<AttributesProps> {
  render() {
    console.log('Attributes panel render');
    return (
      <Panel 
        className="attributes-panel"
        heading="Attributes"
      >
          {this.props.attributes.map(
            (attribute) => {
              const { name } = attribute;
              return (
                <div key={name} className="d-flex align-items-center p-0 m-1">
                  <DraggableAttrTag attribute={attribute} />
                  <div className="attr__value pl-2">{this.props.activeEntry[name]}</div>
                </div>
              )
            }
          )}
      </Panel>
    );
  }
}

interface AttrSourceProps {
  readonly attribute: Attribute,
  readonly field?: Field,
  readonly isCustom?: boolean,
}

const attrSource = {
  beginDrag(props: AttrSourceProps) {
    const { attribute, field } = props
    return {
      sourceAttribute: attribute,
      sourceField: field,
    };
  }
};

const collect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

interface AttrTagProps extends AttrSourceProps {
  connectDragSource?: ConnectDragSource,
  isDragging?: boolean,
}

class AttrTag extends React.PureComponent<AttrTagProps> {
  // AttrTag knows some extra info that Attribute does not: 
  //  (1) if it's in an encoding field (for drag-swapping)
  //  (2) if it's using custom color/size scale (from recommendation)
  render() {
    console.log('Attribute tags render')
    const { connectDragSource, isDragging, attribute: {name, type}, isCustom } = this.props;
    return connectDragSource!(
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

const DraggableAttrTag = DragSource(DraggableType.ATTRIBUTE, attrSource, collect)(AttrTag)

export { Attribute, Attributes, DraggableAttrTag as AttrTag};