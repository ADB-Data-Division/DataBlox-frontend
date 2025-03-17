// app/services/data/data-service.ts
import { 
    DataLoaderInterface, 
    DataQuery, 
    GeoJSONLevel, 
    GeoJSONDataResult 
} from './data-loader-interface';

export class DataLoaderService implements DataLoaderInterface {
    private geoJSONCache: Map<GeoJSONLevel, any> = new Map();
    
    constructor() {
        // Initialize cache
    }
    
    async getData(query: DataQuery): Promise<any> {
        // Your existing implementation for getting data
        return {};
    }
    
    /**
     * Fetches GeoJSON data for the specified administrative level
     * @param level The administrative level (province, district, subdistrict)
     * @returns Promise with the GeoJSON data
     */
    async getGeoJSON(level: GeoJSONLevel): Promise<GeoJSONDataResult> {
        // Check if we have cached data
        if (this.geoJSONCache.has(level)) {
            return {
                type: 'geojson',
                level,
                data: this.geoJSONCache.get(level)
            };
        }
        
        // Determine file path based on level
        const filePath = `/${level}.geojson`;
        
        try {
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch GeoJSON: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            this.geoJSONCache.set(level, data);
            
            return {
                type: 'geojson',
                level,
                data
            };
        } catch (error) {
            console.error(`Error fetching GeoJSON data for ${level}:`, error);
            throw error;
        }
    }
    
    /**
     * Clears the GeoJSON cache
     * @param level Optional specific level to clear, or all levels if not specified
     */
    clearGeoJSONCache(level?: GeoJSONLevel): void {
        if (level) {
            this.geoJSONCache.delete(level);
        } else {
            this.geoJSONCache.clear();
        }
    }
}

// Create a singleton instance
export const dataService = new DataLoaderService();