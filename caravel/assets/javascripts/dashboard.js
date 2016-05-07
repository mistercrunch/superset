var $ = window.$ = require('jquery');
var jQuery = window.jQuery = $;
var px = require('./modules/caravel.js');
var d3 = require('d3');
var showModal = require('./modules/utils.js').showModal;
require('bootstrap');

var ace = require('brace');
require('brace/mode/css');
require('brace/theme/crimson_editor');

require('./caravel-select2.js');

require('../stylesheets/dashboard.css');

var ReactGridLayout = require('react-grid-layout');
import React from 'react';
import { render } from 'react-dom';

var Dashboard = function (dashboardData) {
  var dashboard = $.extend(dashboardData, {
    filters: {},
    init: function () {
      this.initDashboardView();
      this.firstLoad = true;
      px.initFavStars();
      var sliceObjects = [],
        dash = this;
      this.refreshTimer = null;
      //this.startPeriodicRender(0);
    },
    setFilter: function (slice_id, col, vals) {
      this.addFilter(slice_id, col, vals, false);
    },
    addFilter: function (slice_id, col, vals, merge) {
      if (merge === undefined) {
        merge = true;
      }
      if (!(slice_id in this.filters)) {
        this.filters[slice_id] = {};
      }
      if (!(col in this.filters[slice_id]) || !merge) {
        this.filters[slice_id][col] = vals;
      } else {
        this.filters[slice_id][col] = d3.merge([this.filters[slice_id][col], vals]);
      }
      this.refreshExcept(slice_id);
    },
    readFilters: function () {
      // Returns a list of human readable active filters
      return JSON.stringify(this.filters, null, 4);
    },
    stopPeriodicRender: function () {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    startPeriodicRender: function (interval) {
      this.stopPeriodicRender();
      var dash = this;
      var maxRandomDelay = Math.min(interval * 0.2, 5000);
      var refreshAll = function () {
        dash.slices.forEach(function (slice) {
          var force = !dash.firstLoad;
          setTimeout(function () {
            slice.render(force);
          },
          //Randomize to prevent all widgets refreshing at the same time
          maxRandomDelay * Math.random());
        });
        dash.firstLoad = false;
      };

      var fetchAndRender = function () {
        refreshAll();
        if (interval > 0) {
          dash.refreshTimer = setTimeout(function () {
            fetchAndRender();
          }, interval);
        }
      };
      fetchAndRender();
    },
    refreshExcept: function (slice_id) {
      var immune = this.metadata.filter_immune_slices || [];
      this.slices.forEach(function (slice) {
        if (slice.data.slice_id !== slice_id && immune.indexOf(slice.data.slice_id) === -1) {
          slice.render();
        }
      });
    },
    clearFilters: function (slice_id) {
      delete this.filters[slice_id];
      this.refreshExcept(slice_id);
    },
    removeFilter: function (slice_id, col, vals) {
      if (slice_id in this.filters) {
        if (col in this.filters[slice_id]) {
          var a = [];
          this.filters[slice_id][col].forEach(function (v) {
            if (vals.indexOf(v) < 0) {
              a.push(v);
            }
          });
          this.filters[slice_id][col] = a;
        }
      }
      this.refreshExcept(slice_id);
    },
    getSlice: function (slice_id) {
      slice_id = parseInt(slice_id, 10);
      for (var i=0; i < this.slices.length; i++) {
        if (this.slices[i].data.slice_id === slice_id) {
          return this.slices[i];
        }
      }
    },
    initDashboardView: function () {

      class App extends React.Component {
        render () {
          return (
            <div>
              <h1>Caravel</h1>
              <p>Extensible visualization tool for exploring data from any database.</p>
            </div>
          );
        }
      }
      $("#grid").css('visibility', 'visible');
      dashboard = this;
      var Grid = React.createClass({
        render: function () {
          return (
            <ReactGridLayout className="layout" cols={12} rowHeight={30} width={1200}>
              <div className="widget" key="a" _grid={{x: 0, y: 0, w: 3, h: 6}}>aaa</div>
              <div className="widget" key="b" _grid={{x: 4, y: 0, w: 3, h: 6}}>bbb</div>
              <div className="widget" key="c" _grid={{x: 8, y: 0, w: 3, h: 6}}>ccc</div>
            </ReactGridLayout>
          )
        }
      });
      render(<Grid/>, document.getElementById('grid'));
      /*
      // Displaying widget controls on hover
      $('.chart-header').hover(
        function () {
          $(this).find('.chart-controls').fadeIn(300);
        },
        function () {
          $(this).find('.chart-controls').fadeOut(300);
        }
      );
      $("#savedash").click(function () {
        var expanded_slices = {};
        $.each($(".slice_info"), function (i, d) {
          var widget = $(this).parents('.widget');
          var slice_description = widget.find('.slice_description');
          if (slice_description.is(":visible")) {
            expanded_slices[$(d).attr('slice_id')] = true;
          }
        });
        var data = {
          positions: gridster.serialize(),
          css: editor.getValue(),
          expanded_slices: expanded_slices
        };
        $.ajax({
          type: "POST",
          url: '/caravel/save_dash/' + dashboard.id + '/',
          data: {
            data: JSON.stringify(data)
          },
          success: function () {
            showModal({
              title: "Success",
              body: "This dashboard was saved successfully."
            });
          },
          error: function (error) {
            showModal({
              title: "Error",
              body: "Sorry, there was an error saving this dashboard:<br />" + error
            });
            console.warn("Save dashboard error", error);
          }
        });
      });

      var editor = ace.edit("dash_css");
      editor.$blockScrolling = Infinity;

      editor.setTheme("ace/theme/crimson_editor");
      editor.setOptions({
        minLines: 16,
        maxLines: Infinity,
        useWorker: false
      });
      editor.getSession().setMode("ace/mode/css");

      $(".select2").select2({
        dropdownAutoWidth: true
      });
      $("#css_template").on("change", function () {
        var css = $(this).find('option:selected').data('css');
        editor.setValue(css);

        $('#dash_css').val(css);
        injectCss("dashboard-template", css);

      });
      $('#filters').click(function () {
        showModal({
          title: "<span class='fa fa-info-circle'></span> Current Global Filters",
          body: "The following global filters are currently applied:<br/>" + dashboard.readFilters()
        });
      });
      $("#refresh_dash_interval").on("change", function () {
        var interval = $(this).find('option:selected').val() * 1000;
        dashboard.startPeriodicRender(interval);
      });
      $('#refresh_dash').click(function () {
        dashboard.slices.forEach(function (slice) {
          slice.render(true);
        });
      });
      $("a.remove-chart").click(function () {
        var li = $(this).parents("li");
        gridster.remove_widget(li);
      });

      $("li.widget").click(function (e) {
        var $this = $(this);
        var $target = $(e.target);

        if ($target.hasClass("slice_info")) {
          $this.find(".slice_description").slideToggle(0, function () {
            $this.find('.refresh').click();
          });
        } else if ($target.hasClass("controls-toggle")) {
          $this.find(".chart-controls").toggle();
        }
      });

      editor.on("change", function () {
        var css = editor.getValue();
        $('#dash_css').val(css);
        injectCss("dashboard-template", css);
      });

      var css = $('.dashboard').data('css');
      injectCss("dashboard-template", css);

      // Injects the passed css string into a style sheet with the specified className
      // If a stylesheet doesn't exist with the passed className, one will be injected into <head>
      function injectCss(className, css) {

        var head  = document.head || document.getElementsByTagName('head')[0];
        var style = document.querySelector('.' + className);

        if (!style) {
          if (className.split(' ').length > 1) {
            throw new Error("This method only supports selections with a single class name.");
          }
          style = document.createElement('style');
          style.className = className;
          style.type = 'text/css';
          head.appendChild(style);
        }

        if (style.styleSheet) {
          style.styleSheet.cssText = css;
        } else {
          style.innerHTML = css;
        }
      }
      */
    }
  });
  dashboard.init();
  return dashboard;
};

$(document).ready(function () {
  Dashboard($('.dashboard').data('dashboard'));
  //$('[data-toggle="tooltip"]').tooltip({ container: 'body' });
});
