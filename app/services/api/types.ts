// API Types based on OpenAPI 3.0.3 specification

// Base response types
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationErrorResponse {
  error: string;
  message: string;
  validation_errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Location types
export interface Province {
  id: string;
  name: string;
  code: string;
  region?: string; // Optional region field for frontend mapping
}

export interface District {
  id: string;
  name: string;
  province_id: string;
}

export interface Subdistrict {
  id: string;
  name: string;
  district_id: string;
}

// Time period types
export interface TimePeriod {
  id: string;
  start_date: string; // ISO 8601 format
  end_date: string;   // ISO 8601 format
}

export interface TimePeriods {
  start_date: string;
  end_date: string;
  available_periods: TimePeriod[];
}

// Metadata API types
export interface MetadataResponse {
  provinces: Province[];
  districts?: District[];
  subdistricts?: Subdistrict[];
  time_periods: TimePeriods;
}

// Migration request types
export type Scale = 'province' | 'district' | 'subdistrict';
export type Aggregation = 'monthly' | 'quarterly' | 'yearly';

export interface MigrationRequest {
  scale: Scale;
  start_date?: string; // ISO 8601 format - optional, server will use latest dataset if omitted
  end_date?: string;   // ISO 8601 format - optional, server will use latest dataset if omitted
  provinces?: string[];
  districts?: string[];
  subdistricts?: string[];
  aggregation?: Aggregation;
  include_flows?: boolean;
}

// Migration response types
export interface ResponseMetadata {
  scale: Scale;
  start_date: string;
  end_date: string;
  total_records: number;
  aggregation?: Aggregation;
}

export interface LocationInfo {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
}

export interface MigrationStats {
  move_in: number;
  move_out: number;
  net_migration?: number;
}

export interface LocationMigrationData {
  location: LocationInfo;
  time_series: Record<string, MigrationStats>; // keyed by time period ID
}

export interface MigrationFlow {
  origin: LocationInfo;
  destination: LocationInfo;
  time_period_id: string;
  flow_count: number;
  flow_rate: number;
  return_flow_count?: number;
  return_flow_rate?: number;
}

export interface MigrationResponse {
  metadata: ResponseMetadata;
  time_periods: TimePeriod[];
  data: LocationMigrationData[];
  flows?: MigrationFlow[];
}

// Dataset validation types
export interface ValidationResponse {
  valid: boolean;
  message: string;
  item_key: string;
  details?: {
    files_checked?: string[];
    errors?: string[];
  };
}

// API client configuration
export interface APIConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// API response wrapper
export interface APIResponse<T> {
  data: T;
  status: number;
  statusText: string;
} 