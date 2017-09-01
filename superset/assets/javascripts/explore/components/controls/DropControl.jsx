import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';

import * as v from '../../validators';
import ControlHeader from '../ControlHeader';

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object,
};

const defaultProps = {
  onChange: () => {},
};

const dropTarget = {
  drop(props) {
	console.log(props);
  }
};
function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}

const dropStyle = {
  borderStyle: 'dotted',
  borderWidth: '2px',
};

class DropControl extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }
  onChange(event) {
    this.props.onChange(value, errors);
  }
  render() {
    console.log(this.props.isOver);
	const extraClass = this.props.isOver ? 'border-primary text-primary' : 'text-muted';
    return this.props.connectDropTarget(
      <div>
        <ControlHeader {...this.props} />
        <div className={`ControlDrop DropZone ${extraClass}`} style={dropStyle}>
          [drop metrics here]
        </div>
      </div>
    );
  }
}

DropControl.propTypes = propTypes;
DropControl.defaultProps = defaultProps;

export default DropTarget('metric', dropTarget, collect)(DropControl);
