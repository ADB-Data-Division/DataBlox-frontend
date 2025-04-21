import { VISUALIZATION_TYPES } from '../types';
import { ToolbarState, ToolbarAction } from './types';

/**
 * Reducer function for visualization toolbar state
 */
export function toolbarReducer(state: ToolbarState, action: ToolbarAction): ToolbarState {
  switch (action.type) {
    case 'SET_PROVINCES':
      return {
        ...state,
        filters: {
          ...state.filters,
          provinces: action.payload
        },
        isDirty: true
      };
    
    case 'SET_TIME_PERIOD':
      return {
        ...state,
        filters: {
          ...state.filters,
          timePeriod: action.payload.timePeriod,
          startDate: action.payload.startDate,
          endDate: action.payload.endDate
        },
        isDirty: true
      };
    
    case 'SET_VISUALIZATION_TYPE':
      return {
        ...state,
        filters: {
          ...state.filters,
          visualizationType: action.payload
        },
        isDirty: true
      };
    
    case 'SET_SUBACTION':
      const newSubaction = action.payload;
      if (!newSubaction) {
        return state;
      }
      const supportedVisualizations = VISUALIZATION_TYPES.filter(v => 
        v.supportedSubactions.includes(newSubaction)
      );
      
      return {
        ...state,
        filters: {
          ...state.filters,
          subaction: newSubaction
        },
        supportedVisualizations,
        isDirty: true
      };
    
    case 'SET_DATASET_ID':
      return {
        ...state,
        filters: {
          ...state.filters,
          datasetId: action.payload
        },
        isDirty: true
      };
    
    case 'SET_DATASET_METADATA':
      return {
        ...state,
        datasetMetadata: action.payload
      };
    
    case 'UPDATE_FILTERS_FROM_REDUX':
      return {
        ...state,
        filters: {
          ...state.filters,
          provinces: action.payload.provinces,
          timePeriod: action.payload.timePeriod,
          startDate: action.payload.startDate,
          endDate: action.payload.endDate,
          datasetId: action.payload.datasetId
        }
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          provinces: [],
          timePeriod: null,
          visualizationType: null,
          dataType: null,
          datasetId: null,
          subaction: null
        },
        datasetMetadata: null,
        supportedVisualizations: [],
        isDirty: false
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'TOGGLE_COLLAPSE':
      return {
        ...state,
        isCollapsed: action.payload
      };
    
    case 'SET_SUPPORTED_VISUALIZATION_TYPES':
      return {
        ...state,
        supportedVisualizations: action.payload
      };
    
    default:
      return state;
  }
} 