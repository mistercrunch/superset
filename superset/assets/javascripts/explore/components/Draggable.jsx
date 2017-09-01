import React from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';

const ItemTypes = {
	METRIC: 'metric',
	DIMENSION: 'dimension',
};

const draggableSource = {
  beginDrag(props) {
    return {};
  }
};

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

function Draggable(props) {
    return props.connectDragSource(
      <span className="Draggable" style={{
        opacity: props.isDragging ? 0.5 : 1,
        cursor: 'move',
      }}>
        {props.children}
      </span>
    );
}

Draggable.propTypes = propTypes;
export default DragSource('metric', draggableSource, collect)(Draggable);
