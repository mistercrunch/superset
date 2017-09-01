import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'reactable';
import { Label, FormControl, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';

import ColumnOption from '../../components/ColumnOption';
import MetricOption from '../../components/MetricOption';
import Draggable from './Draggable'

const propTypes = {
  datasource: PropTypes.object.isRequired,
  draggable: PropTypes.bool.isRequired,
};

const defaultProps = {
  draggable: true,
};


export default class DatasourceMetadata extends React.PureComponent {
  renderMetric(metric) {
    return (
      <div key={metric.metric_name}>
        <Draggable>
          <MetricOption metric={metric} />
        </Draggable>
      </div>
    );
  }
  renderColumn(column) {
    return (
      <div key={column.column_name}>
        <Draggable>
          <ColumnOption column={column} />
        </Draggable>
      </div>
    );
  }
  render() {
    const ds = this.props.datasource;
    console.log(ds);
    return (
      <div className="DatasourceMetadata">
        <strong>Metrics</strong>
        {ds.metrics.map(m => this.renderMetric(m))}
        <strong>Column</strong>
        {ds.columns.map(c => this.renderColumn(c))}
      </div>);
  }
}
DatasourceMetadata.propTypes = propTypes;
DatasourceMetadata.defaultProps = defaultProps;
