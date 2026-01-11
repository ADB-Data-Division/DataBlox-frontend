import { authenticatedTourismApiClient } from './authenticated-tourism-client';
import { 
  TourismRequest, 
  TourismResponse, 
  Aggregation,
  LocationTourismData,
  TourismFlow
} from './types';

/**
 * Interface for tourism query parameters
 */
export interface TourismQueryOptions {
  startDate?: string; // ISO 8601 format - optional, server will use latest dataset if omitted
  endDate?: string;   // ISO 8601 format - optional, server will use latest dataset if omitted
  provinceIds?: string[]; // Province IDs to filter (tourism is province-level only)
  aggregation?: Aggregation;
  includeFlows?: boolean;
  aggregateOthers?: boolean;
}

/**
 * Service for fetching tourism data
 * Note: Tourism data is province-level only, unlike migration which supports district/subdistrict
 */
export class TourismService {
  
  /**
   * Get tourism data with filters
   */
  async getTourismData(options: TourismQueryOptions = {}): Promise<TourismResponse> {
    const request: TourismRequest = {
      aggregation: options.aggregation || 'monthly',
      include_flows: options.includeFlows || false,
      aggregate_others: options.aggregateOthers ?? true
    };

    // Only include dates if provided, otherwise let server use latest dataset
    if (options.startDate) {
      request.start_date = options.startDate;
    }
    if (options.endDate) {
      request.end_date = options.endDate;
    }

    // Add province filters (tourism only supports province-level)
    if (options.provinceIds && options.provinceIds.length > 0) {
      request.provinces = options.provinceIds;
    }

    try {
      return await authenticatedTourismApiClient.getTourism(request);
    } catch (error) {
      console.error('Failed to fetch tourism data:', error);
      throw error;
    }
  }

  /**
   * Get tourism data for specific provinces
   */
  async getProvinceTourismData(
    startDate?: string,
    endDate?: string,
    provinceIds?: string[],
    aggregation?: Aggregation,
    includeFlows?: boolean
  ): Promise<TourismResponse> {
    return this.getTourismData({
      startDate,
      endDate,
      provinceIds,
      aggregation,
      includeFlows
    });
  }

  /**
   * Calculate summary statistics for tourism data
   * Note: Tourism only has arrivals, not move_in/move_out
   */
  calculateSummaryStats(data: LocationTourismData[]): {
    totalArrivals: number;
    locationCount: number;
    averageArrivalsPerLocation: number;
  } {
    let totalArrivals = 0;

    data.forEach(locationData => {
      Object.values(locationData.time_series).forEach(stats => {
        totalArrivals += stats.arrivals;
      });
    });

    return {
      totalArrivals,
      locationCount: data.length,
      averageArrivalsPerLocation: data.length > 0 ? Math.round(totalArrivals / data.length) : 0
    };
  }

  /**
   * Get top tourism destinations by arrival count
   */
  getTopDestinations(data: LocationTourismData[], limit: number = 10): {
    location: string;
    locationId: string;
    totalArrivals: number;
  }[] {
    const aggregated = data.map(locationData => {
      const totalArrivals = Object.values(locationData.time_series)
        .reduce((sum, stats) => sum + stats.arrivals, 0);
      
      return {
        location: locationData.location.name,
        locationId: locationData.location.id,
        totalArrivals
      };
    });

    return aggregated
      .sort((a, b) => b.totalArrivals - a.totalArrivals)
      .slice(0, limit);
  }

  /**
   * Get tourism flows sorted by flow count
   */
  getTopTourismFlows(flows: TourismFlow[], limit: number = 10): TourismFlow[] {
    return flows
      .sort((a, b) => b.flow_count - a.flow_count)
      .slice(0, limit);
  }

  /**
   * Filter tourism data by time period
   */
  filterByTimePeriod(
    data: LocationTourismData[], 
    timePeriodIds: string[]
  ): LocationTourismData[] {
    return data.map(locationData => ({
      ...locationData,
      time_series: Object.fromEntries(
        Object.entries(locationData.time_series)
          .filter(([periodId]) => timePeriodIds.includes(periodId))
      )
    })).filter(locationData => Object.keys(locationData.time_series).length > 0);
  }

  /**
   * Aggregate tourism data across time periods
   */
  aggregateAcrossTime(data: LocationTourismData[]): LocationTourismData[] {
    return data.map(locationData => {
      const timeSeries = Object.values(locationData.time_series);
      const aggregated = timeSeries.reduce(
        (sum, stats) => ({
          arrivals: sum.arrivals + stats.arrivals
        }),
        { arrivals: 0 }
      );

      return {
        ...locationData,
        time_series: {
          'aggregated': aggregated
        }
      };
    });
  }

  /**
   * Get time series data for a specific location
   */
  getLocationTimeSeries(
    data: LocationTourismData[],
    locationId: string
  ): { periodId: string; arrivals: number }[] | null {
    const locationData = data.find(d => d.location.id === locationId);
    if (!locationData) return null;

    return Object.entries(locationData.time_series).map(([periodId, stats]) => ({
      periodId,
      arrivals: stats.arrivals
    }));
  }

  /**
   * Validate tourism query options
   */
  static validateQueryOptions(options: TourismQueryOptions): void {
    // If dates are provided, both must be present
    if ((options.startDate && !options.endDate) || (!options.startDate && options.endDate)) {
      throw new Error('If providing dates, both start date and end date are required');
    }

    // Validate date formats only if dates are provided
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

    if (options.aggregation && !['monthly', 'quarterly', 'yearly'].includes(options.aggregation)) {
      throw new Error('Aggregation must be one of: monthly, quarterly, yearly');
    }
  }

  /**
   * Convert date string from various formats to ISO 8601
   */
  static normalizeDate(date: string | Date): string {
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Try to parse the date and convert to ISO string
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date format: ${date}`);
    }
    
    return parsed.toISOString();
  }
}

// Export a default instance
export const tourismService = new TourismService();
