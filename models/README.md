# Migration API TypeScript Models

This directory contains TypeScript data models and utilities for the Capacity Building Engine Migrations API, generated from the OpenAPI specification.

## Overview

The models are organized into several files for better maintainability:

- `api-types.ts` - Core data types and interfaces
- `api-requests.ts` - Request and response models
- `api-errors.ts` - Error handling types and utilities
- `api-utils.ts` - Helper functions and examples
- `index.ts` - Main export file for easy importing

## Quick Start

### Import Everything

```typescript
import {
  // Types
  MigrationRequest,
  MigrationResponse,
  Province,
  District,
  LocationMigrationData,
  MigrationStats,
  Scale,
  Aggregation,
  
  // Utilities
  createMigrationRequest,
  processMigrationData,
  handleApiError,
  
  // Constants
  SCALES,
  DEFAULT_AGGREGATIONS
} from '@/models';
```

### Import Specific Types

```typescript
import type { MigrationRequest, Scale } from '@/models/api-types';
import { createMigrationRequest } from '@/models/api-utils';
```

## Usage Examples

### Creating a Migration Request

```typescript
import { createMigrationRequest } from '@/models';

// Basic request
const request = createMigrationRequest(
  'province',
  '2023-01-01T00:00:00Z',
  '2023-12-31T23:59:59Z'
);

// Request with additional options
const advancedRequest = createMigrationRequest(
  'district',
  '2023-01-01T00:00:00Z',
  '2023-06-30T23:59:59Z',
  {
    provinces: ['TH-10', 'TH-11'],
    aggregation: 'monthly'
  }
);
```

### Handling API Responses

```typescript
import { 
  MigrationResponse, 
  processMigrationData,
  filterByNetMigration 
} from '@/models';

async function fetchMigrationData(request: MigrationRequest) {
  try {
    const response: MigrationResponse = await fetch('/api/migration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }).then(res => res.json());

    // Process the data
    processMigrationData(response);

    // Filter by significant migration (minimum 1000 people)
    const significantMigrations = filterByNetMigration(response, 1000);
    
    return significantMigrations;
  } catch (error) {
    console.error('Failed to fetch migration data:', error);
    throw error;
  }
}
```

### Error Handling

```typescript
import { 
  handleApiError, 
  isValidationErrorResponse,
  extractValidationErrors 
} from '@/models';

async function handleApiCall() {
  try {
    // Your API call here
  } catch (error) {
    if (isValidationErrorResponse(error)) {
      const fieldErrors = extractValidationErrors(error);
      console.log('Validation errors:', fieldErrors);
    } else {
      const message = handleApiError(error);
      console.error(message);
    }
  }
}
```

### Working with Migration Stats

```typescript
import { 
  MigrationStats, 
  calculateNetMigration,
  aggregateMigrationStats 
} from '@/models';

const stats: MigrationStats = {
  move_in: 1500,
  move_out: 800
  // net_migration will be calculated automatically
};

const statsWithNet = calculateNetMigration(stats);
console.log(statsWithNet.net_migration); // 700

// Aggregate multiple periods
const quarterlyStats: MigrationStats[] = [
  { move_in: 500, move_out: 300 },
  { move_in: 400, move_out: 250 },
  { move_in: 600, move_out: 250 }
];

const yearlyTotal = aggregateMigrationStats(quarterlyStats);
console.log(yearlyTotal); // { move_in: 1500, move_out: 800, net_migration: 700 }
```

### Validation

```typescript
import { validateMigrationRequest } from '@/models';

const request: MigrationRequest = {
  scale: 'province',
  start_date: '2023-01-01T00:00:00Z',
  end_date: '2022-12-31T23:59:59Z', // Invalid: end before start
  districts: ['district-1'], // Invalid: districts filter with province scale
};

const errors = validateMigrationRequest(request);
if (errors.length > 0) {
  console.error('Request validation failed:', errors);
}
```

## API Reference

### Core Types

- `Scale` - Administrative levels: 'province' | 'district' | 'subdistrict'
- `Aggregation` - Time aggregation: 'monthly' | 'quarterly' | 'yearly'
- `Province` - Province information with id, name, and code
- `District` - District information with id, name, and province_id
- `Subdistrict` - Subdistrict information with id, name, and district_id
- `MigrationStats` - Migration statistics with move_in, move_out, and net_migration
- `LocationMigrationData` - Location with time-series migration data

### Request/Response Types

- `MigrationRequest` - Request parameters for migration data
- `MigrationResponse` - Response containing migration data and metadata
- `MetadataResponse` - Response containing available provinces, districts, and time periods

### Utility Functions

- `createMigrationRequest()` - Create a migration request with defaults
- `calculateNetMigration()` - Calculate net migration from move_in/move_out
- `findTimePeriod()` - Find a time period by ID in a response
- `filterByNetMigration()` - Filter locations by minimum net migration
- `aggregateMigrationStats()` - Aggregate stats across time periods
- `validateMigrationRequest()` - Validate a migration request
- `handleApiError()` - Format error messages for display
- `processMigrationData()` - Example function to process response data

## Type Safety

All models provide full TypeScript type safety:

```typescript
import type { MigrationRequest, Scale } from '@/models';

// Type-safe scale assignment
const scale: Scale = 'province'; // ✅ Valid
const invalidScale: Scale = 'city'; // ❌ TypeScript error

// Type-safe request construction
const request: MigrationRequest = {
  scale: 'province',
  start_date: '2023-01-01T00:00:00Z',
  end_date: '2023-12-31T23:59:59Z',
  // provinces: 123 // ❌ TypeScript error - should be string[]
  provinces: ['TH-10'] // ✅ Valid
};
```

## Integration with Existing Code

These models are designed to work alongside your existing data structures. The new `Province` interface extends the existing one by adding the required `code` field from the OpenAPI spec:

```typescript
// Existing province type (from province-district-subdistrict.ts)
type ExistingProvince = {
  id: string;
  name: string;
  category: string | null;
}

// New API province type
interface Province {
  id: string;
  name: string;
  code: string; // Required by API spec
}

// You can create adapters when needed:
function adaptToApiProvince(existing: ExistingProvince): Province {
  return {
    id: existing.id,
    name: existing.name,
    code: existing.id // or derive from another field
  };
}
```

## Best Practices

1. **Use the index file** for imports to get a clean API surface
2. **Validate requests** before sending to the API using `validateMigrationRequest()`
3. **Handle errors** consistently using the provided error utilities
4. **Type your API responses** using the provided interfaces
5. **Use utility functions** for common operations like filtering and aggregation 