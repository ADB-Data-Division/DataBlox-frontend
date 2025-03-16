export type Filter = {
	type: 'province' | 'industry' | 'district' | 'datetime';
	filter_id: string;
}

export type ProvinceFilter = Filter & {
	type: 'province';
	province_id: string;
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
	/**
	 * In ISO 8601 format
	 */
	start_date: string;
	/**
	 * In ISO 8601 format
	 */
	end_date: string;
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

export interface DataInterface {
	getData(query: DataQuery): Promise<any>;
	
	// New method for fetching GeoJSON data
	getGeoJSON(level: GeoJSONLevel): Promise<GeoJSONDataResult>;
}