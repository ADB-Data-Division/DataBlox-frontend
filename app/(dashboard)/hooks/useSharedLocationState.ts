'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Location } from '../helper';

/**
 * Shared hook for managing location state across migration visualization pages.
 * This hook handles URL synchronization and location persistence when switching between tabs.
 */
export function useSharedLocationState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  // Get the current locations parameter from URL
  const getLocationsParam = useCallback(() => {
    return searchParams.get('locations');
  }, [searchParams]);

  // Update URL with locations for any migration page
  const updateUrlWithLocations = useCallback((locations: Location[], targetPath?: string) => {
    const params = new URLSearchParams();
    if (locations.length > 0) {
      const uniqueIds = locations.map(location => location.uniqueId).join(',');
      params.set('locations', uniqueIds);
    }
    
    const basePath = targetPath || pathname;
    const url = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    
    if (targetPath && targetPath !== pathname) {
      // Navigate to different page with locations
      router.push(url);
    } else {
      // Update current page URL
      router.push(url, { scroll: false });
    }
  }, [router, pathname]);

  // Navigate to a different migration visualization page with current locations
  const navigateWithLocations = useCallback((targetPath: string, locations: Location[]) => {
    updateUrlWithLocations(locations, targetPath);
  }, [updateUrlWithLocations]);

  // Check if we're on a migration-related page that supports location sharing
  const isMigrationPage = useCallback(() => {
    const migrationPaths = [
      '/migration-flow',
      '/migration-analysis', 
      '/sankey'
    ];
    return migrationPaths.some(path => pathname.includes(path));
  }, [pathname]);

  // Parse locations from URL parameter
  const parseLocationsFromUrl = useCallback((locationsParam: string, allLocations: Location[]): Location[] => {
    try {
      const decodedParam = decodeURIComponent(locationsParam);
      const uniqueIds = decodedParam.split(',').filter(id => id.trim() !== '');
      
      return uniqueIds
        .map(uniqueId => allLocations.find(loc => loc.uniqueId === uniqueId))
        .filter((location): location is Location => location !== undefined);
    } catch (error) {
      console.error('Failed to parse locations from URL:', error);
      return [];
    }
  }, []);

  // Auto-load locations from URL when available locations are loaded
  const initializeFromUrl = useCallback((
    allLocations: Location[], 
    currentLocations: Location[],
    onLocationsLoaded: (locations: Location[]) => void
  ) => {
    if (isInitialized || allLocations.length === 0) return;

    const locationsParam = getLocationsParam();
    if (!locationsParam) {
      setIsInitialized(true);
      return;
    }

    const urlLocations = parseLocationsFromUrl(locationsParam, allLocations);
    
    // Only update if the locations are different from current
    const currentUniqueIds = currentLocations.map(loc => loc.uniqueId).sort();
    const urlUniqueIds = urlLocations.map(loc => loc.uniqueId).sort();
    const locationsMatch = currentUniqueIds.length === urlUniqueIds.length && 
                          currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);

    if (urlLocations.length > 0 && !locationsMatch) {
      console.log('🔗 Loading locations from URL:', urlLocations.map(l => l.name));
      onLocationsLoaded(urlLocations);
    }
    
    setIsInitialized(true);
  }, [isInitialized, getLocationsParam, parseLocationsFromUrl]);

  // Reset initialization state when pathname changes
  useEffect(() => {
    setIsInitialized(false);
  }, [pathname]);

  // Clear URL parameters
  const clearUrlParams = useCallback(() => {
    router.push(pathname, { scroll: false });
    setIsInitialized(false);
  }, [router, pathname]);

  return {
    getLocationsParam,
    updateUrlWithLocations,
    navigateWithLocations,
    parseLocationsFromUrl,
    initializeFromUrl,
    clearUrlParams,
    isMigrationPage: isMigrationPage(),
    isInitialized
  };
}
