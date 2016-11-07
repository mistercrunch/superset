const $ = window.$ = require('jquery');
import React from 'react';

import { ButtonGroup } from 'react-bootstrap';
import Button from '../../components/Button';
import { showModal } from '../../modules/utils';
import CssEditor from './CssEditor';

const propTypes = {
  table: React.PropTypes.object,
  dashboard: React.PropTypes.object.isRequired,
};

const defaultProps = {
  actions: {},
};

class Controls extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      css: props.dashboard.css,
      cssTemplates: [],
    };
  }
  refresh() {
    this.props.dashboard.slices.forEach((slice) => {
      slice.render(true);
    });
  }
  componentWillMount() {
    $.get('/csstemplateasyncmodelview/api/read', (data) => {
      const cssTemplates = data.result.map((row) => ({
        value: row.template_name,
        css: row.css,
        label: row.template_name,
      }));
      this.setState({ cssTemplates });
    });
  }
  save() {
    const dashboard = this.props.dashboard;
    const expandedSlices = {};
    $.each($('.slice_info'), function () {
      const widget = $(this).parents('.widget');
      const sliceDescription = widget.find('.slice_description');
      if (sliceDescription.is(':visible')) {
        expandedSlices[$(widget).attr('data-slice-id')] = true;
      }
    });
    const positions = dashboard.reactGridLayout.serialize();
    const data = {
      positions,
      css: this.state.css,
      expanded_slices: expandedSlices,
    };
    $.ajax({
      type: 'POST',
      url: '/caravel/save_dash/' + dashboard.id + '/',
      data: {
        data: JSON.stringify(data),
      },
      success() {
        showModal({
          title: 'Success',
          body: 'This dashboard was saved successfully.',
        });
      },
      error(error) {
        const errorMsg = this.getAjaxErrorMsg(error);
        showModal({
          title: 'Error',
          body: 'Sorry, there was an error saving this dashboard: </ br>' + errorMsg,
        });
      },
    });
  }
  changeCss(css) {
    this.setState({ css });
  }
  render() {
    const dash_save_perm = true;
    const dashboard = this.props.dashboard;
    return (
      <ButtonGroup>
        <Button
          id="refresh_dash"
          tooltip="Force refresh the whole dashboard"
          onClick={this.refresh.bind(this)}
        >
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
        <CssEditor
          dashboard={dashboard}
          triggerNode={
            <Button id="css" disabled={!dash_save_perm} tooltip="Edit the dashboard's CSS">
              <i className="fa fa-css3" />
            </Button>
          }
          initialCss={dashboard.css}
          templates={this.state.cssTemplates}
          onChange={this.changeCss.bind(this)}
        />
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
          onClick={this.save.bind(this)}
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
