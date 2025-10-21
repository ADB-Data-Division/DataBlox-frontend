import { useState, useCallback } from 'react';
import { Location } from '../helper';
import { sankeyMigrationService } from '@/app/services/sankey-migration-service';
import type { MigrationResponse } from '@/app/services/api/types';

interface SankeyMigrationData {
  isLoading: boolean;
  error: string | null;
  apiResponse: MigrationResponse | null;
}

/**
 * Custom hook for loading migration data specifically for Sankey visualization.
 * This hook uses the SankeyMigrationService which handles multi-year queries
 * by splitting them into individual year requests.
 */
export function useSankeyMigrationData() {
  const [migrationData, setMigrationData] = useState<SankeyMigrationData>({
    isLoading: false,
    error: null,
    apiResponse: null,
  });

  const loadMigrationData = useCallback(async (
    locations: Location[],
    startDate?: string,
    endDate?: string
  ) => {
    // Set loading state
    setMigrationData({
      isLoading: true,
      error: null,
      apiResponse: null,
    });

    try {
      console.log('🎨 Sankey Hook: Loading migration data for locations:', locations.map(l => l.name));
      
      const result = await sankeyMigrationService.executeQuery(
        locations,
        startDate,
        endDate
      );

      if (result.success && result.data?.apiResponse) {
        console.log('🎨 Sankey Hook: Successfully loaded migration data');
        setMigrationData({
          isLoading: false,
          error: null,
          apiResponse: result.data.apiResponse,
        });
      } else {
        console.error('🎨 Sankey Hook: Failed to load migration data:', result.error);
        setMigrationData({
          isLoading: false,
          error: result.error || 'Failed to load migration data',
          apiResponse: null,
        });
      }
    } catch (error) {
      console.error('🎨 Sankey Hook: Error loading migration data:', error);
      setMigrationData({
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        apiResponse: null,
      });
    }
  }, []);

  const resetMigrationData = useCallback(() => {
    setMigrationData({
      isLoading: false,
      error: null,
      apiResponse: null,
    });
  }, []);

  return {
    migrationData,
    loadMigrationData,
    resetMigrationData,
  };
}
