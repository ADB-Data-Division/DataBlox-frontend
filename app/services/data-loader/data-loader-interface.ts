import { Subaction } from "@/components/visualization-toolbar/types";
import type { Feature, FeatureCollection } from 'geojson';

export type Filter = {
	type: 'province' | 'industry' | 'district' | 'datetime' | 'subaction';
	/**
	 * A unique identifier for this filter.
	 * 
	 * Note that for each type of filter (e.g. ProvinceFilter) all values must have the same filter id.
	 * 
	 * Another example: datetime filters should have the same filter id if they are for the same dataset.
	 */
	filter_id: 'province-filter' | 'industry-filter' | 'district-filter' | 'datetime-filter' | 'subaction-filter';
}

export type ProvinceFilter = Filter & {
	type: 'province';
	province_ids: string[];
}

export type IndustryFilter = Filter & {
	type: 'industry';
	industry_id: string;
}

export type DistrictFilter = Filter & {
	type: 'district';
	district_id: string;
}

export type DateTimeFilter = Filter & {
	type: 'datetime';
	label: string;
	time_period: string;
	/**
	 * In ISO 8601 format
	 */
	start_date: string;
	/**
	 * In ISO 8601 format
	 */
	end_date: string;
}

export type SubactionFilter = Filter & {
	type: 'subaction';
	label: string;
	subaction: Subaction;
}

export type DataQuery = {
	dataset_id: string;
	filters: Filter[];
}

export type DataResult = {
	type: 'migration' | 'geojson';
}

export type MigrationDataResult = {
	type: 'migration';
	// Your migration data structure here
}

// Define different GeoJSON levels
export enum GeoJSONLevel {
	PROVINCE = 'province',
	DISTRICT = 'district',
	SUBDISTRICT = 'subdistrict'
}

// Result type for GeoJSON data
export type GeoJSONDataResult = {
	type: 'geojson';
	level: GeoJSONLevel;
	data: FeatureCollection;
}

// Result type for streaming GeoJSON data
export type GeoJSONStreamResult = {
	type: 'geojson-stream';
	level: GeoJSONLevel;
	// This will immediately return basic metadata
	metadata: {
		type: 'FeatureCollection';
		// Optional metadata that might be available from the header
		bbox?: number[];
		crs?: any;
	};
	// This is an async generator that will yield features as they arrive
	stream: AsyncGenerator<Feature>;
	// Optional cache that will collect the features for later use
	cacheFeatures?: boolean;
}

// Callback type for feature events
export type FeatureCallback = (feature: Feature) => void;

export interface DataLoaderInterface {
	// Load a dataset
	getData(query: DataQuery): Promise<any>;
	
	// Load GeoJSON data (complete mode - waits for all data)
	getGeoJSON(level: GeoJSONLevel): Promise<GeoJSONDataResult>;
	
	// Load GeoJSON data with streaming (incremental mode - yields as data arrives)
	getGeoJSONStream(level: GeoJSONLevel, cacheFeatures?: boolean): Promise<GeoJSONStreamResult>;
	
	// Clear the cache
	clearGeoJSONCache(level?: GeoJSONLevel): void;
}