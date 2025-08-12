'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Location } from '../helper';

export function useUrlParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateUrlWithLocations = useCallback((locations: Location[]) => {
    const params = new URLSearchParams();
    if (locations.length > 0) {
      const uniqueIds = locations.map(location => location.uniqueId).join(',');
      params.set('locations', uniqueIds);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router]);

  const clearUrlParams = useCallback(() => {
    router.push(window.location.pathname, { scroll: false });
  }, [router]);

  const getLocationsParam = useCallback(() => {
    return searchParams.get('locations');
  }, [searchParams]);

  return {
    updateUrlWithLocations,
    clearUrlParams,
    getLocationsParam
  };
}