'use client';

import { useState, useCallback, useRef } from 'react';
import { tourismService, TourismQueryOptions, TourismResponse, LocationTourismData } from '../../services/api';
import { Location } from '../helper';

interface TourismDataState {
  data: LocationTourismData[];
  apiResponse: TourismResponse | null;
  isLoading: boolean;
  error: string | null;
  summary: {
    totalArrivals: number;
    locationCount: number;
    averageArrivalsPerLocation: number;
  } | null;
}

const initialState: TourismDataState = {
  data: [],
  apiResponse: null,
  isLoading: false,
  error: null,
  summary: null
};

/**
 * Hook for fetching and managing tourism data
 * Note: Tourism data is province-level only (no district/subdistrict support)
 */
export function useTourismData() {
  const [tourismData, setTourismData] = useState<TourismDataState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load tourism data for selected locations
   * Only province-type locations are supported for tourism API
   */
  const loadTourismData = useCallback(async (
    locations: Location[], 
    startDate?: string,
    endDate?: string,
    aggregation?: 'monthly' | 'quarterly' | 'yearly'
  ) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Filter to only province-level locations (tourism API only supports province)
    const provinceLocations = locations.filter(l => l.type === 'province');
    
    if (provinceLocations.length === 0 && locations.length > 0) {
      setTourismData({
        ...initialState,
        error: 'Tourism data is only available at province level. Please select provinces instead of districts or subdistricts.'
      });
      return;
    }

    if (locations.length === 0) {
      setTourismData({
        ...initialState,
        error: 'No locations selected'
      });
      return;
    }

    // Clear existing data and show loading state immediately
    setTourismData({
      ...initialState,
      isLoading: true
    });
    
    try {
      console.log('Loading tourism data for selected provinces:', provinceLocations.map(l => l.name));
      
      // Map Location objects to province IDs for the API
      const provinceIds = provinceLocations.map(loc => {
        // Try to extract API ID from uniqueId if available
        if (loc.uniqueId?.startsWith('api-pr-')) {
          return loc.uniqueId.replace('api-pr-', '');
        }
        // Otherwise use the name as-is (API accepts province names)
        return loc.name;
      });

      const queryOptions: TourismQueryOptions = {
        startDate,
        endDate,
        provinceIds,
        aggregation: aggregation || 'monthly',
        includeFlows: false,
        aggregateOthers: true
      };

      const response = await tourismService.getTourismData(queryOptions);
      
      // Calculate summary statistics
      const summary = tourismService.calculateSummaryStats(response.data);

      setTourismData({
        data: response.data,
        apiResponse: response,
        isLoading: false,
        error: null,
        summary
      });

      console.log('Tourism data loaded successfully:', {
        locations: response.data.length,
        totalArrivals: summary.totalArrivals,
        timePeriods: response.time_periods.length
      });
    } catch (error) {
      // Don't update state if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to load tourism data:', error);
      setTourismData({
        ...initialState,
        error: error instanceof Error ? error.message : 'Failed to load tourism data'
      });
    }
  }, []);

  /**
   * Reset tourism data to initial state
   */
  const resetTourismData = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTourismData(initialState);
  }, []);

  /**
   * Set loading state (useful for UI transitions)
   */
  const setLoadingState = useCallback(() => {
    setTourismData({
      ...initialState,
      isLoading: true
    });
  }, []);

  /**
   * Get top destinations from the current data
   */
  const getTopDestinations = useCallback((limit: number = 10) => {
    if (!tourismData.data.length) return [];
    return tourismService.getTopDestinations(tourismData.data, limit);
  }, [tourismData.data]);

  /**
   * Filter current data by specific time periods
   */
  const filterByTimePeriod = useCallback((timePeriodIds: string[]) => {
    if (!tourismData.data.length) return [];
    return tourismService.filterByTimePeriod(tourismData.data, timePeriodIds);
  }, [tourismData.data]);

  /**
   * Get aggregated totals across all time periods
   */
  const getAggregatedData = useCallback(() => {
    if (!tourismData.data.length) return [];
    return tourismService.aggregateAcrossTime(tourismData.data);
  }, [tourismData.data]);

  return {
    tourismData,
    loadTourismData,
    resetTourismData,
    setLoadingState,
    getTopDestinations,
    filterByTimePeriod,
    getAggregatedData
  };
}
