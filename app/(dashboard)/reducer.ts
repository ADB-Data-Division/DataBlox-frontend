import { Location } from './helper';

/**
 * State interface for the map view component
 */
export interface MapViewState {
  searchQuery: string;
  selectedLocations: Location[];
  isLoading: boolean;
  showShortcutsModal: boolean;
  highlightedForDeletion: number | null;
  queryExecutionState: 'idle' | 'loading' | 'success' | 'error';
  showSearchResults: boolean;
  selectedPeriod: string; // Migration analysis period (e.g., "2020-q1", "2020-q2", etc.)
}

/**
 * Action types for the reducer
 */
export type MapViewAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'ADD_LOCATION'; payload: Location }
  | { type: 'REMOVE_LOCATION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHORTCUTS_MODAL'; payload: boolean }
  | { type: 'SET_HIGHLIGHTED_FOR_DELETION'; payload: number | null }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'CLEAR_HIGHLIGHTED' }
  | { type: 'HIGHLIGHT_LAST_LOCATION' }
  | { type: 'REMOVE_HIGHLIGHTED_LOCATION' }
  | { type: 'START_QUERY_EXECUTION' }
  | { type: 'SET_QUERY_SUCCESS' }
  | { type: 'SET_QUERY_ERROR' }
  | { type: 'RESET_QUERY_STATE' }
  | { type: 'CLEAR_ALL_LOCATIONS' }
  | { type: 'SET_SELECTED_PERIOD'; payload: string };

/**
 * Initial state for the reducer
 */
export const initialState: MapViewState = {
  searchQuery: '',
  selectedLocations: [],
  isLoading: false,
  showShortcutsModal: false,
  highlightedForDeletion: null,
  queryExecutionState: 'idle',
  showSearchResults: true,
  selectedPeriod: '2020-all', // Default to "All" period
};

/**
 * Reducer function for managing map view state
 */
export function mapViewReducer(state: MapViewState, action: MapViewAction): MapViewState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
        highlightedForDeletion: null, // Clear highlight when typing
        // Show search results when user starts typing (reset from success state)
        showSearchResults: true,
        queryExecutionState: state.queryExecutionState === 'success' ? 'idle' : state.queryExecutionState,
      };

    case 'ADD_LOCATION':
      // Don't add if already selected
      if (state.selectedLocations.find(loc => loc.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        selectedLocations: [...state.selectedLocations, action.payload],
        searchQuery: '', // Clear search after selection
        highlightedForDeletion: null, // Clear any highlighted item
      };

    case 'REMOVE_LOCATION':
      return {
        ...state,
        selectedLocations: state.selectedLocations.filter(loc => loc.id !== action.payload),
        highlightedForDeletion: null, // Clear highlighted state
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_SHORTCUTS_MODAL':
      return {
        ...state,
        showShortcutsModal: action.payload,
      };

    case 'SET_HIGHLIGHTED_FOR_DELETION':
      return {
        ...state,
        highlightedForDeletion: action.payload,
      };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchQuery: '',
      };

    case 'CLEAR_HIGHLIGHTED':
      return {
        ...state,
        highlightedForDeletion: null,
      };

    case 'HIGHLIGHT_LAST_LOCATION':
      if (state.selectedLocations.length === 0) {
        return state;
      }
      const lastLocation = state.selectedLocations[state.selectedLocations.length - 1];
      return {
        ...state,
        highlightedForDeletion: lastLocation.id,
      };

    case 'REMOVE_HIGHLIGHTED_LOCATION':
      if (state.highlightedForDeletion === null) {
        return state;
      }
      return {
        ...state,
        selectedLocations: state.selectedLocations.filter(
          loc => loc.id !== state.highlightedForDeletion
        ),
        highlightedForDeletion: null,
      };

    case 'START_QUERY_EXECUTION':
      return {
        ...state,
        queryExecutionState: 'loading',
        showSearchResults: false, // Hide search results
        isLoading: true,
      };

    case 'SET_QUERY_SUCCESS':
      return {
        ...state,
        queryExecutionState: 'success',
        isLoading: false,
      };

    case 'SET_QUERY_ERROR':
      return {
        ...state,
        queryExecutionState: 'error',
        isLoading: false,
        showSearchResults: true, // Show search results again on error
      };

    case 'RESET_QUERY_STATE':
      return {
        ...state,
        queryExecutionState: 'idle',
        showSearchResults: true,
        isLoading: false,
      };

    case 'CLEAR_ALL_LOCATIONS':
      return {
        ...state,
        selectedLocations: [],
        highlightedForDeletion: null,
      };

    case 'SET_SELECTED_PERIOD':
      return {
        ...state,
        selectedPeriod: action.payload,
      };

    default:
      return state;
  }
} 