'use client';

import { useState, useEffect, useMemo } from 'react';
import { filterItems } from '../../../src/utils/search';
import { Location, getAllLocations } from '../helper';
import { LOCATION_CONSTRAINTS } from '../constraints';
import { trackMigrationEvent, trackUserInteraction } from '../../../src/utils/analytics';

interface SearchPagination {
  currentPage: number;
  pageSize: number;
  totalResults: number;
}

export function useLocationSearch(
  selectedLocations: Location[],
  searchQuery: string
) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [searchPagination, setSearchPagination] = useState<SearchPagination>({
    currentPage: 1,
    pageSize: 10,
    totalResults: 0
  });

  // Load all locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setIsLoading(true);
        const locations = await getAllLocations();
        setAllLocations(locations);
      } catch (error) {
        console.error('Failed to load locations:', error);
        setError(error instanceof Error ? error.message : 'Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };

    loadLocations();
  }, []);

  const selectedIds = useMemo(() => 
    selectedLocations.map(loc => loc.id), 
    [selectedLocations]
  );

  // Determine allowed location types based on current selections
  const allowedType = useMemo(() => {
    const selectedLocationTypes = Array.from(new Set(selectedLocations.map(loc => loc.type)));
    return selectedLocationTypes.length > 0 && LOCATION_CONSTRAINTS.ENFORCE_SAME_TYPE_SELECTION 
      ? selectedLocationTypes[0]
      : null;
  }, [selectedLocations]);

  // Separate locations by type
  const { provinces, districts, subDistricts } = useMemo(() => ({
    provinces: allLocations.filter(loc => loc.type === 'province'),
    districts: allLocations.filter(loc => loc.type === 'district'),
    subDistricts: allLocations.filter(loc => loc.type === 'subDistrict')
  }), [allLocations]);

  // Apply filtering logic
  const { 
    allFilteredProvinces, 
    allFilteredDistricts, 
    allFilteredSubDistricts 
  } = useMemo(() => {
    const majorProvinceNames = ['Bangkok', 'Chiang Mai', 'Nakhon Ratchasima'];

    if (!searchQuery.trim()) {
      // No search query: show defaults based on allowed type
      return {
        allFilteredProvinces: (!allowedType || allowedType === 'province') 
          ? provinces.filter(province => 
              majorProvinceNames.includes(province.name) && !selectedIds.includes(province.id)
            )
          : [],
        allFilteredDistricts: allowedType === 'district' 
          ? districts.slice(0, 5).filter(district => !selectedIds.includes(district.id))
          : [],
        allFilteredSubDistricts: allowedType === 'subDistrict' 
          ? subDistricts.slice(0, 5).filter(subDistrict => !selectedIds.includes(subDistrict.id))
          : []
      };
    } else {
      // Search query exists: filter based on allowed type
      return {
        allFilteredProvinces: (!allowedType || allowedType === 'province') 
          ? filterItems(provinces, searchQuery, ['name', 'description'], selectedIds)
          : [],
        allFilteredDistricts: (!allowedType || allowedType === 'district') 
          ? filterItems(districts, searchQuery, ['name', 'description'], selectedIds)
          : [],
        allFilteredSubDistricts: (!allowedType || allowedType === 'subDistrict') 
          ? filterItems(subDistricts, searchQuery, ['name', 'description'], selectedIds)
          : []
      };
    }
  }, [searchQuery, allowedType, provinces, districts, subDistricts, selectedIds]);

  const totalFilteredResults = useMemo(() => 
    allFilteredProvinces.length + allFilteredDistricts.length + allFilteredSubDistricts.length,
    [allFilteredProvinces, allFilteredDistricts, allFilteredSubDistricts]
  );

  // Update total results when they change
  useEffect(() => {
    if (totalFilteredResults !== searchPagination.totalResults) {
      setSearchPagination(prev => ({ 
        ...prev, 
        totalResults: totalFilteredResults,
        currentPage: 1 // Reset to first page when results change
      }));
      
      // Track search with results count when search query is not empty
      if (searchQuery.trim() && totalFilteredResults !== searchPagination.totalResults) {
        trackMigrationEvent.searchLocation(searchQuery, totalFilteredResults);
      } else if (!searchQuery.trim() && totalFilteredResults > 0) {
        trackUserInteraction('view_default_provinces', 'major_provinces_displayed');
      }
    }
  }, [totalFilteredResults, searchPagination.totalResults, searchQuery]);

  // Pagination calculations
  const { currentPage, pageSize } = searchPagination;
  const totalPages = Math.ceil(totalFilteredResults / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Combine and paginate results
  const paginatedResults = useMemo(() => {
    const allFilteredResults = [
      ...allFilteredProvinces.map(item => ({ ...item, category: 'province' as const })),
      ...allFilteredDistricts.map(item => ({ ...item, category: 'district' as const })),
      ...allFilteredSubDistricts.map(item => ({ ...item, category: 'subDistrict' as const }))
    ];
    
    return allFilteredResults.slice(startIndex, endIndex);
  }, [allFilteredProvinces, allFilteredDistricts, allFilteredSubDistricts, startIndex, endIndex]);

  // Separate paginated results by type
  const paginatedByType = useMemo(() => ({
    filteredProvinces: paginatedResults.filter(item => item.category === 'province'),
    filteredDistricts: paginatedResults.filter(item => item.category === 'district'),
    filteredSubDistricts: paginatedResults.filter(item => item.category === 'subDistrict')
  }), [paginatedResults]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setSearchPagination(prev => ({ ...prev, currentPage: page }));
    trackMigrationEvent.changePage(page, totalFilteredResults);
  };

  const handlePageSizeChange = (event: any) => {
    const newPageSize = parseInt(event.target.value);
    setSearchPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when page size changes
    }));
    trackUserInteraction('change_page_size', `${newPageSize}_per_page`);
  };

  const getFirstAvailableResult = (): Location | null => {
    return paginatedResults.length > 0 ? paginatedResults[0] : null;
  };

  return {
    ...paginatedByType,
    totalFilteredResults,
    allowedType,
    searchPagination,
    startIndex,
    endIndex,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    getFirstAvailableResult,
    isLoading,
    error
  };
}