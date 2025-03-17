import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';
import STATIC_PROVINCES from '@/public/provinces.json';
import { Province } from '@/models/province-district-subdistrict';
// Define types for our state
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface Filter {
  type: 'province' | 'industry' | 'district' | 'datetime';
  filter_id: string;
}

export interface ProvinceFilter extends Filter {
  type: 'province';
  province_ids: string[];
}

export interface IndustryFilter extends Filter {
  type: 'industry';
  industry_id: string;
}

export interface DistrictFilter extends Filter {
  type: 'district';
  district_id: string;
}

export interface DateTimeFilter extends Filter {
  type: 'datetime';
  start_date: string;
  end_date: string;
}

export interface DatasetState {
  datasetId: string;
  timePeriod: string;
  dateRange: DateRange;
  /**
   * All the available provinces in the dataset.
   */
  provinces: Province[];
  /**
   * All the filters applied to the dataset.
   */
  filters: Filter[];
  isLoading: boolean;
  error: string | null;
}

// Define the initial state
const initialState: DatasetState = {
  datasetId: 'default',
  timePeriod: 'last-month',
  dateRange: {
    startDate: undefined,
    endDate: undefined,
  },
  provinces: [],
  filters: [],
  isLoading: false,
  error: null,
};

// Create the slice
export const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    // Set the dataset ID
    setDatasetId: (state, action: PayloadAction<string>) => {
      state.datasetId = action.payload;
    },
    
    // Set the time period
    setTimePeriod: (state, action: PayloadAction<string>) => {
      state.timePeriod = action.payload;
      
      // If custom time period, keep the date range
      // Otherwise, clear the date range
      if (action.payload !== 'custom') {
        state.dateRange = {
          startDate: undefined,
          endDate: undefined,
        };
      }
    },
    
    // Set a specific date in the date range
    setDateRange: (state, action: PayloadAction<DateRange>) => {
      state.dateRange = action.payload;
    },
    
    // Set a specific date (startDate or endDate)
    setDate: (state, action: PayloadAction<{ field: 'startDate' | 'endDate', value: string | undefined }>) => {
      const { field, value } = action.payload;
      state.dateRange[field] = value;
    },
    
    // Set provinces
    setProvinces: (state, action: PayloadAction<Province[]>) => {
      state.provinces = action.payload;
    },
    
    // Add a filter
    addFilter: (state, action: PayloadAction<Filter>) => {
      // Remove any existing filter of the same type and ID
      state.filters = state.filters.filter(
        filter => !(filter.type === action.payload.type && filter.filter_id === action.payload.filter_id)
      );
      
      // Add the new filter
      state.filters.push(action.payload);
    },
    
    // Remove a filter
    removeFilter: (state, action: PayloadAction<{ type: Filter['type'], filter_id: string }>) => {
      const { type, filter_id } = action.payload;
      state.filters = state.filters.filter(
        filter => !(filter.type === type && filter.filter_id === filter_id)
      );
    },
    
    // Clear all filters
    clearFilters: (state) => {
      state.filters = [];
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Reset to initial state
    resetDataset: (state) => {
      return initialState;
    },
    
    // Clear persisted state (useful for logout or clearing cache)
    clearPersistedState: () => {
      return initialState;
    },
  },
});

// Export actions
export const {
  setDatasetId,
  setTimePeriod,
  setDateRange,
  setDate,
  setProvinces,
  addFilter,
  removeFilter,
  clearFilters,
  setLoading,
  setError,
  resetDataset,
  clearPersistedState,
} = datasetSlice.actions;

// Export reducer
export default datasetSlice.reducer; 