import React from 'react';
import PropTypes from 'prop-types';
import MapGL from 'react-map-gl';
import DeckGL from 'deck.gl';

const propTypes = {
  viewport: PropTypes.object.isRequired,
  layers: PropTypes.array.isRequired,
  setControlValue: PropTypes.func.isRequired,
  mapStyle: PropTypes.string,
  mapboxApiAccessToken: PropTypes.string.isRequired,
  onViewportChange: PropTypes.func,
};
const defaultProps = {
  mapStyle: 'light',
  onViewportChange: () => {},
};

export default class DeckGLContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: props.viewport,
    };
    this.tick = this.tick.bind(this);
  }
  componentWillMount() {
    const timer = setInterval(this.tick, 1000);
    this.setState({ timer });
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      viewport: {
        ...nextProps.viewport,
      },
    });
  }

  componentWillUnmount() {
    this.clearInterval(this.state.timer);
  }
  tick() {
    // Limiting updating viewport controls through Redux at most 1*sec
    if (this.state.previousViewport !== this.state.viewport) {
      const setCV = this.props.setControlValue;
      const vp = this.state.viewport;
      setCV('viewport_longitude', vp.longitude);
      setCV('viewport_latitude', vp.latitude);
      setCV('viewport_zoom', vp.zoom);
      setCV('viewport_pitch', vp.pitch);
      setCV('viewport_bearing', vp.bearing);

      this.setState({ previousViewport: this.state.viewport });
    }
  }

  onViewportChange(viewport) {
    const vp = Object.assign({}, viewport);
    delete vp.width;
    delete vp.height;
    const newVp = { ...this.state.viewport, ...vp };

    // TODO do on a timer this affects perf FPS as it's called a lot
    this.setState({
      viewport: newVp,
    });
    this.props.onViewportChange(newVp);
  }
  layers() {
    // Support for layer factory
    if (this.props.layers.some(l => typeof l === 'function')) {
      return this.props.layers.map(l => typeof l === 'function' ? l() : l);
    }
    return this.props.layers;
  }

  render() {
    const { viewport } = this.state;
    return (
      <MapGL
        {...viewport}
        mapStyle={this.props.mapStyle}
        onViewportChange={this.onViewportChange.bind(this)}
        mapboxApiAccessToken={this.props.mapboxApiAccessToken}
      >
        <DeckGL
          {...viewport}
          layers={this.layers()}
        />
      </MapGL>
    );
  }
}

DeckGLContainer.propTypes = propTypes;
DeckGLContainer.defaultProps = defaultProps;
