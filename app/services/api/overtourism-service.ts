import { authenticatedOvertourismApiClient } from './authenticated-overtourism-client';
import { 
  OvertourismRequest, 
  OvertourismResponse, 
  LocationOvertourismData,
  OvertourismMetadataResponse
} from './types';

/**
 * Interface for overtourism query parameters
 */
export interface OvertourismQueryOptions {
  startDate?: string;
  endDate?: string;
  provinceIds?: string[];
}

/**
 * Service for fetching overtourism data
 */
export class OvertourismService {
  
  /**
   * Get overtourism data with filters
   */
  async getOvertourismData(options: OvertourismQueryOptions = {}): Promise<OvertourismResponse> {
    const request: OvertourismRequest = {};

    if (options.startDate) {
      request.start_date = options.startDate;
    }
    if (options.endDate) {
      request.end_date = options.endDate;
    }

    if (options.provinceIds && options.provinceIds.length > 0) {
      request.provinces = options.provinceIds;
    }

    try {
      return await authenticatedOvertourismApiClient.getOvertourism(request);
    } catch (error) {
      console.error('Failed to fetch overtourism data:', error);
      throw error;
    }
  }

  /**
   * Get overtourism metadata
   */
  async getMetadata(): Promise<OvertourismMetadataResponse> {
    try {
      return await authenticatedOvertourismApiClient.getMetadata();
    } catch (error) {
      console.error('Failed to fetch overtourism metadata:', error);
      throw error;
    }
  }

  /**
   * Validate overtourism query options
   */
  static validateQueryOptions(options: OvertourismQueryOptions): void {
    if ((options.startDate && !options.endDate) || (!options.startDate && options.endDate)) {
      throw new Error('If providing dates, both start date and end date are required');
    }

    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format. Use ISO 8601 format.');
      }

      if (startDate >= endDate) {
        throw new Error('Start date must be before end date');
      }
    }
  }
}

// Export a default instance
export const overtourismService = new OvertourismService();
