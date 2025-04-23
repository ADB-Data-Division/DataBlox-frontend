// app/services/data/data-service.ts
import { 
    DataLoaderInterface, 
    DataQuery, 
    GeoJSONLevel, 
    GeoJSONDataResult,
    GeoJSONStreamResult
} from './data-loader-interface';
import { deserialize, deserializeStream } from 'flatgeobuf/lib/mjs/geojson/featurecollection.js';
import type { Feature, FeatureCollection } from 'geojson';
import { config } from '@/src/config';

export class DataLoaderService implements DataLoaderInterface {
    private geoJSONCache: Map<GeoJSONLevel, FeatureCollection> = new Map();
    private pendingStreamRequests: Map<string, Promise<ReadableStream<Uint8Array>>> = new Map();
    
    constructor() {
        // Initialize cache
    }
    
    async getData(query: DataQuery): Promise<any> {
        // Your existing implementation for getting data
        return {};
    }
    
    /**
     * Fetches complete GeoJSON data for the specified administrative level.
     * This waits for all features to be collected before returning.
     * 
     * @param level The administrative level (province, district, subdistrict)
     * @returns Promise with the complete GeoJSON data
     */
    async getGeoJSON(level: GeoJSONLevel): Promise<GeoJSONDataResult> {
        // Check if we have cached data
        if (this.geoJSONCache.has(level)) {
            return {
                type: 'geojson',
                level,
                data: this.geoJSONCache.get(level) as FeatureCollection
            };
        }
        
        try {
            // For complete loading, we use the streaming version internally but collect all features
            const streamResult = await this.getGeoJSONStream(level, true);
            
            // Collect all features from the stream
            const features: Feature[] = [];
            for await (const feature of streamResult.stream) {
                features.push(feature);
            }
            
            // Create the complete feature collection
            const featureCollection: FeatureCollection = {
                type: 'FeatureCollection',
                features,
                // Copy any metadata if available (safely)
                ...(streamResult.metadata.bbox ? { bbox: streamResult.metadata.bbox as [number, number, number, number] } : {})
            };
            
            // The streaming version should have cached this already if cacheFeatures was true
            if (!this.geoJSONCache.has(level)) {
                this.geoJSONCache.set(level, featureCollection);
            }
            
            return {
                type: 'geojson',
                level,
                data: featureCollection
            };
        } catch (error) {
            console.error(`Error fetching GeoJSON data for ${level}:`, error);
            throw error;
        }
    }
    
    /**
     * Streams GeoJSON features for the specified administrative level.
     * Returns immediately with a stream that yields features as they arrive.
     * 
     * @param level The administrative level (province, district, subdistrict)
     * @param cacheFeatures Whether to cache features as they arrive
     * @returns Promise with metadata and an AsyncGenerator for features
     */
    async getGeoJSONStream(level: GeoJSONLevel, cacheFeatures = false): Promise<GeoJSONStreamResult> {
        // Check if we have cached data and the consumer wants complete data
        if (this.geoJSONCache.has(level)) {
            const cachedData = this.geoJSONCache.get(level) as FeatureCollection;
            
            // Create an async generator from the cached features
            const cachedStream = async function* () {
                for (const feature of cachedData.features) {
                    yield feature;
                }
            };
            
            return {
                type: 'geojson-stream',
                level,
                metadata: {
                    type: 'FeatureCollection',
                    bbox: cachedData.bbox
                },
                stream: cachedStream()
            };
        }
        
        try {
            // Determine if we have a FGB configuration for this level
            const usesFlatGeobuf = level === GeoJSONLevel.PROVINCE && !!config.geojsondata.province;
            
            // Return a stream result with async generator
            return {
                type: 'geojson-stream',
                level,
                metadata: { type: 'FeatureCollection' },
                stream: this.createFeatureStream(level, usesFlatGeobuf, cacheFeatures)
            };
        } catch (error) {
            console.error(`Error setting up GeoJSON stream for ${level}:`, error);
            throw error;
        }
    }
    
    /**
     * Fetches a response with a ReadableStream, with deduplication to prevent duplicate fetches
     * @param url The URL to fetch
     * @returns Promise that resolves to a ReadableStream
     */
    private async fetchStreamWithDeduplication(url: string): Promise<ReadableStream<Uint8Array>> {
        // Check if we have a pending request for this URL
        if (this.pendingStreamRequests.has(url)) {
            console.log(`Reusing pending stream request for ${url}`);
            return this.pendingStreamRequests.get(url)!;
        }
        
        // Create a new stream promise
        console.log(`Creating new stream request for ${url}`);
        const streamPromise = (async () => {
            try {
                const response = await fetch(url, {
                    headers: { Accept: 'application/octet-stream' }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch stream: ${response.status}`);
                }
                
                // Return a cloneable stream if possible, or throw error
                if (!response.body) {
                    throw new Error("Stream not supported by browser");
                }
                
                // Create and return a tee'd stream so multiple consumers can use it
                // We need to clone the stream before it's consumed
                return response.body;
            } finally {
                // Remove the pending request when complete
                this.pendingStreamRequests.delete(url);
            }
        })();
        
        // Store the promise
        this.pendingStreamRequests.set(url, streamPromise);
        
        // Return the promise
        return streamPromise;
    }
    
    /**
     * Creates an async generator that yields features as they are deserialized.
     * 
     * @param level The administrative level
     * @param usesFlatGeobuf Whether to use FlatGeobuf format
     * @param cacheFeatures Whether to cache features as they arrive
     * @returns An AsyncGenerator yielding features
     */
    private async *createFeatureStream(
        level: GeoJSONLevel, 
        usesFlatGeobuf: boolean,
        cacheFeatures: boolean
    ): AsyncGenerator<Feature> {
        // If caching is enabled and we don't already have a cache entry, prepare it
        let collectedFeatures: Feature[] = [];
        let featureCount = 0;
        
        try {
            if (usesFlatGeobuf) {
                // Use FlatGeobuf approach
                const fgbUrl = config.geojsondata.province.uri;
                console.log(`Loading FlatGeobuf from: ${fgbUrl}`);
                
                try {
                    // First try with streaming approach, which is more efficient
                    console.log("Attempting streaming deserialization");
                    
                    // Get a stream with deduplication
                    const stream = await this.fetchStreamWithDeduplication(fgbUrl);
                    
                    // Use streaming deserialization
                    for await (const feature of deserializeStream(stream)) {
                        // Convert IFeature to GeoJSON Feature
                        const geoJsonFeature = feature as unknown as Feature;
                        featureCount++;
                        
                        // Log every 10th feature to avoid console spam
                        if (featureCount % 10 === 0) {
                            console.log(`Processed ${featureCount} features so far (streaming)`);
                        }
                        
                        // Collect for caching if needed
                        if (cacheFeatures) {
                            collectedFeatures.push(geoJsonFeature);
                        }
                        
                        // Yield each feature as it's deserialized
                        yield geoJsonFeature;
                    }
                } catch (streamError) {
                    // If streaming fails, fall back to traditional arrayBuffer approach
                    console.log("Streaming deserialization failed, using arrayBuffer:", streamError);
                    
                    // Make a fresh request since the stream might be consumed
                    const response = await fetch(fgbUrl, {
                        headers: { Accept: 'application/octet-stream' }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch FlatGeobuf: ${response.status}`);
                    }
                    
                    const arrayBuffer = await response.arrayBuffer();
                    
                    for await (const feature of deserialize(new Uint8Array(arrayBuffer))) {
                        const geoJsonFeature = feature as unknown as Feature;
                        featureCount++;
                        
                        if (featureCount % 10 === 0) {
                            console.log(`Processed ${featureCount} features so far (arrayBuffer)`);
                        }
                        
                        if (cacheFeatures) {
                            collectedFeatures.push(geoJsonFeature);
                        }
                        
                        yield geoJsonFeature;
                    }
                }
            } else {
                // Fallback to traditional GeoJSON files
                const filePath = `/${level}.geojson`;
                console.log(`Loading traditional GeoJSON from: ${filePath}`);
                
                const response = await fetch(filePath);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch GeoJSON: ${response.status}`);
                }
                
                const data = await response.json() as FeatureCollection;
                console.log(`Loaded GeoJSON with ${data.features.length} features`);
                
                // For traditional GeoJSON, yield each feature from the already complete collection
                for (const feature of data.features) {
                    featureCount++;
                    
                    if (cacheFeatures) {
                        collectedFeatures.push(feature);
                    }
                    
                    yield feature;
                }
            }
            
            // After streaming completes, cache the collected features if requested
            if (cacheFeatures && collectedFeatures.length > 0) {
                const featureCollection: FeatureCollection = {
                    type: 'FeatureCollection',
                    features: collectedFeatures
                };
                
                this.geoJSONCache.set(level, featureCollection);
            }
            
            console.log(`Total features processed for ${level}: ${featureCount}`);
        } catch (error) {
            console.error(`Error in feature stream for ${level}:`, error);
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