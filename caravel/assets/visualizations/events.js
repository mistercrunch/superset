import d3 from 'd3';
import { formatDate } from '../javascripts/modules/dates';
import { category21 } from '../javascripts/modules/colors';
const d3tip = require('d3-tip');
require('./events.css');

const CIRCLE_DIAMETER = 15;

function eventsViz(slice) {
  function refresh() {
    d3.json(slice.jsonEndpoint(), function (error, payload) {
      if (error) {
        slice.error(error.responseText, error);
        return;
      }
      const categories = [];
      payload.data.forEach(d => {
        if (categories.indexOf(d.category) < 0) {
          categories.push(d.category);
        }
      });
      const width = slice.width();
      const height = slice.height();
      const div = d3.select(slice.selector);
      const ext = d3.extent(payload.data, r => r.ts);

      div.selectAll('*').remove();

      const svg = div.append('svg')
        .attr('width', width)
        .attr('height', height);

      const padding = 10;
      const axisHeight = 40;
      const axisWidth = 150;

      const yScale = d3.scale.ordinal()
        .domain(categories)
        .rangePoints([CIRCLE_DIAMETER / 2, height - (axisHeight + CIRCLE_DIAMETER)]);

      const xScale = d3.time.scale()
        .domain(ext)
        .range([axisWidth, width - padding]);

      const xAxis = d3.svg.axis()
        .orient('bottom')
        .tickFormat(formatDate)
        .scale(xScale);

      const yAxis = d3.svg.axis()
        .orient('left')
        .scale(yScale);

      svg.append('g')
        .attr('transform', `translate(0, ${height - axisHeight})`)
        .attr('class', 'xaxis axis')
        .call(xAxis);

      svg.append('g')
        .attr('transform', `translate(${axisWidth}, 0)`)
        .attr('class', 'yaxis axis')
        .call(yAxis);

      const tip = d3tip()
        .attr('class', 'd3-tip')
        .offset([0, -CIRCLE_DIAMETER / 2])
        .html(d => `<pre>${JSON.stringify(d, null, '  ')}</pre>`);
      svg.call(tip);

      svg.selectAll('circle')
      .data(payload.data)
      .enter()
      .append('circle')
      .attr('r', CIRCLE_DIAMETER / 2)
      .attr('cx', d => xScale(d.ts))
      .attr('cy', d => yScale(d.category) + (Math.random() * height / categories.length))
      .style('opacity', 0.25)
      .style('fill', d => category21(d.category))
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);

      slice.done(payload);
    });
  }
  return {
    render: refresh,
    resize: refresh,
  };
}

module.exports = eventsViz;
