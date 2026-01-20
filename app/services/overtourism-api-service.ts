import { Location } from '@/app/(dashboard)/helper';
import { OvertourismService, overtourismService, OvertourismQueryOptions } from './api/overtourism-service';
import { OvertourismResponse, OvertourismMetadataResponse } from './api/types';

interface OvertourismServiceResponse {
  success: boolean;
  data?: OvertourismResponse;
  metadata?: OvertourismMetadataResponse;
  error?: string;
}

class OvertourismAPIService {
  /**
   * Execute query for overtourism data
   */
  async executeQuery(
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ): Promise<OvertourismServiceResponse> {
    try {
      // API expects province names, not IDs
      const provinceIds = locations.map(loc => loc.name);
      
      const options: OvertourismQueryOptions = {
        provinceIds,
        startDate,
        endDate
      };

      OvertourismService.validateQueryOptions(options);
      
      const response = await overtourismService.getOvertourismData(options);
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Overtourism API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during overtourism query'
      };
    }
  }

  /**
   * Get metadata for data coverage
   */
  async getMetadata(): Promise<OvertourismServiceResponse> {
    try {
      const response = await overtourismService.getMetadata();
      return {
        success: true,
        metadata: response
      };
    } catch (error) {
      console.error('Overtourism Metadata Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metadata'
      };
    }
  }
}

export const overtourismAPIService = new OvertourismAPIService();
