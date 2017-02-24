/* eslint camelcase: 0 */
import { getControlsState, getFormDataFromControls } from '../stores/store';
import * as actions from '../actions/exploreActions';
import { now } from '../../modules/dates';

export const exploreReducer = function (state, action) {
  const actionHandlers = {
    [actions.TOGGLE_FAVE_STAR]() {
      return Object.assign({}, state, { isStarred: action.isStarred });
    },

    [actions.FETCH_DATASOURCE_STARTED]() {
      return Object.assign({}, state, { isDatasourceMetaLoading: true });
    },

    [actions.FETCH_DATASOURCE_SUCCEEDED]() {
      return Object.assign({}, state, { isDatasourceMetaLoading: false });
    },

    [actions.FETCH_DATASOURCE_FAILED]() {
      // todo(alanna) handle failure/error state
      return Object.assign({}, state,
        {
          isDatasourceMetaLoading: false,
          controlPanelAlert: action.error,
        });
    },
    [actions.SET_DATASOURCE]() {
      return Object.assign({}, state, { datasource: action.datasource });
    },
    [actions.FETCH_DATASOURCES_STARTED]() {
      return Object.assign({}, state, { isDatasourcesLoading: true });
    },

    [actions.FETCH_DATASOURCES_SUCCEEDED]() {
      return Object.assign({}, state, { isDatasourcesLoading: false });
    },

    [actions.FETCH_DATASOURCES_FAILED]() {
      // todo(alanna) handle failure/error state
      return Object.assign({}, state,
        {
          isDatasourcesLoading: false,
          controlPanelAlert: action.error,
        });
    },
    [actions.SET_DATASOURCES]() {
      return Object.assign({}, state, { datasources: action.datasources });
    },
    [actions.REMOVE_CONTROL_PANEL_ALERT]() {
      return Object.assign({}, state, { controlPanelAlert: null });
    },
    [actions.FETCH_DASHBOARDS_SUCCEEDED]() {
      return Object.assign({}, state, { dashboards: action.choices });
    },

    [actions.FETCH_DASHBOARDS_FAILED]() {
      return Object.assign({}, state,
        { saveModalAlert: `fetching dashboards failed for ${action.userId}` });
    },
    [actions.SET_FIELD_VALUE]() {
      const controls = Object.assign({}, state.controls);
      const control = Object.assign({}, controls[action.controlName]);
      control.value = action.value;
      control.validationErrors = action.validationErrors;
      controls[action.controlName] = control;
      const changes = { controls };
      if (control.renderTrigger) {
        changes.triggerRender = true;
      }
      return Object.assign({}, state, changes);
    },
    [actions.CHART_UPDATE_SUCCEEDED]() {
      return Object.assign(
        {},
        state,
        {
          chartStatus: 'success',
          queryResponse: action.queryResponse,
        }
      );
    },
    [actions.REMOVE_CHART_ALERT]() {
      if (state.chartAlert !== null) {
        return Object.assign({}, state, { chartAlert: null });
      }
      return state;
    },
    [actions.SAVE_SLICE_FAILED]() {
      return Object.assign({}, state, { saveModalAlert: 'Failed to save slice' });
    },
    [actions.REMOVE_SAVE_MODAL_ALERT]() {
      return Object.assign({}, state, { saveModalAlert: null });
    },
    [actions.RESET_FIELDS]() {
      const controls = getControlsState(state, getFormDataFromControls(state.controls));
      return Object.assign({}, state, { controls });
    },
    [actions.RENDER_TRIGGERED]() {
      return Object.assign({}, state, { triggerRender: false });
    },
  };
  if (action.type in actionHandlers) {
    return actionHandlers[action.type]();
  }
  return state;
};
