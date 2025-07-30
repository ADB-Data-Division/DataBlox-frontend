/**
 * Types for location data
 */
export interface Location {
  id: number;
  uniqueId: string; // New unique identifier for URL parameters
  name: string;
  description: string;
  type: 'province' | 'district' | 'subDistrict';
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
 * First tries to load from API, falls back to mock data if API is unavailable
 * @returns Array of all locations
 */
export async function getAllLocations(): Promise<Location[]> {
  try {
    // Try to get locations from API first
    const { migrationAPIService } = await import('../services/migration-api-service');
    const isHealthy = await migrationAPIService.isAPIHealthy();
    
    if (isHealthy) {
      const apiLocations = await migrationAPIService.getAvailableLocations();
      return [
        ...apiLocations.provinces,
        ...apiLocations.districts,
        ...apiLocations.subDistricts
      ];
    }
  } catch (error) {
    console.warn('Failed to load locations from API, using mock data:', error);
  }
  
  // Fallback to mock data
  return [
    ...locationData.provinces,
    ...locationData.districts,
    ...locationData.subDistricts
  ];
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
 * Executes a migration query using the real API
 * @param locations - Array of selected locations
 * @returns Promise that resolves with success or rejects with error
 */
export async function executeQuery(locations: Location[]): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Import the migration API service dynamically to avoid circular dependencies
    const { migrationAPIService } = await import('../services/migration-api-service');
    
    // Use the real API service
    return await migrationAPIService.executeQuery(locations);
  } catch (error) {
    console.error('Query execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute migration query'
    };
  }
} 