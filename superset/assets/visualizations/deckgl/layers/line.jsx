import React from 'react';
import ReactDOM from 'react-dom';

import { LineLayer } from 'deck.gl';

import DeckGLContainer from './../DeckGLContainer';

import * as common from './common';
import sandboxedEval from '../../../javascripts/modules/sandbox';

let DURATION = 30000;
let startDttm;
let timeExt;
const tailLength = 6;

function getLayer(formData, payload, slice) {
  const perc = ((Date.now() - startDttm) % DURATION) / DURATION;
  const fd = formData;
  const c = fd.color_picker;
  const fixedColor = [c.r, c.g, c.b, 255 * c.a];
  let data = [];
  payload.data.features.forEach(line => {
    const len = line.points.length;
    const frame = parseInt(perc * len);
    line.points.forEach((p, i) => {
      if(i >= frame - tailLength  && i <= frame) {

        const color = fixedColor.slice();
        color[3] = ((tailLength - (frame - i)) * 255) / tailLength;
        data.push([p[1], p[2], color]);
      }
    });
  });

  if (fd.js_data_mutator) {
    const jsFnMutator = sandboxedEval(fd.js_data_mutator);
    data = jsFnMutator(data);
  }
  const defaultColor = [255, 0, 255, 128];
  return new LineLayer({
    id: `line-layer-${fd.slice_id}`,
    data,
    strokeWidth: fd.line_width,
    ...common.commonLayerProps(fd, slice),
    getSourcePosition: d => d[1],
    getTargetPosition: d => d[0],
    getColor: d => d[2],
  });
}

function deckLine(slice, payload, setControlValue) {
  startDttm = Date.now();
  console.log(payload.data.features);
  const layerGenerator = () => {
    return getLayer(slice.formData, payload, slice);
  };
  const viewport = {
    ...slice.formData.viewport,
    width: slice.width(),
    height: slice.height(),
  };
  ReactDOM.render(
    <DeckGLContainer
      mapboxApiAccessToken={payload.data.mapboxApiKey}
      viewport={viewport}
      layers={[layerGenerator]}
      mapStyle={slice.formData.mapbox_style}
      setControlValue={setControlValue}
      renderFrequency={30}
    />,
    document.getElementById(slice.containerId),
  );
}

module.exports = {
  default: deckLine,
  getLayer,
};
