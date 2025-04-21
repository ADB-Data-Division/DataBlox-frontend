import { Province } from '@/models/province-district-subdistrict';
import { Subaction, VisualizationMethod, VisualizationType } from '../types';
import { DatasetMetadata } from '@/models/datasets';

export interface VisualizationFilters {
  provinces: Province[];
  timePeriod: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visualizationType: VisualizationMethod | null;
  dataType: Subaction | null;
  subaction: Subaction | null;
  datasetId: string | null;
}

export interface ToolbarState {
  filters: VisualizationFilters;
  datasetMetadata: DatasetMetadata | null;
  supportedVisualizations: VisualizationType[];
  isDirty: boolean;
  isLoading: boolean;
  isCollapsed: boolean;
}

export type ToolbarAction =
  | { type: 'SET_PROVINCES'; payload: Province[] }
  | { type: 'SET_TIME_PERIOD'; payload: { timePeriod: string | null; startDate?: string | null; endDate?: string | null } }
  | { type: 'SET_VISUALIZATION_TYPE'; payload: VisualizationMethod | null }
  | { type: 'SET_SUBACTION'; payload: Subaction | null }
  | { type: 'SET_DATASET_ID'; payload: string | null }
  | { type: 'SET_DATASET_METADATA'; payload: DatasetMetadata }
  | { type: 'UPDATE_FILTERS_FROM_REDUX'; payload: { provinces: Province[]; timePeriod: string | null; startDate?: string | null; endDate?: string | null; datasetId: string | null } }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'TOGGLE_COLLAPSE'; payload: boolean }
  | { type: 'SET_SUPPORTED_VISUALIZATION_TYPES'; payload: VisualizationType[] }; 