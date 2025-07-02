/**
 * Utility functions and examples for the Capacity Building Engine Migrations API.
 */

import { 
  MigrationRequest, 
  MigrationResponse,
  LocationMigrationData,
  MigrationStats
} from './api-requests';
import { TimePeriod, Scale, Aggregation } from './api-types';
import { 
  ErrorResponse, 
  ValidationErrorResponse, 
  isValidationErrorResponse 
} from './api-errors';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a migration request with default values
 */
export function createMigrationRequest(
  scale: Scale,
  startDate: string,
  endDate: string,
  options?: Partial<Omit<MigrationRequest, 'scale' | 'start_date' | 'end_date'>>
): MigrationRequest {
  return {
    scale,
    start_date: startDate,
    end_date: endDate,
    ...options
  };
}

/**
 * Calculates net migration if not already provided
 */
export function calculateNetMigration(stats: MigrationStats): MigrationStats {
  return {
    ...stats,
    net_migration: stats.net_migration ?? (stats.move_in - stats.move_out)
  };
}

/**
 * Finds a specific time period by ID in a migration response
 */
export function findTimePeriod(
  response: MigrationResponse, 
  periodId: string
): TimePeriod | undefined {
  return response.time_periods.find(period => period.id === periodId);
}

/**
 * Gets migration data for a specific location and time period
 */
export function getLocationDataForPeriod(
  locationData: LocationMigrationData,
  periodId: string
): MigrationStats | undefined {
  return locationData.time_series[periodId];
}

/**
 * Filters migration response data by minimum net migration threshold
 */
export function filterByNetMigration(
  response: MigrationResponse,
  minNetMigration: number
): LocationMigrationData[] {
  return response.data.filter(locationData => {
    return Object.values(locationData.time_series).some(stats => {
      const netMigration = stats.net_migration ?? (stats.move_in - stats.move_out);
      return Math.abs(netMigration) >= minNetMigration;
    });
  });
}

/**
 * Aggregates migration stats across multiple time periods
 */
export function aggregateMigrationStats(stats: MigrationStats[]): MigrationStats {
  const totals = stats.reduce(
    (acc, stat) => ({
      move_in: acc.move_in + stat.move_in,
      move_out: acc.move_out + stat.move_out
    }),
    { move_in: 0, move_out: 0 }
  );

  return {
    ...totals,
    net_migration: totals.move_in - totals.move_out
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a migration request
 */
export function validateMigrationRequest(request: MigrationRequest): string[] {
  const errors: string[] = [];

  // Validate dates
  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);

  if (isNaN(startDate.getTime())) {
    errors.push('Invalid start_date format. Must be ISO 8601.');
  }

  if (isNaN(endDate.getTime())) {
    errors.push('Invalid end_date format. Must be ISO 8601.');
  }

  if (startDate >= endDate) {
    errors.push('start_date must be before end_date.');
  }

  // Validate scale-specific filters
  if (request.scale === 'province' && (request.districts || request.subdistricts)) {
    errors.push('Districts and subdistricts filters are not allowed when scale is province.');
  }

  if (request.scale === 'district' && request.subdistricts) {
    errors.push('Subdistricts filter is not allowed when scale is district.');
  }

  return errors;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Handles API errors and provides formatted error messages
 */
export function handleApiError(error: ErrorResponse | ValidationErrorResponse): string {
  if (isValidationErrorResponse(error)) {
    const validationMessages = error.validation_errors
      .map(validationError => `${validationError.field}: ${validationError.message}`)
      .join(', ');
    return `Validation Error: ${validationMessages}`;
  } else {
    return `API Error: ${error.message}`;
  }
}

/**
 * Extracts validation errors as a map for form handling
 */
export function extractValidationErrors(
  error: ValidationErrorResponse
): Record<string, string> {
  return error.validation_errors.reduce((acc: Record<string, string>, validationError) => {
    acc[validationError.field] = validationError.message;
    return acc;
  }, {} as Record<string, string>);
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Creating a migration request for provinces
 */
export function createProvinceRequest(): MigrationRequest {
  return createMigrationRequest(
    'province',
    '2023-01-01T00:00:00Z',
    '2023-12-31T23:59:59Z',
    {
      provinces: ['TH-10', 'TH-11'],
      aggregation: 'monthly'
    }
  );
}

/**
 * Example: Processing migration response data
 */
export function processMigrationData(response: MigrationResponse): void {
  console.log(`Total records: ${response.metadata.total_records}`);
  console.log(`Scale: ${response.metadata.scale}`);
  console.log(`Time periods: ${response.time_periods.length}`);
  
  response.data.forEach((locationData: LocationMigrationData) => {
    console.log(`\nLocation: ${locationData.location.name} (${locationData.location.id})`);
    
    Object.entries(locationData.time_series).forEach(([periodId, stats]) => {
      const period = findTimePeriod(response, periodId);
      const netMigration = stats.net_migration ?? (stats.move_in - stats.move_out);
      
      console.log(
        `  Period ${period?.start_date}: ` +
        `In: ${stats.move_in}, Out: ${stats.move_out}, Net: ${netMigration}`
      );
    });
  });
}