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
  async executeQuery(locations: Location[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (locations.length === 0) {
        return {
          success: false,
          error: 'No locations selected'
        };
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

      // Use a default time range (can be made configurable later)
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2021-12-31T23:59:59Z';

      const queryOptions: MigrationQueryOptions = {
        scale,
        startDate,
        endDate,
        locationIds,
        aggregation: 'monthly',
        includeFlows: true
      };

      const response = await migrationService.getMigrationData(queryOptions);
      
      return {
        success: true,
        data: {
          locations,
          timestamp: new Date().toISOString(),
          results: `Migration data retrieved for ${locations.length} location${locations.length > 1 ? 's' : ''}`,
          apiResponse: response,
          summary: migrationService.calculateSummaryStats(response.data)
        }
      };
    } catch (error) {
      console.error('Migration API query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during API query'
      };
    }
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
      const metadata = await metadataService.getMetadata();
      
      // Try to find by name first (case-insensitive)
      const byName = metadata.provinces.find(p => 
        p.name.toLowerCase() === location.name.toLowerCase()
      );
      if (byName) return byName.id;

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
        provinces,
        districts,
        subDistricts
      };
    } catch (error) {
      console.error('Failed to get available locations from API:', error);
      
      // Return empty arrays if API fails
      return {
        provinces: [],
        districts: [],
        subDistricts: []
      };
    }
  }

  /**
   * Health check for the API
   */
  async isAPIHealthy(): Promise<boolean> {
    try {
      await metadataService.getMetadata();
      return true;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// Export a default instance
export const migrationAPIService = new MigrationAPIService(); 