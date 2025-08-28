'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Location, getAllLocations } from '../(dashboard)/helper';

interface LocationContextType {
  allLocations: Location[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

// Create a singleton promise to ensure only one API call across all instances
let locationsPromise: Promise<Location[]> | null = null;
let locationsCache: Location[] | null = null;
let lastLoadTimestamp: number = 0;

const CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds

const getLocationsOnce = (): Promise<Location[]> => {
  const now = Date.now();
  
  // Check if we have valid cached data within the cache duration
  if (locationsCache && locationsCache.length > 0 && (now - lastLoadTimestamp) < CACHE_DURATION) {
    return Promise.resolve(locationsCache);
  }
  
  // Clear expired cache
  if (locationsCache && (now - lastLoadTimestamp) >= CACHE_DURATION) {
    locationsCache = null;
    locationsPromise = null;
  }
  
  if (!locationsPromise) {
    console.log('LocationProvider: Loading locations...');
    locationsPromise = getAllLocations().then(locations => {
      locationsCache = locations;
      lastLoadTimestamp = Date.now();
      return locations;
    });
  }
  
  return locationsPromise;
};

export function LocationProvider({ children }: LocationProviderProps) {
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const locations = await getLocationsOnce();
      setAllLocations(locations);
    } catch (error) {
      console.error('LocationProvider: Failed to load locations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    // Clear cache and reload
    locationsCache = null;
    locationsPromise = null;
    await loadLocations();
  }, [loadLocations]);

  // Load locations on first render
  useMemo(() => {
    if (allLocations.length === 0 && !isLoading && !error) {
      loadLocations();
    }
  }, [allLocations.length, isLoading, error, loadLocations]);

  const contextValue = useMemo(() => ({
    allLocations,
    isLoading,
    error,
    refetch
  }), [allLocations, isLoading, error, refetch]);

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}