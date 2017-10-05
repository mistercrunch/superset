import React from 'react';
import ReactDOM from 'react-dom';
import { ScatterplotLayer } from 'deck.gl';

import DeckGLContainer from './deckgl/DeckGLContainer';

const radiusScaleMultiplier = {
  Miles: 1609.34,
  Kilometers: 1000,
  Pixels: 5,
};

function deckScatter(slice, payload, setControlValue) {
  const fd = slice.formData;
  const c = fd.color_picker;
  const data = payload.data.geoJSON.features.map(d => ({
    position: d.geometry.coordinates,
    radius: fd.point_radius_fixed || 1,
    color: [c.r, c.g, c.b, 255 * c.a],
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
    pitch: fd.viewport_pitch,
    bearing: fd.viewport_bearing,
  };
  ReactDOM.render(
    <DeckGLContainer
      mapboxApiAccessToken={payload.data.mapboxApiKey}
      viewport={viewport}
      layers={[layer]}
      mapStyle={fd.mapbox_style}
      setControlValue={setControlValue}
    />,
    document.getElementById(slice.containerId),
  );
}
module.exports = deckScatter;
