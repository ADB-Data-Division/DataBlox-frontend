import { ToolbarAction, VisualizationFilters } from './types';
import { Province } from '@/models/province-district-subdistrict';
import { DatasetMetadata } from '@/models/datasets';
import { Subaction, VisualizationMethod, VisualizationType } from '../types';

/**
 * Action creators for visualization toolbar
 */

export const setProvinces = (provinces: Province[]): ToolbarAction => ({
  type: 'SET_PROVINCES',
  payload: provinces
});

export const setTimePeriod = (timePeriod: string, startDate?: string, endDate?: string): ToolbarAction => ({
  type: 'SET_TIME_PERIOD',
  payload: { timePeriod, startDate, endDate }
});

export const setVisualizationType = (visualizationType: VisualizationMethod): ToolbarAction => ({
  type: 'SET_VISUALIZATION_TYPE',
  payload: visualizationType
});

export const setSubaction = (subaction: Subaction): ToolbarAction => ({
  type: 'SET_SUBACTION',
  payload: subaction
});

export const setDatasetId = (datasetId: string | null): ToolbarAction => ({
  type: 'SET_DATASET_ID',
  payload: datasetId
});

export const setDatasetMetadata = (metadata: DatasetMetadata): ToolbarAction => ({
  type: 'SET_DATASET_METADATA',
  payload: metadata
});

export const updateFiltersFromRedux = (
  provinces: Province[], 
  timePeriod: string | null, 
  startDate?: string, 
  endDate?: string, 
  datasetId?: string | null
): ToolbarAction => ({
  type: 'UPDATE_FILTERS_FROM_REDUX',
  payload: { 
    provinces, 
    timePeriod, 
    startDate, 
    endDate, 
    datasetId: datasetId ?? null 
  }
});

export const resetFilters = (): ToolbarAction => ({
  type: 'RESET_FILTERS'
});

export const setLoading = (isLoading: boolean): ToolbarAction => ({
  type: 'SET_LOADING',
  payload: isLoading
});

/**
 * Toggles presentation mode on or off
 */
export const toggleCollapse = (isCollapsed: boolean): ToolbarAction => ({
  type: 'TOGGLE_COLLAPSE',
  payload: isCollapsed
});

/**
 * Sets the supported visualization types based on dataset metadata
 */
export const setSupportedVisualizationTypes = (visualizationTypes: VisualizationType[]): ToolbarAction => ({
  type: 'SET_SUPPORTED_VISUALIZATION_TYPES',
  payload: visualizationTypes
}); 