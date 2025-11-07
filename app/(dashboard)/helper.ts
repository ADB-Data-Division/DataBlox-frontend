/**
 * Types for location data
 */
export interface Location {
  id: number;
  uniqueId: string; // New unique identifier for URL parameters
  name: string;
  description: string;
  type: 'province' | 'district' | 'subDistrict';
  province_id?: string; // For districts: enables smart filtering by province
  district_id?: string; // For sub-districts: enables filtering by district
}

/**
 * Mock data for locations
 */
export const locationData = {
  provinces: [
    {
      id: 1,
      uniqueId: 'pr-bangkok',
      name: 'Bangkok',
      description: 'Location sub-description',
      type: 'province' as const
    },
    {
      id: 2,
      uniqueId: 'pr-buengkan',
      name: 'Bueng Kan',
      description: 'Location sub-description',
      type: 'province' as const
    }
  ],
  districts: [
    {
      id: 3,
      uniqueId: 'ds-bangkapi',
      name: 'Bang Kapi',
      description: 'Bangkok Province',
      type: 'district' as const
    },
    {
      id: 4,
      uniqueId: 'ds-hatyai',
      name: 'Hat Yai',
      description: 'Songkhla Province',
      type: 'district' as const
    }
  ],
  subDistricts: [
    {
      id: 5,
      uniqueId: 'sd-changphueak',
      name: 'Change Phueak',
      description: 'Mueang Chiang Mai District',
      type: 'subDistrict' as const
    },
    {
      id: 6,
      uniqueId: 'sd-latphrao',
      name: 'Lat Phrao',
      description: 'Chatuchak District',
      type: 'subDistrict' as const
    }
  ]
};

/**
 * Gets the appropriate icon name for a location type
 * @param type - The location type
 * @returns Icon name string
 */
export function getLocationIconType(type: Location['type']): 'buildings' | 'users' | 'mapPin' {
  switch (type) {
    case 'province': return 'buildings';
    case 'district': return 'users';
    case 'subDistrict': return 'mapPin';
  }
}

/**
 * Gets the appropriate color for a location type
 * @param type - The location type
 * @returns Material UI color variant
 */
export function getLocationColor(type: Location['type']): "primary" | "secondary" | "success" {
  switch (type) {
    case 'province': return 'primary';
    case 'district': return 'secondary';
    case 'subDistrict': return 'success';
  }
}

/**
 * Gets all locations as a flattened array
 * First tries to load from API with enhanced metadata (province names, parent IDs)
 * Falls back to error if API is unavailable
 * @returns Array of all locations with enhanced metadata
 */
export async function getAllLocations(): Promise<Location[]> {
  const { enhancedLocationService } = await import('../services/enhanced-location-service');
  
  try {
    const locations = await enhancedLocationService.getEnhancedLocations();
    return locations;
  } catch (error) {
    const { trackMigrationEvent } = await import('../../src/utils/analytics');
    trackMigrationEvent.trackError('enhanced_location_service_failed', 'Enhanced location service failed');
    throw new Error('Failed to load location data');
  }
}

/**
 * Gets all locations as a flattened array (synchronous version using mock data)
 * @returns Array of all mock locations
 */
export function getAllLocationsMock(): Location[] {
  return [
    ...locationData.provinces,
    ...locationData.districts,
    ...locationData.subDistricts
  ];
}

/**
 * Finds a location by its unique ID
 * @param uniqueId - The unique identifier
 * @returns Location object or null if not found
 */
export function getLocationByUniqueId(uniqueId: string): Location | null {
  const allLocations = getAllLocationsMock();
  return allLocations.find(location => location.uniqueId === uniqueId) || null;
}

/**
 * Converts an array of unique IDs to Location objects
 * @param uniqueIds - Array of unique identifiers
 * @returns Array of Location objects (excludes any not found)
 */
export function getLocationsByUniqueIds(uniqueIds: string[]): Location[] {
  return uniqueIds
    .map(uniqueId => getLocationByUniqueId(uniqueId))
    .filter((location): location is Location => location !== null);
}

/**
 * Recent Searches Integration
 */

/**
 * Check if a recent search can be fully loaded given current constraints
 * @param recentSearch - The recent search to validate
 * @param currentSelectedCount - Number of currently selected locations
 * @param maxLocations - Maximum allowed locations
 * @returns Object with validation result and details
 */
export function canLoadRecentSearch(
  recentSearch: { locations: Location[]; locationCount: number },
  currentSelectedCount: number,
  maxLocations: number = 5
): { canLoad: boolean; canLoadCount: number; excessCount: number } {
  const availableSlots = maxLocations - currentSelectedCount;
  const canLoadCount = Math.min(recentSearch.locationCount, availableSlots);
  const excessCount = Math.max(0, recentSearch.locationCount - availableSlots);

  return {
    canLoad: canLoadCount > 0,
    canLoadCount,
    excessCount
  };
}

/**
 * Get a subset of locations from a recent search that fit within constraints
 * @param recentSearch - The recent search
 * @param maxCount - Maximum number of locations to return
 * @returns Array of locations (up to maxCount)
 */
export function getLocationsFromRecentSearch(
  recentSearch: { locations: Location[] },
  maxCount: number
): Location[] {
  return recentSearch.locations.slice(0, maxCount);
} 