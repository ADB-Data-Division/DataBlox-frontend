import { Location } from '../(dashboard)/helper';
import { metadataService, tourismService, TourismQueryOptions } from './api';
import type { TourismResponse } from './api/types';
import { transformTourismDataForMap, TourismMapNode, TourismMapConnection } from './api/tourism-flow-transformer';

/**
 * Service that bridges the existing Location interface with the Tourism API
 * This is the tourism equivalent of MigrationAPIService
 */
export class TourismAPIService {
  
  /**
   * Execute a tourism query for selected locations
   */
  async executeQuery(
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ): Promise<{ 
    success: boolean; 
    data?: any; 
    apiResponse?: TourismResponse;
    mapNodes?: TourismMapNode[];
    mapConnections?: TourismMapConnection[];
    error?: string 
  }> {
    try {
      if (locations.length === 0) {
        return {
          success: false,
          error: 'No locations selected'
        };
      }

      // Filter to only province-level locations (tourism only supports province)
      const provinces = locations.filter(loc => loc.type === 'province');
      
      if (provinces.length === 0) {
        return {
          success: false,
          error: 'Tourism data is only available at province level. Please select provinces instead of districts or subdistricts.'
        };
      }

      // If no dates provided, get default date range from metadata
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      if (!startDate || !endDate) {
        try {
          const defaultRange = await metadataService.getDefaultDateRange();
          effectiveStartDate = effectiveStartDate || defaultRange.startDate;
          effectiveEndDate = effectiveEndDate || defaultRange.endDate;
          
          console.log('Using default date range from metadata:', {
            startDate: effectiveStartDate,
            endDate: effectiveEndDate
          });
        } catch (error) {
          console.warn('Could not get default date range, proceeding without dates');
        }
      }

      // For Tourism API, we can pass province names directly
      // The API spec shows: "provinces": ["Bangkok", "Phuket", "Chiang Mai"]
      const provinceNames = provinces.map(loc => loc.name);

      if (provinceNames.length === 0) {
        return {
          success: false,
          error: 'No valid province names found'
        };
      }

      const queryOptions: TourismQueryOptions = {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        provinceIds: provinceNames, // Note: This is actually province names for tourism API
        aggregation: 'monthly',
        includeFlows: true
      };

      console.log('🔧 Tourism API Query:', {
        provinceNames,
        originalLocations: provinces.map(l => ({ name: l.name, type: l.type })),
        queryOptions
      });

      const response = await tourismService.getTourismData(queryOptions);
      
      // Transform data for map visualization
      const { nodes, connections } = transformTourismDataForMap(response);

      return {
        success: true,
        data: {
          locations: provinces,
          timestamp: new Date().toISOString(),
          results: `Tourism data retrieved for ${provinces.length} province${provinces.length > 1 ? 's' : ''}`,
          summary: tourismService.calculateSummaryStats(response.data),
          effectiveDateRange: {
            startDate: effectiveStartDate,
            endDate: effectiveEndDate
          }
        },
        apiResponse: response,
        mapNodes: nodes,
        mapConnections: connections
      };
    } catch (error) {
      console.error('Tourism API query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during API query'
      };
    }
  }

}

// Export a default instance
export const tourismAPIService = new TourismAPIService();
