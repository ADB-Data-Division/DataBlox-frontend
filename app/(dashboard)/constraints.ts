/**
 * Application constraints and configuration constants
 */

/**
 * Maximum number of locations a user can select
 */
export const MAX_LOCATIONS = 20;

/**
 * Location selection constraints and rules
 */
export const LOCATION_CONSTRAINTS = {
  /**
   * Maximum total locations that can be selected
   */
  MAX_TOTAL_LOCATIONS: MAX_LOCATIONS,
  
  /**
   * Whether to enforce same-type selection (all provinces, all districts, etc.)
   * When true, after selecting a location of one type, only locations of the same type can be selected
   */
  ENFORCE_SAME_TYPE_SELECTION: true,
  
  /**
   * Whether to show a warning when approaching the limit
   */
  SHOW_LIMIT_WARNING: true,
  
  /**
   * At what percentage of the limit to show warning (e.g., 0.8 = 80%)
   */
  WARNING_THRESHOLD: 0.8,
} as const;

/**
 * Get the warning threshold count
 */
export const getWarningThreshold = (): number => {
  return Math.floor(LOCATION_CONSTRAINTS.MAX_TOTAL_LOCATIONS * LOCATION_CONSTRAINTS.WARNING_THRESHOLD);
};

/**
 * Check if adding more locations would exceed the limit
 */
export const canAddMoreLocations = (currentCount: number, maxLimit?: number, additionalCount: number = 1): boolean => {
  const limit = maxLimit ?? LOCATION_CONSTRAINTS.MAX_TOTAL_LOCATIONS;
  return (currentCount + additionalCount) <= limit;
};

/**
 * Check if we should show a warning about approaching the limit
 */
export const shouldShowWarning = (currentCount: number): boolean => {
  return LOCATION_CONSTRAINTS.SHOW_LIMIT_WARNING && currentCount >= getWarningThreshold();
};

/**
 * Get remaining slots for location selection
 */
export const getRemainingSlots = (currentCount: number): number => {
  return Math.max(0, LOCATION_CONSTRAINTS.MAX_TOTAL_LOCATIONS - currentCount);
};