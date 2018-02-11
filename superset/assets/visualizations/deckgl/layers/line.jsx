import React from 'react';
import ReactDOM from 'react-dom';

import { LineLayer } from 'deck.gl';

import DeckGLContainer from './../DeckGLContainer';

import * as common from './common';
import sandboxedEval from '../../../javascripts/modules/sandbox';

let startDttm;
let timeExt;
let curTime = Date.now();
const tailLength = 0.01;
const colorMap = {
  'idle': [255, 0, 0, 255],
  'dropping_off': [0, 255, 0, 255],
  'picking_up_another': [0, 255, 0, 255],
  'picking_up': [100, 100, 255, 255],
};
function getColor(status) {
  const col = colorMap[status];
  if (!col) {
    return [50, 50, 255, 255]
  }
  return col.slice();
}

function getLayer(formData, payload, slice) {
  const fd = formData;
  const perc = ((Date.now() - startDttm) % (fd.sequence_duration * 1000)) / (fd.sequence_duration * 1000);

  curTime = (perc * (timeExt[1] - timeExt[0])) + timeExt[0];
  const timeWidth = fd.tail_length * 1000;
  const opacityTimeScaler = d3.scale.linear().domain([curTime-timeWidth, curTime]).range([0, 255]);

  const c = fd.color_picker;
  const fixedColor = [c.r, c.g, c.b, 255 * c.a];
  let data = [];
  payload.data.features.forEach(line => {
    const len = line.points.length;
    line.points.forEach((p, i) => {
      if(p.dttm >= curTime - timeWidth  && p.dttm <= curTime) {
        let color = getColor(p.route_status);
        color[3] = opacityTimeScaler(p.dttm);
        data.push([p.source, p.target, color]);
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

  const times = [];
  payload.data.features.forEach(line => {
    line.points.forEach((p, i) => {
      times.push(p.dttm);
    });
  });
  timeExt = d3.extent(times);

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
        overlayContent={() => {
          return (
            <div style={{ fontWeight: 'bold' }}>
              <div>
                {(new Date(curTime)).toISOString().substring(0, 19)}
              </div>
              <div style={{ color: 'green'}}>loaded</div>
              <div style={{ color: 'blue'}}>picking up</div>
              <div style={{ color: 'red'}}>idle</div>
            </div>);
        }}
      />,
    document.getElementById(slice.containerId),
  );
}

module.exports = {
  default: deckLine,
  getLayer,
};
