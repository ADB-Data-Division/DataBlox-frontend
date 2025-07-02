/**
 * Generic search utility functions
 */

/**
 * Filters an array of objects based on a search query
 * @param items - Array of objects to filter
 * @param query - Search query string
 * @param searchFields - Array of field names to search in
 * @param excludeIds - Array of IDs to exclude from results
 * @returns Filtered array
 */
export function filterItems<T extends Record<string, any>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  excludeIds: (string | number)[] = []
): T[] {
  // Filter out excluded items first
  const availableItems = items.filter(item => 
    !excludeIds.includes(item.id)
  );
  
  // If no query, return all available items
  if (!query.trim()) return availableItems;
  
  // Filter based on search query
  const lowerQuery = query.toLowerCase();
  return availableItems.filter(item => 
    searchFields.some(field => {
      const fieldValue = item[field];
      return typeof fieldValue === 'string' && 
             fieldValue.toLowerCase().includes(lowerQuery);
    })
  );
}

/**
 * Detects if the user is on a Mac platform
 * @returns boolean indicating if on Mac
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Gets the appropriate command key symbol for the platform
 * @returns '⌘' for Mac, 'Ctrl' for others
 */
export function getCommandKey(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
} 