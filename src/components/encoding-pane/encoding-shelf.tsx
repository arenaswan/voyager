import {isWildcard} from 'compassql/build/src/wildcard';
import * as React from 'react';
import * as CSSModules from 'react-css-modules';
import {ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec} from 'react-dnd';

import {ActionHandler} from '../../actions/index';
import {
  SHELF_FIELD_ADD, SHELF_FIELD_MOVE, SHELF_FIELD_REMOVE, SHELF_FUNCTION_CHANGE, ShelfEncodingAction
} from '../../actions/shelf';
import {DraggableType, FieldParentType} from '../../constants';
import {ShelfFieldDef, ShelfFunction, ShelfId} from '../../models';
import {DraggedFieldIdentifier, Field} from '../field/index';

import * as styles from './encoding-shelf.scss';

/**
 * Props for react-dnd of EncodingShelf
 */
export interface EncodingShelfDropTargetProps {
  connectDropTarget: ConnectDropTarget;

  isOver: boolean;

  item: Object;
}

export interface EncodingShelfProps extends EncodingShelfDropTargetProps, ActionHandler<ShelfEncodingAction> {
  id: ShelfId;

  fieldDef: ShelfFieldDef;
}

class EncodingShelfBase extends React.PureComponent<EncodingShelfProps, {}> {
  constructor(props: EncodingShelfProps) {
    super(props);

    // Bind - https://facebook.github.io/react/docs/handling-events.html
    this.onFunctionChange = this.onFunctionChange.bind(this);
    this.onRemove = this.onRemove.bind(this);
  }

  public render() {
    const {id, connectDropTarget, fieldDef, item, isOver} = this.props;
    const channelName = isWildcard(id.channel) ? 'any' : id.channel;

    // HACK: add alias to suppress compile error for: https://github.com/Microsoft/TypeScript/issues/13526
    const F = Field as any;

    /*<FunctionChooser fieldDef={fieldDef} onFunctionChange={this.onFunctionChange}/>*/
    const field = (
      <div styleName="field-wrapper">
        <F
          fieldDef={fieldDef}
          isPill={true}
          parentId={{type: FieldParentType.ENCODING_SHELF, id: id}}
          draggable={true}
          onRemove={this.onRemove}
        />
      </div>
    );

    return connectDropTarget(
      <div styleName="encoding-shelf">
        <div styleName="shelf-label">{channelName}</div>
        {fieldDef ? field : FieldPlaceholder(isOver, !!item)}
      </div>
    );
  }
  private onRemove() {
    const {id, handleAction} = this.props;

    handleAction({
      type: SHELF_FIELD_REMOVE,
      payload: id
    });
  }

  private onFunctionChange(fn: ShelfFunction) {
    const {id, handleAction} = this.props;

    handleAction({
      type: SHELF_FUNCTION_CHANGE,
      payload: {
        shelfId: id,
        fn: fn
      }
    });
  }
}

function FieldPlaceholder(isOver: boolean, isActive: boolean) {
  return (
    <span styleName={isOver ? 'placeholder-over' : isActive ? 'placeholder-active' : 'placeholder'}>
      Drop a field here
    </span>
  );
}

const encodingShelfTarget: DropTargetSpec<EncodingShelfProps> = {
  // TODO: add canDrop
  drop(props, monitor) {
    // Don't drop twice for nested drop target
    if (monitor.didDrop()) {
      return;
    }

    const {fieldDef, parentId} = monitor.getItem() as DraggedFieldIdentifier;
    switch (parentId.type) {
      case FieldParentType.FIELD_LIST:
        props.handleAction({
          type: SHELF_FIELD_ADD,
          payload: {shelfId: props.id, fieldDef} // TODO: rename to to:
        });
        break;
      case FieldParentType.ENCODING_SHELF:
        props.handleAction({
          type: SHELF_FIELD_MOVE,
          payload: {from: parentId.id, to: props.id}
        });
      default:
        throw new Error('Field dragged from unregistered source type to EncodingShelf');
    }
  }
};

const collect: DropTargetCollector = (connect, monitor): EncodingShelfDropTargetProps => {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    item: monitor.getItem()
  };
};

export const EncodingShelf = DropTarget(DraggableType.FIELD, encodingShelfTarget, collect)(
  CSSModules(EncodingShelfBase, styles)
);