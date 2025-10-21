import { Location } from '../(dashboard)/helper';
import { metadataService, migrationService, MigrationQueryOptions } from './api';
import type { MigrationResponse } from './api/types';

/**
 * Specialized service for Sankey visualization that handles multi-year queries.
 * This service works around backend limitations by querying each year separately
 * and combining the results.
 * 
 * NOTE: This is separate from migration-api-service.ts to avoid breaking other visualizations.
 */
export class SankeyMigrationService {
  
  /**
   * Execute a multi-year migration query specifically for Sankey visualization.
   * This method queries each year separately and combines the results.
   */
  async executeQuery(
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (locations.length === 0) {
        return {
          success: false,
          error: 'No locations selected'
        };
      }

      // If no dates provided, get default date range from metadata
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      if (!startDate || !endDate) {
        const defaultRange = await metadataService.getDefaultDateRange();
        effectiveStartDate = effectiveStartDate || defaultRange.startDate;
        effectiveEndDate = effectiveEndDate || defaultRange.endDate;
        
        console.log('🎨 Sankey: Using default date range from metadata:', {
          startDate: effectiveStartDate,
          endDate: effectiveEndDate
        });
      }

      // Check if this is a multi-year query
      const startYear = new Date(effectiveStartDate!).getFullYear();
      const endYear = new Date(effectiveEndDate!).getFullYear();
      
      if (endYear > startYear) {
        console.log(`🎨 Sankey: Multi-year query detected (${startYear}-${endYear}), querying each year separately...`);
        return await this.executeMultiYearQuery(locations, startYear, endYear);
      }

      // Single year query
      console.log(`🎨 Sankey: Single year query for ${startYear}`);
      return await this.executeSingleYearQuery(locations, effectiveStartDate!, effectiveEndDate!);
      
    } catch (error) {
      console.error('🎨 Sankey: Migration API query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during Sankey query'
      };
    }
  }

  /**
   * Execute multiple year queries and combine results
   */
  private async executeMultiYearQuery(
    locations: Location[], 
    startYear: number, 
    endYear: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const yearPromises: Promise<any>[] = [];
      
      // Query each year separately
      for (let year = startYear; year <= endYear; year++) {
        const yearStartDate = `${year}-01-01`;
        const yearEndDate = `${year}-12-31`;
        
        console.log(`🎨 Sankey: Querying year ${year}: ${yearStartDate} to ${yearEndDate}`);
        yearPromises.push(this.executeSingleYearQuery(locations, yearStartDate, yearEndDate));
      }
      
      const yearResults = await Promise.all(yearPromises);
      
      // Check if any queries failed
      const failedResults = yearResults.filter(result => !result.success);
      if (failedResults.length > 0) {
        console.warn(`🎨 Sankey: ⚠️ ${failedResults.length} year queries failed`);
        return {
          success: false,
          error: `Failed to load data for ${failedResults.length} year(s)`
        };
      }
      
      // Combine all successful results
      const combinedResponse = this.combineApiResponses(
        yearResults.map(result => result.data.apiResponse)
      );
      
      console.log(`🎨 Sankey: ✅ Combined data from ${yearResults.length} years:`, {
        totalTimePeriods: combinedResponse.time_periods.length,
        totalFlows: combinedResponse.flows?.length || 0,
        years: Array.from(new Set(combinedResponse.time_periods.map((p: any) =>
          new Date(p.start_date).getFullYear()
        ))).sort()
      });
      
      // Return combined result in same format as single query
      const firstResult = yearResults[0];
      return {
        success: true,
        data: {
          ...firstResult.data,
          apiResponse: combinedResponse
        }
      };
    } catch (error) {
      console.error('🎨 Sankey: Multi-year query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load multi-year data'
      };
    }
  }

  /**
   * Execute a single year query
   */
  private async executeSingleYearQuery(
    locations: Location[], 
    startDate: string, 
    endDate: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Group locations by type to determine the appropriate scale
      const provinces = locations.filter(loc => loc.type === 'province');
      const districts = locations.filter(loc => loc.type === 'district');
      const subDistricts = locations.filter(loc => loc.type === 'subDistrict');

      let scale: 'province' | 'district' | 'subdistrict';
      let locationIds: string[];

      // Determine scale based on location types (prioritize the most specific)
      if (subDistricts.length > 0) {
        scale = 'subdistrict';
        locationIds = await this.mapLocationsToAPIIds(subDistricts, 'subdistrict');
      } else if (districts.length > 0) {
        scale = 'district';
        locationIds = await this.mapLocationsToAPIIds(districts, 'district');
      } else {
        scale = 'province';
        locationIds = await this.mapLocationsToAPIIds(provinces, 'province');
      }

      const queryOptions: MigrationQueryOptions = {
        scale,
        startDate,
        endDate,
        locationIds,
        aggregation: 'monthly',
        includeFlows: true
      };

      console.log('🎨 Sankey: API Query Options:', {
        scale,
        locationIds,
        startDate,
        endDate,
        aggregation: 'monthly',
        includeFlows: true,
        originalLocations: locations.map(l => ({ name: l.name, type: l.type }))
      });

      const response = await migrationService.getMigrationData(queryOptions);
      
      return {
        success: true,
        data: {
          locations,
          timestamp: new Date().toISOString(),
          results: `Migration data retrieved for ${locations.length} location${locations.length > 1 ? 's' : ''}`,
          apiResponse: response,
          summary: migrationService.calculateSummaryStats(response.data),
          effectiveDateRange: {
            startDate,
            endDate
          }
        }
      };
    } catch (error) {
      console.error('🎨 Sankey: Single year query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during single year query'
      };
    }
  }

  /**
   * Combine multiple API responses into a single response
   */
  private combineApiResponses(responses: MigrationResponse[]): MigrationResponse {
    if (responses.length === 0) {
      throw new Error('No responses to combine');
    }
    
    if (responses.length === 1) {
      return responses[0];
    }
    
    const combined: MigrationResponse = {
      ...responses[0],
      time_periods: [],
      flows: [],
      data: responses[0].data // Use data from first response (locations should be same)
    };
    
    // Combine time_periods from all responses
    const allTimePeriods = new Map();
    responses.forEach(response => {
      response.time_periods.forEach((period: any) => {
        allTimePeriods.set(period.id, period);
      });
    });
    combined.time_periods = Array.from(allTimePeriods.values())
      .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    
    // Combine flows from all responses
    const allFlows = new Map();
    responses.forEach(response => {
      if (response.flows) {
        response.flows.forEach((flow: any) => {
          const key = `${flow.origin.id}-${flow.destination.id}-${flow.time_period_id}`;
          if (allFlows.has(key)) {
            // If duplicate flow exists, sum the counts
            allFlows.get(key).flow_count += flow.flow_count;
          } else {
            allFlows.set(key, { ...flow });
          }
        });
      }
    });
    combined.flows = Array.from(allFlows.values());
    
    return combined;
  }

  /**
   * Map Location objects to API location IDs
   */
  private async mapLocationsToAPIIds(
    locations: Location[], 
    type: 'province' | 'district' | 'subdistrict'
  ): Promise<string[]> {
    const apiLocationIds: string[] = [];

    for (const location of locations) {
      try {
        let apiId: string | null = null;
        
        if (type === 'province') {
          apiId = await this.findProvinceApiId(location);
        } else if (type === 'district') {
          apiId = await this.findDistrictApiId(location);
        } else if (type === 'subdistrict') {
          apiId = await this.findSubdistrictApiId(location);
        }
        
        if (apiId) {
          apiLocationIds.push(apiId);
        } else {
          console.warn(`🎨 Sankey: Could not find API ID for ${type}: ${location.name}`);
        }
      } catch (error) {
        console.error(`🎨 Sankey: Error mapping location ${location.name}:`, error);
      }
    }

    return apiLocationIds;
  }

  /**
   * Find API province ID for a Location
   */
  private async findProvinceApiId(location: Location): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      
      // Try to find by name first (case-insensitive)
      const byName = metadata.provinces.find(p => 
        p.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) {
        return byName.id;
      }

      // Try to find by code if available
      const byCode = metadata.provinces.find(p => 
        p.code?.toLowerCase() === location.name.toLowerCase()
      );
      if (byCode) {
        return byCode.id;
      }

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['province']);
      if (searchResults.provinces.length > 0) {
        return searchResults.provinces[0].id;
      }

      return null;
    } catch (error) {
      console.error(`🎨 Sankey: Error finding province API ID for ${location.name}:`, error);
      return null;
    }
  }

  /**
   * Find API district ID for a Location
   */
  private async findDistrictApiId(location: Location): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      
      if (!metadata.districts) {
        return null;
      }

      // Try to find by name first (case-insensitive)
      const byName = metadata.districts.find(d => 
        d.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) {
        return byName.id;
      }

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['district']);
      if (searchResults.districts.length > 0) {
        return searchResults.districts[0].id;
      }

      return null;
    } catch (error) {
      console.error(`🎨 Sankey: Error finding district API ID for ${location.name}:`, error);
      return null;
    }
  }

  /**
   * Find API subdistrict ID for a Location
   */
  private async findSubdistrictApiId(location: Location): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      
      if (!metadata.subdistricts) {
        return null;
      }

      // Try to find by name first (case-insensitive)
      const byName = metadata.subdistricts.find(s => 
        s.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) {
        return byName.id;
      }

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['subdistrict']);
      if (searchResults.subdistricts.length > 0) {
        return searchResults.subdistricts[0].id;
      }

      return null;
    } catch (error) {
      console.error(`🎨 Sankey: Error finding subdistrict API ID for ${location.name}:`, error);
      return null;
    }
  }
}

// Export a default instance
export const sankeyMigrationService = new SankeyMigrationService();
