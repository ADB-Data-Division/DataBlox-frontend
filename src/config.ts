import { GeoJSONLevel } from "@/app/services/data-loader/data-loader-interface";

export const config = {
	geojsondata: {
		province: {
			uri: 'https://n1.tome.gg/adb/capacity-building/query.fgb',
			layer: 'province',
			adminLevel: GeoJSONLevel.PROVINCE,
		}
	}
}