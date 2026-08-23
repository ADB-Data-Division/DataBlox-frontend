import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CoastalAggFunc, CoastalGrain } from '@/types/coastal';

export interface CoastalState {
  country: string;
  aois: string[];
  dateRange: {
    start_date: string;
    end_date: string;
  };
  grain: CoastalGrain;
  indicators: string[];
  aggFunc: CoastalAggFunc;
  vesselMetric: string;
  activeTab: number;
  activeChoroplethIndicator: string;
  selectedHexCell: string | null;
  selectedPeriodIndex: number;
}

const initialState: CoastalState = {
  country: 'IDN',
  aois: [],
  dateRange: {
    start_date: '2019-01-01',
    end_date: '2025-12-31',
  },
  grain: 'monthly',
  indicators: ['chlor_a', 'vessels'],
  aggFunc: 'average',
  vesselMetric: 'Vessel Count',
  activeTab: 0,
  activeChoroplethIndicator: 'chlor_a',
  selectedHexCell: null,
  selectedPeriodIndex: 6,
};

export const coastalSlice = createSlice({
  name: 'coastal',
  initialState,
  reducers: {
    setCountry: (state, action: PayloadAction<string>) => {
      state.country = action.payload;
      state.aois = [];
      state.selectedHexCell = null;
    },
    setAois: (state, action: PayloadAction<string[]>) => {
      state.aois = action.payload;
    },
    setDateRange: (
      state,
      action: PayloadAction<{ start_date: string; end_date: string }>
    ) => {
      state.dateRange = action.payload;
    },
    setGrain: (state, action: PayloadAction<CoastalGrain>) => {
      state.grain = action.payload;
    },
    setIndicators: (state, action: PayloadAction<string[]>) => {
      state.indicators = action.payload.slice(0, 2);
    },
    toggleIndicator: (state, action: PayloadAction<string>) => {
      const ind = action.payload;
      if (state.indicators.includes(ind)) {
        if (state.indicators.length > 1) {
          state.indicators = state.indicators.filter((x) => x !== ind);
        }
      } else {
        if (state.indicators.length < 2) {
          state.indicators.push(ind);
        } else {
          state.indicators = [state.indicators[0], ind];
        }
      }
    },
    setAggFunc: (state, action: PayloadAction<CoastalAggFunc>) => {
      state.aggFunc = action.payload;
    },
    setVesselMetric: (state, action: PayloadAction<string>) => {
      state.vesselMetric = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<number>) => {
      state.activeTab = action.payload;
    },
    setActiveChoroplethIndicator: (state, action: PayloadAction<string>) => {
      state.activeChoroplethIndicator = action.payload;
    },
    setSelectedHexCell: (state, action: PayloadAction<string | null>) => {
      state.selectedHexCell = action.payload;
    },
    setSelectedPeriodIndex: (state, action: PayloadAction<number>) => {
      state.selectedPeriodIndex = action.payload;
    },
    resetFilters: (state) => {
      state.indicators = ['chlor_a', 'vessels'];
      state.aggFunc = 'average';
      state.grain = 'monthly';
      state.selectedHexCell = null;
    },
  },
});

export const {
  setCountry,
  setAois,
  setDateRange,
  setGrain,
  setIndicators,
  toggleIndicator,
  setAggFunc,
  setVesselMetric,
  setActiveTab,
  setActiveChoroplethIndicator,
  setSelectedHexCell,
  setSelectedPeriodIndex,
  resetFilters,
} = coastalSlice.actions;

export default coastalSlice.reducer;
