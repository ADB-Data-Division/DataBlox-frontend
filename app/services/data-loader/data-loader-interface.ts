import { Subaction } from "@/components/visualization-toolbar/types";

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

// New GeoJSON types
export enum GeoJSONLevel {
	PROVINCE = 'adm1',
	DISTRICT = 'adm2',
	SUBDISTRICT = 'adm3'
}

export type GeoJSONDataResult = {
	type: 'geojson';
	level: GeoJSONLevel;
	data: any; // GeoJSON data
}

export interface DataLoaderInterface {
	getData(query: DataQuery): Promise<any>;
	
	// New method for fetching GeoJSON data
	getGeoJSON(level: GeoJSONLevel): Promise<GeoJSONDataResult>;
}