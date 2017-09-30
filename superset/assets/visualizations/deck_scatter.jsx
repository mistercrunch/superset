import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import MapGL from 'react-map-gl';
import DeckGL, { LineLayer, ScatterplotLayer } from 'deck.gl';


class DeckGLContainer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      viewport: {
		 longitude: -122.41669,
		 latitude: 37.7853,
		 zoom: 12,
		 pitch: 0,
		 bearing: 0
	  },
	}
  }

  _onViewportChange(viewport) {
    delete viewport.width;
    delete viewport.height;
    this.setState({
      viewport: { ...this.state.viewport, ...viewport }
    });
  }

  render() {
    const {viewport, data} = this.state;
    console.log(this.props.mapStyle);
    return (
      <MapGL
        {...viewport}
        width={this.props.width}
        height={this.props.height}
        mapStyle={this.props.mapStyle}
        onViewportChange={this._onViewportChange.bind(this)}
        mapboxApiAccessToken={this.props.token}>
        <DeckGL
          {...viewport}
          layers={this.props.layers}
          width={this.props.width}
          height={this.props.height}
        />
      </MapGL>
    );
  }
}

function deckScatter(slice, payload) {
  const container = $(slice.selector);
  const fC = d3.format('0,000');

  //const data = payload.data;
  const fd = slice.formData;

  const data = payload.data.geoJSON.features.map(d => ({
    position: d.geometry.coordinates,
    radius: 0.25,
    color:  [128, 0, 0, 128],
  }));

  const layer = new ScatterplotLayer({
    id: 'scatterplot-layer',
    data,
    radiusScale: 100,
    pickable: true,
    // onHover: info => console.log('Hovered:', info),
    outline: false
  });
  ReactDOM.render(
    <DeckGLContainer
      token={payload.data.mapboxApiKey}
      width={slice.width()}
      height={slice.height()}
      layers={[layer]}
      mapStyle={fd.mapbox_style}
    />,
    document.getElementById(slice.containerId),
  );
}
module.exports = deckScatter;
