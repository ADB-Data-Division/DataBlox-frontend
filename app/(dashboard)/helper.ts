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
 * @returns Array of all locations
 */
export function getAllLocations(): Location[] {
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
  const allLocations = getAllLocations();
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
 * Simulates an API call for executing a query
 * @param locations - Array of selected locations
 * @returns Promise that resolves with success or rejects with error
 */
export async function executeQuery(locations: Location[]): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Simulate API call with potential for failure
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve(true);
        } else {
          reject(new Error('Query execution failed'));
        }
      }, 2000);
    });
    
    console.log('Query executed successfully with locations:', locations);
    
    return {
      success: true,
      data: {
        locations,
        timestamp: new Date().toISOString(),
        results: `Query executed for ${locations.length} location${locations.length > 1 ? 's' : ''}`
      }
    };
  } catch (error) {
    console.error('Query execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 