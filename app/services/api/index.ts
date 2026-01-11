// Export all API types
export * from './types';

// Export API client and error class
export { MigrationAPIClient, APIError, createAPIClient, apiClient } from './client';

// Export authenticated API client
export { createAuthenticatedAPIClient, authenticatedApiClient } from './authenticated-client';

// Export Tourism API client and error class
export { TourismAPIClient, TourismAPIError, createTourismAPIClient, tourismApiClient } from './tourism-client';

// Export authenticated Tourism API client
export { createAuthenticatedTourismAPIClient, authenticatedTourismApiClient } from './authenticated-tourism-client';

// Export service classes and instances
export { MetadataService, metadataService } from './metadata-service';
export { MigrationService, migrationService } from './migration-service';
export { TourismService, tourismService } from './tourism-service';
export { ValidationService, validationService } from './validation-service';

// Export service interfaces
export type { MigrationQueryOptions } from './migration-service';
export type { TourismQueryOptions } from './tourism-service';

// Export transformation utilities
export { 
  transformMigrationDataForMap, 
  getAvailableTimePeriods,
} from './migration-flow-transformer';
export type { MapNode, MapConnection, TransformedMigrationData } from './migration-flow-transformer';

// Export tourism transformation utilities
export { 
  transformTourismDataForMap, 
  getTourismTimePeriods,
} from './tourism-flow-transformer';
export type { TourismMapNode, TourismMapConnection, TransformedTourismData } from './tourism-flow-transformer';
