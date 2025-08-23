'use client';

import React, { useState, useCallback, useMemo, useRef, useReducer, useEffect } from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';

// Components
import { Header } from '../components/Header';
import { LocationChips } from '../components/LocationChips';
import { SearchBar } from '../components/SearchBar';
import { LoadingState } from '../components/LoadingState';
import { NoResultsState } from '../components/NoResultsState';
import { LocationList } from '../components/LocationList';
import { SearchPagination } from '../components/SearchPagination';
import { SearchResultsSummary } from '../components/SearchResultsSummary';
import ChordDiagramContainer from '@/components/chord-diagram';
import ShortcutsModal from '@/components/shortcuts-modal/shortcuts-modal';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts, useMigrationData } from '../hooks';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';
import { mapViewReducer, initialState } from '../reducer';

// Custom constraints for sankey page
const SANKEY_CONSTRAINTS = {
  MAX_TOTAL_LOCATIONS: 10 // Allow more locations for sankey visualization
};

export default function SankeyPageContent() {
  const [state, dispatch] = useReducer(mapViewReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize selectedLocations to prevent unnecessary callback recreations
  const memoizedSelectedLocations = useMemo(() => state.selectedLocations, [state.selectedLocations]);

  // Location search hook
  const searchResults = useLocationSearch(memoizedSelectedLocations, state.searchQuery);

  // Migration data hook
  const { migrationData, loadMigrationData, resetMigrationData } = useMigrationData();

  // Keyboard shortcuts configuration
  const keyboardShortcutsConfig = useMemo(() => ({
    inputRef,
    onShowShortcutsModal: () => dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: true })
  }), [inputRef]);

  useKeyboardShortcuts(keyboardShortcutsConfig);

  // Load migration data when locations change
  useEffect(() => {
    if (memoizedSelectedLocations.length > 0) {
      loadMigrationData(memoizedSelectedLocations, state.selectedPeriod);
    } else {
      resetMigrationData();
    }
  }, [memoizedSelectedLocations, loadMigrationData, resetMigrationData, state.selectedPeriod]);

  // Computed values (need to be before handlers that use them)
  const isLoading = searchResults.isLoading || migrationData.isLoading;
  const hasSearchResults = searchResults.filteredProvinces.length > 0 || 
                          searchResults.filteredDistricts.length > 0 || 
                          searchResults.filteredSubDistricts.length > 0;
  const hasSelectedLocations = memoizedSelectedLocations.length > 0;
  const isEmpty = !isLoading && !hasSelectedLocations;

  // Handlers  
  const handleLocationSelect = useCallback((location: Location) => {
    if (canAddMoreLocations(memoizedSelectedLocations.length, SANKEY_CONSTRAINTS.MAX_TOTAL_LOCATIONS)) {
      dispatch({ type: 'ADD_LOCATION', payload: location });
    }
  }, [memoizedSelectedLocations.length]);

  const handleLocationRemove = useCallback((locationId: number) => {
    dispatch({ type: 'REMOVE_LOCATION', payload: locationId });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
  }, []);

  const handleSearchQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: event.target.value });
  }, []);

  const handleExecuteQuery = useCallback(() => {
    // This will trigger the useEffect that loads migration data
    if (memoizedSelectedLocations.length > 0) {
      loadMigrationData(memoizedSelectedLocations, state.selectedPeriod);
    }
  }, [memoizedSelectedLocations, loadMigrationData, state.selectedPeriod]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key to select first result
    if (event.key === 'Enter' && hasSearchResults) {
      const firstResult = searchResults.getFirstAvailableResult();
      if (firstResult && canAddMoreLocations(memoizedSelectedLocations.length, SANKEY_CONSTRAINTS.MAX_TOTAL_LOCATIONS)) {
        handleLocationSelect(firstResult);
        dispatch({ type: 'CLEAR_SEARCH' });
      }
    }
    
    // Handle Backspace to remove last location
    if (event.key === 'Backspace' && state.searchQuery === '' && memoizedSelectedLocations.length > 0) {
      if (state.highlightedForDeletion === null) {
        // First backspace: highlight last location
        const lastLocationId = memoizedSelectedLocations[memoizedSelectedLocations.length - 1].id;
        dispatch({ type: 'SET_HIGHLIGHTED_FOR_DELETION', payload: lastLocationId });
      } else {
        // Second backspace: remove highlighted location
        dispatch({ type: 'REMOVE_HIGHLIGHTED_LOCATION' });
      }
    }
  }, [hasSearchResults, searchResults, memoizedSelectedLocations, state.searchQuery, state.highlightedForDeletion, handleLocationSelect]);

  return (
    <Box>
      {/* Header */}
      <Container sx={{ px: 2, py: 2 }}>
        <Header />
        
        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Select provinces and districts to visualize migration flows between them using chord diagrams. 
          This Sankey-style visualization shows the relationships and flow volumes between different locations.
        </Alert>

        {/* Search Section */}
        <Box sx={{ mb: 3 }}>
          <SearchBar 
            inputRef={inputRef}
            searchQuery={state.searchQuery}
            selectedLocations={memoizedSelectedLocations}
            highlightedForDeletion={state.highlightedForDeletion}
            isLoading={isLoading}
            allowedType={searchResults.allowedType}
            onSearchChange={handleSearchQueryChange}
            onKeyDown={handleKeyDown}
            onExecuteQuery={handleExecuteQuery}
          />
          
          {/* Selected Locations */}
          {hasSelectedLocations && (
            <LocationChips
              selectedLocations={memoizedSelectedLocations}
              highlightedForDeletion={state.highlightedForDeletion}
              onLocationRemove={handleLocationRemove}
              maxLocations={SANKEY_CONSTRAINTS.MAX_TOTAL_LOCATIONS}
            />
          )}
          
          {/* Search Results */}
          {state.searchQuery && (
            <Box sx={{ mt: 2 }}>
              {searchResults.isLoading ? (
                <LoadingState selectedLocations={memoizedSelectedLocations} />
              ) : hasSearchResults ? (
                <>
                  <SearchResultsSummary 
                    totalResults={searchResults.totalFilteredResults}
                    startIndex={searchResults.startIndex}
                    endIndex={searchResults.endIndex}
                    searchQuery={state.searchQuery}
                    allowedType={searchResults.allowedType}
                  />
                  <LocationList
                    filteredProvinces={searchResults.filteredProvinces}
                    filteredDistricts={searchResults.filteredDistricts}
                    filteredSubDistricts={searchResults.filteredSubDistricts}
                    selectedLocationsCount={memoizedSelectedLocations.length}
                    onLocationSelect={handleLocationSelect}
                  />
                  <SearchPagination
                    totalResults={searchResults.totalFilteredResults}
                    currentPage={searchResults.searchPagination.currentPage}
                    pageSize={searchResults.searchPagination.pageSize}
                    onPageChange={searchResults.handlePageChange}
                    onPageSizeChange={searchResults.handlePageSizeChange}
                  />
                </>
              ) : (
                <NoResultsState searchQuery={state.searchQuery} />
              )}
            </Box>
          )}
        </Box>
      </Container>
      
      {/* Visualization Container */}
      <Container sx={{ px: 2, py: 2, height: 'fit-content' }}>
        {migrationData.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading migration data: {migrationData.error}
          </Alert>
        ) : isEmpty ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400,
              textAlign: 'center'
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Locations Selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search and select provinces or districts above to see their migration flow relationships
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Migration Flow Sankey Diagram
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing migration relationships between {memoizedSelectedLocations.length} selected location(s)
            </Typography>
            {/* For now, display a simple message about the chord diagram */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Chord diagram visualization will be rendered here based on the migration data from the selected locations.
            </Alert>
          </Box>
        )}
      </Container>

      {/* Shortcuts Modal */}
      <ShortcutsModal
        open={state.showShortcutsModal}
        onClose={() => dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: false })}
      />
    </Box>
  );
}
