'use client';

import React, { useCallback, useMemo, useRef, useReducer, useEffect } from 'react';
import { Box, Container, Paper, useTheme } from '@mui/material';

// Components
import { Header } from '../components/Header';
import { LocationChips } from '../components/LocationChips';
import { SearchBar } from '../components/SearchBar';
import { LoadingState } from '../components/LoadingState';
import { NoResultsState } from '../components/NoResultsState';
import { LocationList } from '../components/LocationList';
import { SearchPagination } from '../components/SearchPagination';
import { SearchResultsSummary } from '../components/SearchResultsSummary';
import ShortcutsModal from '@/components/shortcuts-modal/shortcuts-modal';
import CitationFooter from '@/components/citation-footer/citation-footer';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts, useSankeyMigrationData } from '../hooks';
import { useUrlParams } from '../hooks/useUrlParams';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';
import { mapViewReducer, initialState } from '../reducer';

// Results component
import SankeyResults from './components/SankeyResults';

// Custom constraints for sankey page
const SANKEY_CONSTRAINTS = {
  MAX_TOTAL_LOCATIONS: 5 // Limit to 5 locations for sankey visualization
};

export default function SankeyPageContent() {
  const theme = useTheme();
  const [state, dispatch] = useReducer(mapViewReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const isResettingRef = useRef(false);

  // Memoize selectedLocations to prevent unnecessary callback recreations
  const memoizedSelectedLocations = useMemo(() => state.selectedLocations, [state.selectedLocations]);

  // Location search hook
  const searchResults = useLocationSearch(memoizedSelectedLocations, state.searchQuery);

  // Sankey-specific migration data hook (uses multi-year query workaround)
  const { migrationData, loadMigrationData, resetMigrationData } = useSankeyMigrationData();

  // URL params hook for shareable URLs
  const { updateUrlWithLocations, clearUrlParams, getLocationsParam } = useUrlParams();


  // Keyboard shortcuts configuration
  const keyboardShortcutsConfig = useMemo(() => ({
    inputRef,
    onShowShortcutsModal: () => dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: true })
  }), [inputRef]);

  useKeyboardShortcuts(keyboardShortcutsConfig);

  // Computed values
  const isLoading = searchResults.isLoading || migrationData.isLoading;
  const hasSearchResults = searchResults.filteredProvinces.length > 0 || 
                          searchResults.filteredDistricts.length > 0 || 
                          searchResults.filteredSubDistricts.length > 0;

  // Paper styles
  const paperStyles = useMemo(() => ({
    p: 1,
    backgroundColor: theme.palette.background.paper,
    minHeight: '70vh'
  }), [theme.palette.background.paper]);

  const handleReset = useCallback(() => {
    migrationData.apiResponse && resetMigrationData();
    dispatch({ type: 'RESET_QUERY_STATE' });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
    clearUrlParams(); // Clear URL params on reset
  }, [resetMigrationData, migrationData.apiResponse, clearUrlParams]);

  // Load locations from URL on mount
  useEffect(() => {
    const loadFromUrl = async () => {
      if (isResettingRef.current || searchResults.isLoading || searchResults.allLocations.length === 0) return;
      
      const locationsParam = getLocationsParam();
      
      if (locationsParam) {
        try {
          const decodedParam = decodeURIComponent(locationsParam);
          const uniqueIds = decodedParam.split(',').filter(id => id.trim() !== '');
          
          console.log('Sankey: Loading locations from URL...', uniqueIds);
          const locations = uniqueIds
            .map(uniqueId => searchResults.allLocations.find(loc => loc.uniqueId === uniqueId))
            .filter((location): location is Location => location !== undefined);
          
          const currentUniqueIds = state.selectedLocations.map(loc => loc.uniqueId).sort();
          const urlUniqueIds = uniqueIds.sort();
          const locationsMatch = currentUniqueIds.length === urlUniqueIds.length && 
                                currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);
          
          if (locations.length > 0 && !locationsMatch) {
            isResettingRef.current = true;
            
            dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
            locations.forEach(location => {
              dispatch({ type: 'ADD_LOCATION', payload: location });
            });
            
            // Auto-execute query with loaded locations
            dispatch({ type: 'START_QUERY_EXECUTION' });
            
            try {
              await loadMigrationData(
                locations,
                '2019-01-01',
                '2024-12-31'
              );
              updateUrlWithLocations(locations);
              dispatch({ type: 'SET_QUERY_SUCCESS' });
            } catch (error) {
              console.error('Sankey query failed after URL load:', error);
              dispatch({ type: 'SET_QUERY_ERROR' });
            }
            
            setTimeout(() => {
              isResettingRef.current = false;
            }, 100);
          }
        } catch (error) {
          console.error('Failed to parse locations from URL:', error);
        }
      }
    };
    
    loadFromUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLocationsParam, searchResults.isLoading, searchResults.allLocations]);

  // Handlers  
  const handleLocationSelect = useCallback((location: Location) => {
    if (canAddMoreLocations(memoizedSelectedLocations.length, SANKEY_CONSTRAINTS.MAX_TOTAL_LOCATIONS)) {
      dispatch({ type: 'ADD_LOCATION', payload: location });
    }
  }, [memoizedSelectedLocations]);

  const handleLocationRemove = useCallback((locationId: number) => {
    dispatch({ type: 'REMOVE_LOCATION', payload: locationId });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
  }, []);

  const handleSearchQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: event.target.value });
  }, []);

  const handleExecuteQuery = useCallback(async () => {
    if (memoizedSelectedLocations.length === 0) return;
    
    dispatch({ type: 'START_QUERY_EXECUTION' });
    
    try {
      // Load all historical data from 2019 to end of 2024 for Sankey visualization
      // The useSankeyMigrationData hook will automatically split this into yearly queries
      await loadMigrationData(
        memoizedSelectedLocations,
        '2019-01-01', // Start from 2019
        '2024-12-31'  // End at December 2024
      );
      updateUrlWithLocations(memoizedSelectedLocations); // Update URL for sharing
      dispatch({ type: 'SET_QUERY_SUCCESS' });
    } catch (error) {
      console.error('Query execution error:', error);
      dispatch({ type: 'SET_QUERY_ERROR' });
    }
  }, [memoizedSelectedLocations, loadMigrationData, updateUrlWithLocations]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift+Enter executes the query
        handleExecuteQuery();
      } else if (hasSearchResults) {
        // Enter alone selects first result
        event.preventDefault();
        const firstResult = searchResults.getFirstAvailableResult();
        if (firstResult && canAddMoreLocations(memoizedSelectedLocations.length, SANKEY_CONSTRAINTS.MAX_TOTAL_LOCATIONS)) {
          handleLocationSelect(firstResult);
          dispatch({ type: 'CLEAR_SEARCH' });
        }
      }
    }
    
    // Handle Backspace to remove last location
    if (event.key === 'Backspace' && state.searchQuery === '' && memoizedSelectedLocations.length > 0) {
      event.preventDefault();
      
      if (state.highlightedForDeletion === null) {
        // First backspace: highlight last location
        const lastLocationId = memoizedSelectedLocations[memoizedSelectedLocations.length - 1].id;
        dispatch({ type: 'SET_HIGHLIGHTED_FOR_DELETION', payload: lastLocationId });
      } else {
        // Second backspace: remove highlighted location
        dispatch({ type: 'REMOVE_HIGHLIGHTED_LOCATION' });
      }
    }
  }, [handleExecuteQuery, hasSearchResults, searchResults, memoizedSelectedLocations, state.searchQuery, state.highlightedForDeletion, handleLocationSelect]);

  return (
    <Box sx={{ width: '100%' }}>
      <Header />

      <Paper elevation={0} sx={paperStyles}>
        {/* Search Interface - Hidden in success state */}
        {state.queryExecutionState !== 'success' && (
          <>
            <LocationChips
              selectedLocations={state.selectedLocations}
              highlightedForDeletion={state.highlightedForDeletion}
              onLocationRemove={handleLocationRemove}
            />

            <SearchBar
              inputRef={inputRef}
              searchQuery={state.searchQuery}
              selectedLocations={state.selectedLocations}
              highlightedForDeletion={state.highlightedForDeletion}
              isLoading={isLoading}
              allowedType={searchResults.allowedType}
              onSearchChange={handleSearchQueryChange}
              onKeyDown={handleKeyDown}
              onExecuteQuery={handleExecuteQuery}
            />

          </>
        )}

        {/* Loading State */}
        {(state.queryExecutionState === 'loading' || migrationData.isLoading) && (
          <LoadingState selectedLocations={state.selectedLocations} />
        )}

        {/* Success State with Results */}
        {state.queryExecutionState === 'success' && !migrationData.isLoading && (
          <>

            <SankeyResults
              selectedLocations={state.selectedLocations}
              startDate={migrationData.apiResponse?.metadata.start_date || ''}
              endDate={migrationData.apiResponse?.metadata.end_date || ''}
              onNewSearch={handleReset}
              apiResponse={migrationData.apiResponse}
              loading={migrationData.isLoading}
              error={migrationData.error}
            />
            <CitationFooter />
          </>
        )}

        {/* Search Results - Only show when not in loading or success state */}
        {state.showSearchResults && state.queryExecutionState === 'idle' && (
          <>
            <SearchResultsSummary
              totalResults={searchResults.totalFilteredResults}
              startIndex={searchResults.startIndex}
              endIndex={searchResults.endIndex}
              searchQuery={state.searchQuery}
              allowedType={searchResults.allowedType}
              selectedProvinceName={searchResults.selectedProvinceName}
            />

            <LocationList
              filteredProvinces={searchResults.filteredProvinces}
              filteredDistricts={searchResults.filteredDistricts}
              filteredSubDistricts={searchResults.filteredSubDistricts}
              selectedLocationsCount={state.selectedLocations.length}
              onLocationSelect={handleLocationSelect}
            />

            <NoResultsState 
              searchQuery={state.searchQuery}
              totalResults={searchResults.totalFilteredResults}
            />

            <SearchPagination
              totalResults={searchResults.totalFilteredResults}
              currentPage={searchResults.searchPagination.currentPage}
              pageSize={searchResults.searchPagination.pageSize}
              onPageChange={searchResults.handlePageChange}
              onPageSizeChange={searchResults.handlePageSizeChange}
            />
          </>
        )}
      </Paper>

      <ShortcutsModal
        open={state.showShortcutsModal}
        onClose={() => dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: false })}
      />
    </Box>
  );
}
