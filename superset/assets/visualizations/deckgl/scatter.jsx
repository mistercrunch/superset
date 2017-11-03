import React from 'react';
import ReactDOM from 'react-dom';
import { ScatterplotLayer } from 'deck.gl';

import DeckGLContainer from './DeckGLContainer';
import { getColorFromScheme, hexToRGB } from '../../javascripts/modules/colors';

const METER_TO_MILE = 1609.34;
const unitToRadius = (unit, num) => {
  if (unit === 'square_m') {
    return Math.sqrt(num / Math.PI);
  } else if (unit === 'radius_m') {
    return num;
  } else if (unit === 'radius_km') {
    return num * 1000;
  } else if (unit === 'radius_miles') {
    return num * METER_TO_MILE;
  } else if (unit === 'square_km') {
    return Math.sqrt(num / Math.PI) * 1000;
  } else if (unit === 'square_km') {
    return Math.sqrt(num / Math.PI) * METER_TO_MILE;
  }
  return null;
};

function deckScatter(slice, payload, setControlValue) {
  const fd = slice.formData;
  const c = fd.color_picker || { r: 0, g: 0, b: 0, a: 1 };
  const fixedColor = [c.r, c.g, c.b, 255 * c.a];

  const data = payload.data.geoJSON.features.map((d) => {
    let radius = unitToRadius(fd.point_unit, d.properties.radius) || 10;
    if (fd.multiplier) {
      radius *= fd.multiplier;
    }
    let color;
    if (fd.dimension) {
      color = hexToRGB(getColorFromScheme(d.properties.cat_color, fd.color_scheme), c.a * 255);
    } else {
      color = fixedColor;
    }
    return {
      radius,
      color,
      position: d.geometry.coordinates,
    };
  });

  const layer = new ScatterplotLayer({
    id: 'scatterplot-layer',
    data,
    pickable: true,
    fp64: true,
    // onHover: info => console.log('Hovered:', info),
    outline: false,
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
