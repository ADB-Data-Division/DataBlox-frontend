/**
 * Error models for the Datablox Engine Migrations API.
 */

// ============================================================================
// Error Models
// ============================================================================

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

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error response contains validation errors
 */
export function isValidationErrorResponse(
  error: ErrorResponse | ValidationErrorResponse
): error is ValidationErrorResponse {
  return 'validation_errors' in error;
}

/**
 * Type guard to check if an error is a general API error
 */
export function isErrorResponse(
  error: any
): error is ErrorResponse {
  return error && typeof error === 'object' && 'error' in error && 'message' in error;
} 