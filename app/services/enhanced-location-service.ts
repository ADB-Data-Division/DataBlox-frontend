import { Location } from '../(dashboard)/helper';
import { metadataService } from './api';

/**
 * Enhanced location service that provides enriched location data.
 * This service wraps the metadata service to add additional information
 * without modifying the core migration-api-service.ts.
 * 
 * Enhancements:
 * - Resolves province IDs to province names in district descriptions
 * - Includes province_id in district Location objects for smart filtering
 * - Maintains compatibility with existing Location interface
 */
export class EnhancedLocationService {
  
  /**
   * Get all locations with enhanced metadata.
   * Districts will have:
   * - Human-readable province names in descriptions (e.g., "District in Chiang Mai")
   * - province_id field for smart filtering
   */
  async getEnhancedLocations(): Promise<Location[]> {
    try {
      const metadata = await metadataService.getMetadata();
      
      // Create a province lookup map for fast resolution
      const provinceMap = new Map(
        metadata.provinces.map(p => [p.id, p.name])
      );

      // Map provinces to Location objects
      const provinces: Location[] = metadata.provinces.map((p, index) => ({
        id: 1000 + index,
        uniqueId: `api-pr-${p.id}`,
        name: p.name,
        description: p.code || `Province code: ${p.id}`,
        type: 'province' as const
      }));

      // Map districts with enhanced descriptions and province_id
      const districts: Location[] = (metadata.districts || []).map((d, index) => {
        const provinceName = provinceMap.get(d.province_id);
        return {
          id: 2000 + index,
          uniqueId: `api-ds-${d.id}`,
          name: d.name,
          description: provinceName 
            ? `District in ${provinceName}` 
            : `District in province ${d.province_id}`,
          type: 'district' as const,
          province_id: d.province_id // Add province_id for smart filtering
        };
      });

      // Map sub-districts with enhanced descriptions and parent IDs
      const subDistricts: Location[] = (metadata.subdistricts || []).map((sd, index) => ({
        id: 3000 + index,
        uniqueId: `api-sd-${sd.id}`,
        name: sd.name,
        description: `Sub-district in district ${sd.district_id}`,
        type: 'subDistrict' as const,
        district_id: sd.district_id // Add district_id for potential future filtering
      }));

      // Combine all locations
      return [...provinces, ...districts, ...subDistricts];
      
    } catch (error) {
      console.error('Enhanced location service failed:', error);
      throw new Error('Failed to fetch enhanced location data');
    }
  }

  /**
   * Get province name by province ID.
   * Useful for displaying province information.
   */
  async getProvinceName(provinceId: string): Promise<string | null> {
    try {
      const metadata = await metadataService.getMetadata();
      const province = metadata.provinces.find(p => p.id === provinceId);
      return province ? province.name : null;
    } catch (error) {
      console.error('Failed to get province name:', error);
      return null;
    }
  }

  /**
   * Get all districts for a specific province.
   * Useful for filtering districts by province.
   */
  async getDistrictsByProvince(provinceId: string): Promise<Location[]> {
    try {
      const allLocations = await this.getEnhancedLocations();
      return allLocations.filter(
        loc => loc.type === 'district' && loc.province_id === provinceId
      );
    } catch (error) {
      console.error('Failed to get districts by province:', error);
      return [];
    }
  }
}

// Export singleton instance
export const enhancedLocationService = new EnhancedLocationService();
