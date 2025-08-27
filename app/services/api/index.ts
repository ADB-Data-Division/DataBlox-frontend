// Export all API types
export * from './types';

// Export API client and error class
export { MigrationAPIClient, APIError, createAPIClient, apiClient } from './client';

// Export service classes and instances
export { MetadataService, metadataService } from './metadata-service';
export { MigrationService, migrationService } from './migration-service';
export { ValidationService, validationService } from './validation-service';

// Export service interfaces
export type { MigrationQueryOptions } from './migration-service';

// Export transformation utilities
export { 
  transformMigrationDataForMap, 
  getAvailableTimePeriods,
} from './migration-flow-transformer';
export type { MapNode, MapConnection, TransformedMigrationData } from './migration-flow-transformer'; 