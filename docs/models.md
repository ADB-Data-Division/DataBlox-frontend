# TypeScript Data Models

This file contains TypeScript data models generated from the OpenAPI specification for the Datablox Engine Migrations API.

## Type Aliases

```typescript
export type Scale = 'province' | 'district' | 'subdistrict';
export type Aggregation = 'monthly' | 'quarterly' | 'yearly';
```

## Core Data Models

### Geographic Entities

```typescript
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
```

### Time Period Models

```typescript
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
```

### Migration Data Models

```typescript
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
```

### Request/Response Models

```typescript
export interface MetadataResponse {
  /** List of available provinces */
  provinces: Province[];
  /** List of available districts */
  districts?: District[];
  /** List of available subdistricts */
  subdistricts?: Subdistrict[];
  time_periods: TimePeriods;
}

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
```

### Error Models

```typescript
export interface ErrorResponse {
  /** Error type identifier */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, any>;
}

export interface ValidationError {
  /** Name of the field that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Validation error code */
  code?: string;
}

export interface ValidationErrorResponse {
  /** Error type identifier */
  error: string;
  /** Human-readable error message */
  message: string;
  validation_errors: ValidationError[];
}
```

## Usage Examples

### Making a Migration Request

```typescript
const migrationRequest: MigrationRequest = {
  scale: 'province',
  start_date: '2023-01-01T00:00:00Z',
  end_date: '2023-12-31T23:59:59Z',
  provinces: ['TH-10', 'TH-11'],
  aggregation: 'monthly'
};
```

### Processing Migration Response

```typescript
function processMigrationData(response: MigrationResponse): void {
  console.log(`Total records: ${response.metadata.total_records}`);
  
  response.data.forEach((locationData: LocationMigrationData) => {
    console.log(`Location: ${locationData.location.name}`);
    
    Object.entries(locationData.time_series).forEach(([periodId, stats]) => {
      const period = response.time_periods.find(p => p.id === periodId);
      console.log(`Period ${period?.start_date}: Net migration = ${stats.net_migration}`);
    });
  });
}
```

### Error Handling

```typescript
function handleApiError(error: ErrorResponse | ValidationErrorResponse): void {
  if ('validation_errors' in error) {
    // Handle validation errors
    error.validation_errors.forEach((validationError: ValidationError) => {
      console.error(`Validation error in ${validationError.field}: ${validationError.message}`);
    });
  } else {
    // Handle general errors
    console.error(`API Error: ${error.message}`);
  }
}
```
