import { apiClient } from './client';
import { 
  MigrationRequest, 
  MigrationResponse, 
  Scale, 
  Aggregation,
  LocationMigrationData,
  MigrationFlow
} from './types';

/**
 * Interface for migration query parameters
 */
export interface MigrationQueryOptions {
  scale: Scale;
  startDate?: string; // ISO 8601 format - optional, server will use latest dataset if omitted
  endDate?: string;   // ISO 8601 format - optional, server will use latest dataset if omitted
  locationIds?: string[]; // Can be province, district, or subdistrict IDs based on scale
  aggregation?: Aggregation;
  includeFlows?: boolean;
}

/**
 * Service for fetching migration data
 */
export class MigrationService {
  
  /**
   * Get migration data with filters
   */
  async getMigrationData(options: MigrationQueryOptions): Promise<MigrationResponse> {
    const request: MigrationRequest = {
      scale: options.scale,
      aggregation: options.aggregation || 'monthly',
      include_flows: options.includeFlows || false
    };

    // Only include dates if provided, otherwise let server use latest dataset
    if (options.startDate) {
      request.start_date = options.startDate;
    }
    if (options.endDate) {
      request.end_date = options.endDate;
    }

    // Add location filters based on scale
    if (options.locationIds && options.locationIds.length > 0) {
      switch (options.scale) {
        case 'province':
          request.provinces = options.locationIds;
          break;
        case 'district':
          request.districts = options.locationIds;
          break;
        case 'subdistrict':
          request.subdistricts = options.locationIds;
          break;
      }
    }

    try {
      return await apiClient.getMigrations(request);
    } catch (error) {
      console.error('Failed to fetch migration data:', error);
      throw error;
    }
  }

  /**
   * Get province-level migration data
   */
  async getProvinceMigrationData(
    startDate: string,
    endDate: string,
    provinceIds?: string[],
    aggregation?: Aggregation,
    includeFlows?: boolean
  ): Promise<MigrationResponse> {
    return this.getMigrationData({
      scale: 'province',
      startDate,
      endDate,
      locationIds: provinceIds,
      aggregation,
      includeFlows
    });
  }

  /**
   * Get district-level migration data
   */
  async getDistrictMigrationData(
    startDate: string,
    endDate: string,
    districtIds?: string[],
    aggregation?: Aggregation,
    includeFlows?: boolean
  ): Promise<MigrationResponse> {
    return this.getMigrationData({
      scale: 'district',
      startDate,
      endDate,
      locationIds: districtIds,
      aggregation,
      includeFlows
    });
  }

  /**
   * Get subdistrict-level migration data
   */
  async getSubdistrictMigrationData(
    startDate: string,
    endDate: string,
    subdistrictIds?: string[],
    aggregation?: Aggregation,
    includeFlows?: boolean
  ): Promise<MigrationResponse> {
    return this.getMigrationData({
      scale: 'subdistrict',
      startDate,
      endDate,
      locationIds: subdistrictIds,
      aggregation,
      includeFlows
    });
  }

  /**
   * Calculate summary statistics for migration data
   */
  calculateSummaryStats(data: LocationMigrationData[]): {
    totalMoveIn: number;
    totalMoveOut: number;
    totalNetMigration: number;
    locationCount: number;
  } {
    let totalMoveIn = 0;
    let totalMoveOut = 0;
    let totalNetMigration = 0;

    data.forEach(locationData => {
      Object.values(locationData.time_series).forEach(stats => {
        totalMoveIn += stats.move_in;
        totalMoveOut += stats.move_out;
        totalNetMigration += (stats.net_migration || (stats.move_in - stats.move_out));
      });
    });

    return {
      totalMoveIn,
      totalMoveOut,
      totalNetMigration,
      locationCount: data.length
    };
  }

  /**
   * Get top migration destinations by move-in count
   */
  getTopDestinations(data: LocationMigrationData[], limit: number = 10): {
    location: string;
    locationId: string;
    totalMoveIn: number;
  }[] {
    const aggregated = data.map(locationData => {
      const totalMoveIn = Object.values(locationData.time_series)
        .reduce((sum, stats) => sum + stats.move_in, 0);
      
      return {
        location: locationData.location.name,
        locationId: locationData.location.id,
        totalMoveIn
      };
    });

    return aggregated
      .sort((a, b) => b.totalMoveIn - a.totalMoveIn)
      .slice(0, limit);
  }

  /**
   * Get top migration origins by move-out count
   */
  getTopOrigins(data: LocationMigrationData[], limit: number = 10): {
    location: string;
    locationId: string;
    totalMoveOut: number;
  }[] {
    const aggregated = data.map(locationData => {
      const totalMoveOut = Object.values(locationData.time_series)
        .reduce((sum, stats) => sum + stats.move_out, 0);
      
      return {
        location: locationData.location.name,
        locationId: locationData.location.id,
        totalMoveOut
      };
    });

    return aggregated
      .sort((a, b) => b.totalMoveOut - a.totalMoveOut)
      .slice(0, limit);
  }

  /**
   * Get migration flows sorted by flow count
   */
  getTopMigrationFlows(flows: MigrationFlow[], limit: number = 10): MigrationFlow[] {
    return flows
      .sort((a, b) => b.flow_count - a.flow_count)
      .slice(0, limit);
  }

  /**
   * Filter migration data by time period
   */
  filterByTimePeriod(
    data: LocationMigrationData[], 
    timePeriodIds: string[]
  ): LocationMigrationData[] {
    return data.map(locationData => ({
      ...locationData,
      time_series: Object.fromEntries(
        Object.entries(locationData.time_series)
          .filter(([periodId]) => timePeriodIds.includes(periodId))
      )
    })).filter(locationData => Object.keys(locationData.time_series).length > 0);
  }

  /**
   * Aggregate migration data across time periods
   */
  aggregateAcrossTime(data: LocationMigrationData[]): LocationMigrationData[] {
    return data.map(locationData => {
      const timeSeries = Object.values(locationData.time_series);
      const aggregated = timeSeries.reduce(
        (sum, stats) => ({
          move_in: sum.move_in + stats.move_in,
          move_out: sum.move_out + stats.move_out,
          net_migration: (sum.net_migration || 0) + (stats.net_migration || (stats.move_in - stats.move_out))
        }),
        { move_in: 0, move_out: 0, net_migration: 0 }
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

  /**
   * Validate migration query options
   */
  static validateQueryOptions(options: MigrationQueryOptions): void {
    if (!options.scale) {
      throw new Error('Scale is required');
    }

    if (!['province', 'district', 'subdistrict'].includes(options.scale)) {
      throw new Error('Scale must be one of: province, district, subdistrict');
    }

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
}

// Export a default instance
export const migrationService = new MigrationService(); 