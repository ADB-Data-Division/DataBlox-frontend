'use client';

import { useState, useCallback, useRef } from 'react';
import { MigrationAPIService } from '../../services/migration-api-service';
import { transformMigrationDataForMap, getAvailableTimePeriods } from '../../services/api';
import type { MigrationResponse, MapNode, MapConnection } from '../../services/api';
import { Location } from '../helper';

interface MigrationDataState {
  mapNodes: MapNode[];
  mapConnections: MapConnection[];
  apiResponse: MigrationResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useMigrationData() {
  const [migrationData, setMigrationData] = useState<MigrationDataState>({
    mapNodes: [],
    mapConnections: [],
    apiResponse: null,
    isLoading: false,
    error: null
  });

  const migrationAPIService = useRef<MigrationAPIService | null>(null);

  const loadMigrationData = useCallback(async (
    locations: Location[], 
    selectedPeriod: string = '2020-all',
    startDate?: string,
    endDate?: string
  ) => {

    if (!migrationAPIService.current) {
      migrationAPIService.current = new MigrationAPIService();
    }

    // Clear existing data and show loading state immediately
    setMigrationData({
      mapNodes: [],
      mapConnections: [],
      apiResponse: null,
      isLoading: true,
      error: null
    });
    
    try {
      console.log('Loading migration data for selected locations:', locations.map(l => l.name));
      
      const result = await migrationAPIService.current.executeQuery(locations, startDate, endDate);
      
      if (result.success && result.data?.apiResponse) {
        const apiResponse = result.data.apiResponse as MigrationResponse;
        
        const timePeriods = getAvailableTimePeriods(apiResponse);
        console.log('Available time periods:', timePeriods);
        console.log('Current selected period:', selectedPeriod);
        
        const matchingPeriod = timePeriods.find(p => p.id === selectedPeriod);
        const timePeriodId = matchingPeriod?.id || timePeriods[0]?.id || '';
        
        console.log('Using time period ID:', timePeriodId);
        
        const { nodes, connections } = transformMigrationDataForMap(apiResponse, timePeriodId);
        
        setMigrationData({
          mapNodes: nodes,
          mapConnections: connections,
          apiResponse,
          isLoading: false,
          error: null
        });

        console.log('Migration data loaded successfully:', {
          locations: apiResponse.data.length,
          flows: apiResponse.flows?.length || 0,
          nodes: nodes.length,
          connections: connections.length,
          selectedPeriod: timePeriodId
        });
      } else {
        setMigrationData(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'No migration data available for the selected locations'
        }));
      }
    } catch (error) {
      console.error('Failed to load migration data:', error);
      setMigrationData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load migration data'
      }));
    }
  }, []);


  const resetMigrationData = useCallback(() => {
    setMigrationData({
      mapNodes: [],
      mapConnections: [],
      apiResponse: null,
      isLoading: false,
      error: null
    });
  }, []);

  const setLoadingState = useCallback(() => {
    setMigrationData({
      mapNodes: [],
      mapConnections: [],
      apiResponse: null,
      isLoading: true,
      error: null
    });
  }, []);

  return {
    migrationData,
    loadMigrationData,
    resetMigrationData,
    setLoadingState
  };
}