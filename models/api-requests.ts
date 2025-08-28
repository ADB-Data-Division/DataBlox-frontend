/**
 * Request and Response models for the Datablox Engine Migrations API.
 */

import { 
  Scale, 
  Aggregation, 
  Province, 
  District, 
  Subdistrict, 
  TimePeriods, 
  TimePeriod, 
  LocationMigrationData,
  MigrationStats 
} from './api-types';

// Re-export for convenience
export type { LocationMigrationData, MigrationStats } from './api-types';

// ============================================================================
// Request Models
// ============================================================================

export interface MigrationRequest {
  /** Administrative level for data aggregation */
  scale: Scale;
  /** Start date/time for the query period (inclusive) in ISO 8601 format */
  start_date: string;
  /** End date/time for the query period (exclusive) in ISO 8601 format */
  end_date: string;
  /** Filter by specific province IDs */
  provinces?: string[];
  /** Filter by specific district IDs (when scale is district or subdistrict) */
  districts?: string[];
  /** Filter by specific subdistrict IDs (when scale is subdistrict) */
  subdistricts?: string[];
  /** Time aggregation level */
  aggregation?: Aggregation;
}

// ============================================================================
// Response Models
// ============================================================================

export interface MetadataResponse {
  /** List of available provinces */
  provinces: Province[];
  /** List of available districts */
  districts?: District[];
  /** List of available subdistricts */
  subdistricts?: Subdistrict[];
  time_periods: TimePeriods;
}

export interface ResponseMetadata {
  /** Administrative level of the data */
  scale: Scale;
  /** Start date/time of the data in ISO 8601 format */
  start_date: string;
  /** End date/time of the data in ISO 8601 format */
  end_date: string;
  /** Total number of location records returned */
  total_records: number;
  /** Time aggregation level used */
  aggregation?: Aggregation;
}

export interface MigrationResponse {
  metadata: ResponseMetadata;
  /** List of time periods included in the response */
  time_periods: TimePeriod[];
  /** Migration data for each location */
  data: LocationMigrationData[];
} 