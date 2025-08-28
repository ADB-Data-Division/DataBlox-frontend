/**
 * TypeScript data models generated from the OpenAPI specification 
 * for the Datablox Engine Migrations API.
 */

// ============================================================================
// Core Type Aliases
// ============================================================================

export type Scale = 'province' | 'district' | 'subdistrict';
export type Aggregation = 'monthly' | 'quarterly' | 'yearly';

// ============================================================================
// Geographic Entities
// ============================================================================

export interface Province {
  id: string;
  name: string;
  code: string;
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

export interface LocationInfo {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
}

// ============================================================================
// Time Period Models
// ============================================================================

export interface TimePeriod {
  /** 5-character unique identifier for this time period */
  id: string;
  /** Start date/time of the period (inclusive) in ISO 8601 format */
  start_date: string;
  /** End date/time of the period (exclusive) in ISO 8601 format */
  end_date: string;
}

export interface TimePeriods {
  /** Earliest available date/time in ISO 8601 format */
  start_date: string;
  /** Latest available date/time in ISO 8601 format */
  end_date: string;
  /** List of available time periods with unique IDs */
  available_periods: TimePeriod[];
}

// ============================================================================
// Migration Data Models
// ============================================================================

export interface MigrationStats {
  /** Number of people moving into the location */
  move_in: number;
  /** Number of people moving out of the location */
  move_out: number;
  /** Net migration (move_in - move_out) */
  net_migration?: number;
}

export interface LocationMigrationData {
  location: LocationInfo;
  /** Time-series migration data keyed by time period ID */
  time_series: Record<string, MigrationStats>;
} 