import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import MapGL from 'react-map-gl';
import DeckGL, { LineLayer, ScatterplotLayer } from 'deck.gl';


class DeckGLContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: props.viewport,
	}
  }

  _onViewportChange(viewport) {
    delete viewport.width;
    delete viewport.height;
    // TODO this affects perf FPS as it's called a lot, optimize
    this.props.setControlValue('viewport_longitude', viewport.longitude);
    this.props.setControlValue('viewport_latitude', viewport.latitude);
    this.props.setControlValue('viewport_zoom', viewport.zoom);
    this.setState({
      viewport: { ...this.state.viewport, ...viewport }
    });
  }

  render() {
    const {viewport, data} = this.state;
    return (
      <MapGL
        {...viewport}
        mapStyle={this.props.mapStyle}
        onViewportChange={this._onViewportChange.bind(this)}
        mapboxApiAccessToken={this.props.token}>
        <DeckGL
          {...viewport}
          layers={this.props.layers}
        />
      </MapGL>
    );
  }
}

const radiusScaleMultiplier = {
  'Miles': 1609.34,
  'Kilometers': 1000,
  'Pixels': 5,
};

function deckScatter(slice, payload, setControlValue) {
  const container = $(slice.selector);
  const fC = d3.format('0,000');

  //const data = payload.data;
  const fd = slice.formData;
  const c = fd.color_picker;
  const data = payload.data.geoJSON.features.map(d => ({
    position: d.geometry.coordinates,
    radius: fd.point_radius_fixed || 1,
    color:  [c.r, c.g, c.b, 255 * c.a],
  }));

  const layer = new ScatterplotLayer({
    id: 'scatterplot-layer',
    data,
    pickable: true,
    // onHover: info => console.log('Hovered:', info),
    outline: false,
    radiusScale: radiusScaleMultiplier[fd.point_radius_unit],
  });
  const viewport = {
    width: slice.width(),
    height: slice.height(),
    latitude: fd.viewport_latitude,
    longitude: fd.viewport_longitude,
    zoom: fd.viewport_zoom,
  };
  ReactDOM.render(
    <DeckGLContainer
      token={payload.data.mapboxApiKey}
      viewport={viewport}
      layers={[layer]}
      mapStyle={fd.mapbox_style}
      setControlValue={setControlValue}
    />,
    document.getElementById(slice.containerId),
  );
}
module.exports = deckScatter;
