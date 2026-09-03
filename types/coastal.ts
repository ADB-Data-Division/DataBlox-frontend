/**
 * TypeScript definitions for DataBlox Coastal Waters (Seaport & Eutrophication) analytics.
 * Strictly aligned with backend FastAPI schemas and OpenAPI specifications.
 */

export type CoastalGrain = "monthly" | "weekly" | "annually";

export type CoastalIndicator =
  | "mean_chlor_a"
  | "chlor_a"
  | "mean_sea_surface_temperature"
  | "sst"
  | "n_unique_vessels"
  | "vessels"
  | "total_stationary_vessel_cell_presence_hours"
  | "total_vessel_cell_presence_hours";

export type CoastalAggFunc = "average" | "maximum" | "mean" | "max";

export type CoastalVesselMetric =
  | "vessel_count"
  | "duration"
  | "presence_hours"
  | "stationary_hours";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  min_lng: number;
  max_lng: number;
  min_lat: number;
  max_lat: number;
}

export interface CoastalCountry {
  id?: string | null;
  code?: string | null;
  iso: string;
  country_iso?: string;
  name: string;
  country_name?: string;
  flag?: string | null;
  center?: Coordinates | number[] | null;
  bounding_box?: BoundingBox | number[] | null;
  default_grain?: CoastalGrain;
  available_grains?: CoastalGrain[];
  aoi_count?: number;
  total_hexagons?: number;
  indicators?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

export interface CoastalProvince {
  name: string;
  country_iso: string;
  countryIso?: string;
  aois: string[];
  aoi_count?: number;
  total_hexagons?: number;
}

export interface CoastalLocation {
  id?: string | null;
  aoi_id: string;
  name: string;
  display_name?: string;
  province?: string;
  country_iso: string;
  type?: string;
  hexagon_count?: number;
  grid_cell_count?: number;
  center?: Coordinates | number[] | null;
  bounding_box?: BoundingBox | number[] | null;
}

export interface PercentageDeltas {
  chlor_a_pop_pct?: number | null;
  chlor_a_yoy_pct?: number | null;
  sst_pop_pct?: number | null;
  sst_yoy_pct?: number | null;
  vessels_pop_pct?: number | null;
  vessels_yoy_pct?: number | null;
  duration_pop_pct?: number | null;
  duration_yoy_pct?: number | null;
}

export interface IndicatorTimelinePoint {
  period_start: string;
  period_end: string;
  mean_chlor_a?: number | null;
  chlor_a?: number | null;
  mean_sea_surface_temperature?: number | null;
  sst_k?: number | null;
  sst_c?: number | null;
  n_unique_vessels?: number;
  unique_vessels?: number;
  total_vessels?: number;
  port_call_duration_hours?: number;
  total_stationary_hours?: number;
  total_presence_hours?: number;
  deltas?: PercentageDeltas;
  values?: Record<string, number | null>;
}

export interface IndicatorSummaryCard {
  average?: number;
  peak?: number;
  min?: number;
  latest?: number;
  average_k?: number;
  peak_k?: number;
  min_k?: number;
  average_c?: number;
  peak_c?: number;
  min_c?: number;
  latest_k?: number;
  latest_c?: number;
  cumulative?: number;
  average_hours?: number;
  peak_hours?: number;
  latest_hours?: number;
  pop_delta_pct?: number | null;
  yoy_delta_pct?: number | null;
}

export interface IndicatorTimelineSummary {
  country_iso: string;
  aoi_id?: string | null;
  grain: CoastalGrain;
  total_points: number;
  cumulative_vessels?: number;
  total_vessels?: number;
  chlor_a?: IndicatorSummaryCard;
  sea_surface_temperature?: IndicatorSummaryCard;
  port_call_duration?: IndicatorSummaryCard;
  vessels?: IndicatorSummaryCard;
}

export interface IndicatorTimelineResponse {
  country_iso: string;
  country?: string;
  aoi_id?: string | null;
  start_date?: string;
  end_date?: string;
  grain: CoastalGrain;
  aggregation?: string;
  summary?: IndicatorTimelineSummary;
  summary_cards?: Record<string, unknown> | null;
  timeline?: IndicatorTimelinePoint[];
  series?: IndicatorTimelinePoint[];
  deltas?: Record<string, unknown> | null;
}

export interface GeoJSONGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface GeoJSONFeatureProperties {
  h3_index: string;
  aoi_id: string;
  country_iso?: string;
  [key: string]: unknown;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: GeoJSONFeatureProperties;
  id?: string | number;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  bbox?: number[];
  metadata?: {
    country_iso?: string;
    resolution?: number;
    total_hexagons?: number;
    [key: string]: unknown;
  };
}

export interface SpatialCellMetrics {
  chlor_a?: number | null;
  sst_k?: number | null;
  sst_c?: number | null;
  vessels?: number;
  duration_hours?: number;
  [key: string]: unknown;
}

export interface SpatialSliceResponse {
  country_iso: string;
  country?: string;
  period_start: string;
  period_end?: string;
  grain: CoastalGrain;
  indicator?: string;
  values?: Record<string, SpatialCellMetrics | number | null>;
  data?: Record<string, SpatialCellMetrics | number | null>;
}

export interface SpatialSeriesResponse {
  country?: string;
  country_iso?: string;
  start_date: string;
  end_date?: string;
  grain: CoastalGrain;
  indicator?: string;
  aoi_id?: string;
  series: Record<string, Record<string, SpatialCellMetrics>>;
}

export interface VesselTimelinePoint {
  period_start: string;
  period_end: string;
  total_vessels: number;
  total_presence_hours: number;
  total_stationary_hours: number;
  avg_stationary_hours_per_cell: number;
}

export interface VesselTimelineResponse {
  country_iso: string;
  country?: string;
  aoi_id?: string | null;
  start_date?: string;
  end_date?: string;
  grain: CoastalGrain;
  metric: CoastalVesselMetric;
  summary?: {
    cumulative_vessels?: number;
    peak_vessels?: number;
    total_presence_hours?: number;
    total_stationary_hours?: number;
  };
  timeline?: VesselTimelinePoint[];
  series?: VesselTimelinePoint[];
}

export interface FleetCategory {
  category: string;
  name: string;
  count: number;
  value: number;
  percentage: number;
}

export interface FleetSubtype {
  coarse_type: string;
  granular_type: string;
  count: number;
  percentage: number;
}

export interface VesselDistributionResponse {
  country_iso: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  total_records: number;
  total_vessels: number;
  pie_chart: FleetCategory[];
  distribution?: FleetCategory[];
  drilldown: Record<string, FleetSubtype[]>;
  bar_chart?: Record<string, FleetSubtype[]> | FleetCategory[];
}

export interface CoastalTimelineParams {
  country: string;
  aoi_id?: string;
  start_date?: string;
  end_date?: string;
  grain?: CoastalGrain;
  indicators?: string | string[];
  agg_func?: CoastalAggFunc;
  engine?: "duckdb" | "postgres";
}

export interface SpatialSliceParams {
  country: string;
  period_start: string;
  period_end?: string;
  grain?: CoastalGrain;
  indicator?: string;
  engine?: "duckdb" | "postgres";
}

export interface SpatialSeriesParams {
  country: string;
  start_date: string;
  end_date?: string;
  grain?: CoastalGrain;
  indicator?: string;
  aoi_id?: string;
  engine?: "duckdb" | "postgres";
}

export interface VesselTimelineParams {
  country: string;
  aoi_id?: string;
  start_date?: string;
  end_date?: string;
  grain?: CoastalGrain;
  metric?: CoastalVesselMetric;
  engine?: "duckdb" | "postgres";
}

export interface VesselDistributionParams {
  country: string;
  start_date?: string;
  end_date?: string;
  engine?: "duckdb" | "postgres";
}
