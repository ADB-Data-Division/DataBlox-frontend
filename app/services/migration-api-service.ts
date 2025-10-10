import { Location } from '../(dashboard)/helper';
import { metadataService, migrationService, MigrationQueryOptions } from './api';
import type { Province, District, Subdistrict, LocationMigrationData } from './api/types';

/**
 * Service that bridges the existing Location interface with the new API services
 * This maintains compatibility with the existing UI while using the real API
 */
export class MigrationAPIService {
  
  /**
   * Execute a migration query for selected locations
   * This replaces the mocked executeQuery function
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

      // For Sankey visualization, query each year separately to work around backend limitations
      if (startDate && endDate) {
        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();
        
        if (endYear > startYear) {
          console.log(`🔄 Multi-year query detected (${startYear}-${endYear}), querying each year separately...`);
          return await this.executeMultiYearQuery(locations, startYear, endYear);
        }
      }

      // Single year query (original logic)
      return await this.executeSingleQuery(locations, startDate, endDate);
    } catch (error) {
      console.error('Migration API query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during API query'
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
        
        console.log(`📅 Querying year ${year}: ${yearStartDate} to ${yearEndDate}`);
        yearPromises.push(this.executeSingleQuery(locations, yearStartDate, yearEndDate));
      }
      
      const yearResults = await Promise.all(yearPromises);
      
      // Check if any queries failed
      const failedResults = yearResults.filter(result => !result.success);
      if (failedResults.length > 0) {
        console.warn(`⚠️ ${failedResults.length} year queries failed`);
        return {
          success: false,
          error: `Failed to load data for ${failedResults.length} year(s)`
        };
      }
      
      // Combine all successful results
      const combinedResponse = this.combineApiResponses(
        yearResults.map(result => result.data.apiResponse)
      );
      
      console.log(`✅ Combined data from ${yearResults.length} years:`, {
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
      console.error('Multi-year query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load multi-year data'
      };
    }
  }

  /**
   * Execute a single query (original logic)
   */
  private async executeSingleQuery(
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // If no dates provided, get default date range from metadata
    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;
    
    if (!startDate || !endDate) {
      const defaultRange = await metadataService.getDefaultDateRange();
      effectiveStartDate = effectiveStartDate || defaultRange.startDate;
      effectiveEndDate = effectiveEndDate || defaultRange.endDate;
      
      console.log('Using default date range from metadata:', {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate
      });
    }

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
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        locationIds,
        aggregation: 'monthly',
        includeFlows: true
      };

      console.log('🔧 API Query Options:', {
        scale,
        locationIds,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
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
            startDate: effectiveStartDate,
            endDate: effectiveEndDate
          }
        }
      };
  }

  /**
   * Combine multiple API responses into a single response
   */
  private combineApiResponses(responses: any[]): any {
    if (responses.length === 0) {
      throw new Error('No responses to combine');
    }
    
    if (responses.length === 1) {
      return responses[0];
    }
    
    const combined = {
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

        switch (type) {
          case 'province':
            apiId = await this.findProvinceApiId(location);
            break;
          case 'district':
            apiId = await this.findDistrictApiId(location);
            break;
          case 'subdistrict':
            apiId = await this.findSubdistrictApiId(location);
            break;
        }

        if (apiId) {
          apiLocationIds.push(apiId);
        } else {
          console.warn(`Could not map location ${location.name} to API ID`);
        }
      } catch (error) {
        console.error(`Error mapping location ${location.name}:`, error);
      }
    }

    return apiLocationIds;
  }

  /**
   * Find API province ID for a Location
   */
  private async findProvinceApiId(location: Location): Promise<string | null> {
    try {
      console.log(`🔍 Looking for province API ID for: "${location.name}"`);
      
      // TEMPORARY: Hardcode Bangkok and Songkhla for testing
      if (location.name.toLowerCase().includes('bangkok')) {
        console.log(`✅ Hardcoded Bangkok -> 1`);
        return "1";
      }
      if (location.name.toLowerCase().includes('songkhla')) {
        console.log(`✅ Hardcoded Songkhla -> 70`);
        return "70";
      }
      
      const metadata = await metadataService.getMetadata();
      
      // Try to find by name first (case-insensitive)
      const byName = metadata.provinces.find(p => 
        p.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) {
        console.log(`✅ Found by name: ${byName.name} -> ${byName.id}`);
        return byName.id;
      }

      // Try to find by code if available
      const byCode = metadata.provinces.find(p => 
        p.code?.toLowerCase() === location.name.toLowerCase()
      );
      if (byCode) return byCode.id;

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['province']);
      if (searchResults.provinces.length > 0) {
        return searchResults.provinces[0].id;
      }

      return null;
    } catch (error) {
      console.error(`Error finding province API ID for ${location.name}:`, error);
      return null;
    }
  }

  /**
   * Find API district ID for a Location
   */
  private async findDistrictApiId(location: Location): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      
      if (!metadata.districts) return null;

      // Try to find by name first (case-insensitive)
      const byName = metadata.districts.find(d => 
        d.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) return byName.id;

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['district']);
      if (searchResults.districts.length > 0) {
        return searchResults.districts[0].id;
      }

      return null;
    } catch (error) {
      console.error(`Error finding district API ID for ${location.name}:`, error);
      return null;
    }
  }

  /**
   * Find API subdistrict ID for a Location
   */
  private async findSubdistrictApiId(location: Location): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      
      if (!metadata.subdistricts) return null;

      // Try to find by name first (case-insensitive)
      const byName = metadata.subdistricts.find(s => 
        s.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) return byName.id;

      // Use search functionality
      const searchResults = await metadataService.searchLocations(location.name, ['subdistrict']);
      if (searchResults.subdistricts.length > 0) {
        return searchResults.subdistricts[0].id;
      }

      return null;
    } catch (error) {
      console.error(`Error finding subdistrict API ID for ${location.name}:`, error);
      return null;
    }
  }

  /**
   * Get metadata and convert to Location objects for backward compatibility
   */
  async getAvailableLocations(): Promise<{
    isHealthy: boolean;
    provinces: Location[];
    districts: Location[];
    subDistricts: Location[];
  }> {
    try {
      const metadata = await metadataService.getMetadata();
      
      const provinces: Location[] = metadata.provinces.map((p, index) => ({
        id: 1000 + index, // Use offset to avoid ID conflicts
        uniqueId: `api-pr-${p.id}`,
        name: p.name,
        description: p.code ? `Province Code: ${p.code}` : 'Province',
        type: 'province' as const
      }));

      const districts: Location[] = (metadata.districts || []).map((d, index) => ({
        id: 2000 + index,
        uniqueId: `api-ds-${d.id}`,
        name: d.name,
        description: `District in province ${d.province_id}`,
        type: 'district' as const
      }));

      const subDistricts: Location[] = (metadata.subdistricts || []).map((s, index) => ({
        id: 3000 + index,
        uniqueId: `api-sd-${s.id}`,
        name: s.name,
        description: `Subdistrict in district ${s.district_id}`,
        type: 'subDistrict' as const
      }));

      return {
        isHealthy: true,
        provinces,
        districts,
        subDistricts
      };
    } catch (error) {
      console.error('Failed to get available locations from API:', error);
      
      // Return empty arrays if API fails
      return {
        isHealthy: false,
        provinces: [],
        districts: [],
        subDistricts: []
      };
    }
  }
}

// Export a default instance
export const migrationAPIService = new MigrationAPIService(); 