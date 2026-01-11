'use client';

import { useState, useCallback, useRef } from 'react';
import { tourismAPIService } from '../../services/tourism-api-service';
import { tourismService, TourismResponse, LocationTourismData } from '../../services/api';
import { TourismMapNode, TourismMapConnection, transformTourismDataForMap } from '../../services/api/tourism-flow-transformer';
import { Location } from '../helper';

interface TourismDataState {
  data: LocationTourismData[];
  apiResponse: TourismResponse | null;
  mapNodes: TourismMapNode[];
  mapConnections: TourismMapConnection[];
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
  mapNodes: [],
  mapConnections: [],
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
    selectedPeriod: string = '',
    startDate?: string,
    endDate?: string
  ) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

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
      console.log('Loading tourism data for selected locations:', locations.map(l => l.name));
      
      // Use the TourismAPIService which properly maps Location objects to API IDs
      const result = await tourismAPIService.executeQuery(locations, startDate, endDate);
      
      if (!result.success || !result.apiResponse) {
        setTourismData({
          ...initialState,
          error: result.error || 'Failed to load tourism data'
        });
        return;
      }

      const response = result.apiResponse;
      
      // Transform data for map visualization with the selected period
      const { nodes, connections } = transformTourismDataForMap(response, selectedPeriod);

      // Calculate summary statistics
      const summary = tourismService.calculateSummaryStats(response.data);

      setTourismData({
        data: response.data,
        apiResponse: response,
        mapNodes: nodes,
        mapConnections: connections,
        isLoading: false,
        error: null,
        summary
      });

      console.log('Tourism data loaded successfully:', {
        locations: response.data.length,
        totalArrivals: summary.totalArrivals,
        timePeriods: response.time_periods?.length || 0,
        mapNodes: nodes.length,
        mapConnections: connections.length,
        flows: response.flows?.length || 0
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
