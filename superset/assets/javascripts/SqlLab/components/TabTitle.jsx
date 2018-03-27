import React from 'react';
import PropTypes from 'prop-types';
import { DropdownButton, MenuItem } from 'react-bootstrap';

import CopyQueryTabUrl from './CopyQueryTabUrl';
import { t } from '../../locales';

const styleCursorPointer = { cursor: 'pointer' };

const propTypes = {
  queryEditor: PropTypes.object.isRequired,
  removeQueryEditor: PropTypes.func.isRequired,
  renameTab: PropTypes.func.isRequired,
  toggleLeftBar: PropTypes.func.isRequired,
  latestQueryState: PropTypes.string,
  selected: PropTypes.bool.isRequired,
};

class TabTitle extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { hovered: false };
  }
  render() {
    const qe = this.props.queryEditor;
    return (
      <div
        onMouseEnter={() => this.setState({ hovered: true })}
        onMouseLeave={() => this.setState({ hovered: false })}
      >
        {this.state.hovered && this.props.selected ?
          <i
            className="fa fa-close text-primary"
            style={styleCursorPointer}
            onClick={this.props.removeQueryEditor}
          />
          :
          <div className={'circle ' + this.props.latestQueryState} />
        }
        {' '} {qe.title} {' '}
        <DropdownButton
          bsSize="small"
          id={'ddbtn-tab'}
          title=""
        >
          <MenuItem eventKey="1" onClick={this.props.removeQueryEditor}>
            <i className="fa fa-close" /> {t('close tab')}
          </MenuItem>
          <MenuItem eventKey="2" onClick={this.props.renameTab}>
            <i className="fa fa-i-cursor" /> {t('rename tab')}
          </MenuItem>
          {qe &&
            <CopyQueryTabUrl queryEditor={qe} />
          }
          <MenuItem eventKey="4" onClick={this.props.toggleLeftBar}>
            <i className="fa fa-cogs" />
            &nbsp;
            {this.state.hideLeftBar ? t('expand tool bar') : t('hide tool bar')}
          </MenuItem>
        </DropdownButton>
      </div>);
  }
}
TabTitle.propTypes = propTypes;
export default TabTitle;
