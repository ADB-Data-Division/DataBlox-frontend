/**
 * Main export file for Datablox Engine Migrations API models.
 * This file provides a single entry point for all API types and utilities.
 */

// Import types for internal use
import type { Scale, Aggregation } from './api-types';
import type { MigrationRequest } from './api-requests';

// ============================================================================
// Core Types
// ============================================================================

export type {
  Scale,
  Aggregation,
  Province,
  District,
  Subdistrict,
  LocationInfo,
  TimePeriod,
  TimePeriods,
  MigrationStats,
  LocationMigrationData
} from './api-types';

// ============================================================================
// Request/Response Types
// ============================================================================

export type {
  MigrationRequest,
  MetadataResponse,
  ResponseMetadata,
  MigrationResponse
} from './api-requests';

// ============================================================================
// Error Types
// ============================================================================

export type {
  ErrorResponse,
  ValidationError,
  ValidationErrorResponse
} from './api-errors';

export {
  isValidationErrorResponse,
  isErrorResponse
} from './api-errors';

// ============================================================================
// Utility Functions
// ============================================================================

export {
  createMigrationRequest,
  calculateNetMigration,
  findTimePeriod,
  getLocationDataForPeriod,
  filterByNetMigration,
  aggregateMigrationStats,
  validateMigrationRequest,
  handleApiError,
  extractValidationErrors,
  createProvinceRequest,
  processMigrationData
} from './api-utils';

// ============================================================================
// Constants and Defaults
// ============================================================================

export const DEFAULT_AGGREGATIONS: Aggregation[] = ['monthly', 'quarterly', 'yearly'];
export const SCALES: Scale[] = ['province', 'district', 'subdistrict'];

/**
 * Default migration request configuration
 */
export const DEFAULT_MIGRATION_REQUEST: Partial<MigrationRequest> = {
  aggregation: 'monthly',
  scale: 'province'
}; 