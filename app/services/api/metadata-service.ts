import { apiClient } from './client';
import { MetadataResponse, Province, District, Subdistrict, TimePeriods } from './types';

/**
 * Service for fetching metadata about available locations and time periods
 */
export class MetadataService {
  private cachedMetadata: MetadataResponse | null = null;
  private cacheTimestamp: number = 0;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all metadata with caching
   */
  async getMetadata(forceRefresh: boolean = false): Promise<MetadataResponse> {
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (!forceRefresh && 
        this.cachedMetadata && 
        (now - this.cacheTimestamp) < this.cacheExpiry) {
      return this.cachedMetadata;
    }

    try {
      this.cachedMetadata = await apiClient.getMetadata();
      this.cacheTimestamp = now;
      return this.cachedMetadata;
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      
      // Return cached data if available, even if expired
      if (this.cachedMetadata) {
        console.warn('Using expired cached metadata due to API error');
        return this.cachedMetadata;
      }
      
      throw error;
    }
  }

  /**
   * Get provinces only
   */
  async getProvinces(forceRefresh: boolean = false): Promise<Province[]> {
    const metadata = await this.getMetadata(forceRefresh);
    return metadata.provinces;
  }

  /**
   * Get districts only
   */
  async getDistricts(forceRefresh: boolean = false): Promise<District[]> {
    const metadata = await this.getMetadata(forceRefresh);
    return metadata.districts || [];
  }

  /**
   * Get subdistricts only
   */
  async getSubdistricts(forceRefresh: boolean = false): Promise<Subdistrict[]> {
    const metadata = await this.getMetadata(forceRefresh);
    return metadata.subdistricts || [];
  }

  /**
   * Get time periods only
   */
  async getTimePeriods(forceRefresh: boolean = false): Promise<TimePeriods> {
    const metadata = await this.getMetadata(forceRefresh);
    return metadata.time_periods;
  }

  /**
   * Find province by ID
   */
  async findProvinceById(id: string, forceRefresh: boolean = false): Promise<Province | null> {
    const provinces = await this.getProvinces(forceRefresh);
    return provinces.find(p => p.id === id) || null;
  }

  /**
   * Find district by ID
   */
  async findDistrictById(id: string, forceRefresh: boolean = false): Promise<District | null> {
    const districts = await this.getDistricts(forceRefresh);
    return districts.find(d => d.id === id) || null;
  }

  /**
   * Find subdistrict by ID
   */
  async findSubdistrictById(id: string, forceRefresh: boolean = false): Promise<Subdistrict | null> {
    const subdistricts = await this.getSubdistricts(forceRefresh);
    return subdistricts.find(s => s.id === id) || null;
  }

  /**
   * Get districts for a specific province
   */
  async getDistrictsByProvince(provinceId: string, forceRefresh: boolean = false): Promise<District[]> {
    const districts = await this.getDistricts(forceRefresh);
    return districts.filter(d => d.province_id === provinceId);
  }

  /**
   * Get subdistricts for a specific district
   */
  async getSubdistrictsByDistrict(districtId: string, forceRefresh: boolean = false): Promise<Subdistrict[]> {
    const subdistricts = await this.getSubdistricts(forceRefresh);
    return subdistricts.filter(s => s.district_id === districtId);
  }

  /**
   * Search locations by name (case-insensitive partial match)
   */
  async searchLocations(
    query: string, 
    types: ('province' | 'district' | 'subdistrict')[] = ['province', 'district', 'subdistrict'],
    forceRefresh: boolean = false
  ): Promise<{
    provinces: Province[],
    districts: District[],
    subdistricts: Subdistrict[]
  }> {
    const metadata = await this.getMetadata(forceRefresh);
    const lowerQuery = query.toLowerCase();

    const results = {
      provinces: [] as Province[],
      districts: [] as District[],
      subdistricts: [] as Subdistrict[]
    };

    if (types.includes('province')) {
      results.provinces = metadata.provinces.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.code.toLowerCase().includes(lowerQuery) ||
        p.id.toLowerCase().includes(lowerQuery)
      );
    }

    if (types.includes('district') && metadata.districts) {
      results.districts = metadata.districts.filter(d => 
        d.name.toLowerCase().includes(lowerQuery) ||
        d.id.toLowerCase().includes(lowerQuery)
      );
    }

    if (types.includes('subdistrict') && metadata.subdistricts) {
      results.subdistricts = metadata.subdistricts.filter(s => 
        s.name.toLowerCase().includes(lowerQuery) ||
        s.id.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }

  /**
   * Clear cached metadata
   */
  clearCache(): void {
    this.cachedMetadata = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return this.cachedMetadata !== null && 
           (Date.now() - this.cacheTimestamp) < this.cacheExpiry;
  }
}

// Export a default instance
export const metadataService = new MetadataService(); 