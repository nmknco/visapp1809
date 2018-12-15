import * as React from 'react';
import { ConnectDragSource, DragSource, DragSourceConnector, DragSourceMonitor } from 'react-dnd';

import { Attribute } from './Attribute';
import { Panel } from './Panel';

import {
  DataEntry,
  DraggableType,
  Field,
} from './commons/types';


interface AttributesProps {
  readonly activeEntry?: DataEntry,
  readonly attributes: Readonly<Attribute[]>,
}

class Attributes extends React.PureComponent<AttributesProps> {
  render() {
    // console.log('Attributes panel render');
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
                  {this.props.activeEntry &&
                    <div className="attr__value pl-2">
                      {this.props.activeEntry[name]}
                    </div>
                  }
                </div>
              )
            }
          )}
      </Panel>
    );
  }
}

interface AttrTagProps {
  readonly attribute: Attribute,
  readonly isCustom?: boolean,
}

class AttrTag extends React.PureComponent<AttrTagProps> {
  // AttrTag is a representational component
  // AttrTag knows some extra info that Attribute does not: 
  //  (1) if it's using custom color/size scale (from recommendation)
  render() {
    const { attribute: {name, type}, isCustom } = this.props;
    return (
      <div
        style={{width: isCustom ? 180 : 120 }}
        className={`attr__tag btn`
          + ` btn-outline-${ type === 'number' ? 'info' : 'success'}`}
        id={'attr-' + name}
      >
        {name + (isCustom ? ' (custom) ' : '')}
      </div>
    );
  }
}

interface AttrSourceProps extends AttrTagProps {
  readonly field?: Field,
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

interface DraggableAttrTagProps extends AttrSourceProps {
  connectDragSource?: ConnectDragSource,
  isDragging?: boolean,
}

class DraggableAttrTagBare extends React.PureComponent<DraggableAttrTagProps> {
  // this component knows additional info that Attribute and AttrTag does not: 
  //  (2) if it's in an encoding field (for drag-swapping)
  render() {
    console.log('Attribute tags render')
    const { connectDragSource, isDragging, attribute, isCustom } = this.props;
    return connectDragSource!(
      <div
        style={{
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <AttrTag
          {...{attribute, isCustom}}
        />
      </div>
    );
  }
}

const DraggableAttrTag = DragSource(DraggableType.ATTRIBUTE, attrSource, collect)(DraggableAttrTagBare)

export { Attribute, Attributes, AttrTag, DraggableAttrTag};