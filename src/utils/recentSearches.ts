/**
 * Recent Searches utility for managing search history in localStorage
 */

import { Location } from '../../app/(dashboard)/helper';

export interface RecentSearch {
  id: string;
  locations: Location[];
  displayName: string;
  timestamp: number;
  locationCount: number;
}

const STORAGE_KEY = 'datablox-recent-searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * Generate a display name for a group of locations
 * @param locations - Array of locations
 * @returns Comma-separated string of location names, truncated if too long
 */
export function generateDisplayName(locations: Location[]): string {
  const names = locations.map(loc => loc.name);
  const joined = names.join(', ');

  // Truncate if too long for display
  if (joined.length > 60) {
    return joined.substring(0, 57) + '...';
  }

  return joined;
}

/**
 * Save a successful search to recent searches
 * @param locations - The locations that were searched
 */
export function saveRecentSearch(locations: Location[]): void {
  if (locations.length === 0) return;

  // Check if localStorage is available
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available, cannot save recent search');
    return;
  }

  try {
    const existing = loadRecentSearches();

    // Create new search entry
    const newSearch: RecentSearch = {
      id: generateSearchId(locations),
      locations: [...locations], // Deep copy
      displayName: generateDisplayName(locations),
      timestamp: Date.now(),
      locationCount: locations.length
    };

    // Remove any existing identical search
    const filtered = existing.filter(search =>
      search.id !== newSearch.id
    );

    // Add new search at the beginning
    const updated = [newSearch, ...filtered];

    // Limit to max recent searches
    const limited = updated.slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.warn('Failed to save recent search:', error);
  }
}

/**
 * Load recent searches from localStorage
 * @returns Array of recent searches, sorted by timestamp (newest first)
 */
export function loadRecentSearches(): RecentSearch[] {
  // Check if localStorage is available
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const searches: RecentSearch[] = JSON.parse(stored);

    // Validate and filter out invalid searches
    const validSearches = searches.filter(search =>
      search.id &&
      Array.isArray(search.locations) &&
      search.locations.length > 0 &&
      search.timestamp &&
      search.displayName
    );

    // Sort by timestamp (newest first)
    return validSearches.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn('Failed to load recent searches:', error);
    return [];
  }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear recent searches:', error);
  }
}

/**
 * Remove a specific recent search by ID
 * @param searchId - The ID of the search to remove
 */
export function removeRecentSearch(searchId: string): void {
  try {
    const existing = loadRecentSearches();
    const filtered = existing.filter(search => search.id !== searchId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('Failed to remove recent search:', error);
  }
}

/**
 * Validate that stored locations still exist in current location data
 * @param storedLocations - Locations from storage
 * @param currentLocations - Current available locations
 * @returns Valid locations that still exist
 */
export function validateStoredLocations(
  storedLocations: Location[],
  currentLocations: Location[]
): Location[] {
  const currentIds = new Set(currentLocations.map(loc => loc.id));

  return storedLocations.filter(loc =>
    currentIds.has(loc.id) &&
    loc.name && loc.type
  );
}

/**
 * Generate a unique ID for a search based on its locations
 * @param locations - The locations in the search
 * @returns Unique string identifier
 */
function generateSearchId(locations: Location[]): string {
  // Sort locations by ID to ensure consistent ordering
  const sortedIds = locations
    .map(loc => loc.id)
    .sort((a, b) => a - b);

  return `search_${sortedIds.join('_')}`;
}

/**
 * Format timestamp for display
 * @param timestamp - Unix timestamp
 * @returns Human-readable relative time string
 */
export function formatSearchTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older searches, show date
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}