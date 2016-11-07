import React from 'react';

import { ButtonGroup } from 'react-bootstrap';
import Button from '../../components/Button';

const propTypes = {
  table: React.PropTypes.object,
  dashboard: React.PropTypes.object.isRequired,
};

const defaultProps = {
  actions: {},
};

class Controls extends React.PureComponent {
  render() {
    const dash_save_perm = true;
    const dashboard = this.props.dashboard;
    return (
      <ButtonGroup>
        <Button id="refresh_dash" tooltip="Force refresh the whole dashboard">
          <i className="fa fa-refresh" />
        </Button>
        <Button disabled={!dash_save_perm} tooltip="Add a new slice to the dashboard">
          <i className="fa fa-plus" />
        </Button>
        <Button
          id="refresh_dash_periodic"
          tooltip="Decide how frequent should the dashboard refresh"
        >
          <i className="fa fa-clock-o" />
        </Button>
        <Button id="filters" tooltip="View the list of active filters">
          <i className="fa fa-filter" />
        </Button>
        <Button id="css" disabled={!dash_save_perm} tooltip="Edit the dashboard's CSS">
          <i className="fa fa-css3" />
        </Button>
        <Button
          id="editdash"
          disabled={!dash_save_perm}
          onClick={() => window.location = `/dashboardmodelview/edit/${dashboard.id}`}
          tooltip="Edit this dashboard's property"
        >
          <i className="fa fa-edit" />
        </Button>
        <Button
          id="savedash"
          disabled={!dash_save_perm}
          tooltip="Save the current positioning and CSS"
        >
          <i className="fa fa-save" />
        </Button>
      </ButtonGroup>
    );
  }
}
Controls.propTypes = propTypes;
Controls.defaultProps = defaultProps;

export default Controls;
