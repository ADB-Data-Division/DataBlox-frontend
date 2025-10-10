'use client';

import React, { useRef, KeyboardEvent, useEffect, useReducer, useCallback, useState, useMemo } from 'react';
import { Box, Paper, useTheme } from '@mui/material';

// Components
import MigrationResultsTable from '@/components/migration-results-table';
import ShortcutsModal from '../../components/shortcuts-modal/shortcuts-modal';
import { Header } from './components/Header';
import { LocationChips } from './components/LocationChips';
import { SearchBar } from './components/SearchBar';
import { LoadingState } from './components/LoadingState';
import { NoResultsState } from './components/NoResultsState';
import { LocationList } from './components/LocationList';
import { SearchPagination } from './components/SearchPagination';
import { SearchResultsSummary } from './components/SearchResultsSummary';
import { ApiDisconnectedPage } from './components/ApiDisconnectedPage';
import CitationFooter from '@/components/citation-footer/citation-footer';

// Hooks
import { 
  useMigrationData, 
  useLocationSearch, 
  useUrlParams, 
  useKeyboardShortcuts,
} from './hooks';

// Contexts
import { useConnectivity } from '@/app/contexts/ConnectivityContext';

// Utils and helpers
import { trackMigrationEvent, trackUserInteraction } from '../../src/utils/analytics';
import { Location, getLocationsByUniqueIds, getAllLocations } from './helper';
import { mapViewReducer, initialState } from './reducer';
import { LOCATION_CONSTRAINTS, canAddMoreLocations } from './constraints';


// Style objects - defined outside component to prevent recreation
const containerStyles = { width: '100%' };

export default function PageContent() {
  
  const theme = useTheme();
  const [state, dispatch] = useReducer(mapViewReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isConnected } = useConnectivity();
  
  
  // Track when we're resetting to prevent URL effect interference
  const isResettingRef = useRef<boolean>(false);

  // Memoize selectedLocations to prevent unnecessary callback recreations
  const memoizedSelectedLocations = useMemo(() => state.selectedLocations, [state.selectedLocations]);

  // Custom hooks
    const { migrationData, loadMigrationData, resetMigrationData } = useMigrationData();
  const { updateUrlWithLocations, clearUrlParams, getLocationsParam } = useUrlParams();
  
  const searchResults = useLocationSearch(memoizedSelectedLocations, state.searchQuery);

  // Memoize keyboard shortcuts configuration
  const keyboardShortcutsConfig = useMemo(() => ({
    inputRef,
    onShowShortcutsModal: () => {
      dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: true });
      trackUserInteraction('keyboard_shortcut', 'show_help_modal');
    }
  }), [inputRef]);

  useKeyboardShortcuts(keyboardShortcutsConfig);

  // Store date range for API calls
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  // Store threshold for migration flow filtering
  const [migrationThreshold, setMigrationThreshold] = useState<number>(0);

  // Store individual flow visibility settings
  const [flowVisibility, setFlowVisibility] = useState<Record<string, { moveIn: boolean; moveOut: boolean }>>({});

  // Store edge colors (edgeKey -> color)
  const [edgeColors, setEdgeColors] = useState<Record<string, string>>({});

  // Memoize Paper styles to prevent recreation
  const paperStyles = useMemo(() => ({
    p: 1,
    backgroundColor: theme.palette.background.paper,
    minHeight: '70vh'
  }), [theme.palette.background.paper]);

  // Period change handler - no additional debouncing since MigrationAnalysisPeriod already handles it
  const handlePeriodChange = useCallback((period: string, startDate?: string, endDate?: string) => {
    console.log('📊 handlePeriodChange called:', { period, startDate, endDate });
    dispatch({ type: 'SET_SELECTED_PERIOD', payload: period });
    setDateRange({ startDate, endDate });
    
    // Trigger new API request with the updated date range if locations are selected
    if (memoizedSelectedLocations.length > 0) {
      // loadMigrationData immediately sets loading state and clears existing data
      loadMigrationData(memoizedSelectedLocations, period, startDate, endDate);
    }
  }, [loadMigrationData, memoizedSelectedLocations]);

  // Note: Cleanup effect removed - isResettingRef is managed in handleReset

  const handleReset = () => {
    isResettingRef.current = true;
    clearUrlParams();
    resetMigrationData();
    
    dispatch({ type: 'RESET_QUERY_STATE' });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
    dispatch({ type: 'SET_SELECTED_PERIOD', payload: '2020-all' });
    
    setTimeout(() => {
      isResettingRef.current = false;
    }, 100);
  };

  const handleRetryMigrationData = useCallback(() => {
    if (memoizedSelectedLocations.length > 0) {
      loadMigrationData(memoizedSelectedLocations, state.selectedPeriod, dateRange.startDate, dateRange.endDate);
    }
  }, [memoizedSelectedLocations, state.selectedPeriod, dateRange.startDate, dateRange.endDate, loadMigrationData]);

  // Load locations from URL parameters on mount - using useEffect for legitimate side effect
  useEffect(() => {
    const loadFromUrl = async () => {
      if (isResettingRef.current || searchResults.isLoading || searchResults.allLocations.length === 0) return;
      
      const locationsParam = getLocationsParam();
      
      if (locationsParam) {
        try {
          // URL decode the parameter first, then split on commas
          const decodedParam = decodeURIComponent(locationsParam);
          const uniqueIds = decodedParam.split(',').filter(id => id.trim() !== '');
          
          // Use locations from the search hook instead of making another API call
          console.log('Loading locations from URL...');
          const locations = uniqueIds
            .map(uniqueId => searchResults.allLocations.find(loc => loc.uniqueId === uniqueId))
            .filter((location): location is Location => location !== undefined);
          
          const currentUniqueIds = state.selectedLocations.map(loc => loc.uniqueId).sort();
          const urlUniqueIds = uniqueIds.sort();
          const locationsMatch = currentUniqueIds.length === urlUniqueIds.length && 
                                currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);
          
          if (locations.length > 0 && !locationsMatch) {
            // Prevent this effect from running again while we're updating
            isResettingRef.current = true;
            
            dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
            locations.forEach(location => {
              dispatch({ type: 'ADD_LOCATION', payload: location });
            });
            
            // After loading locations from URL, automatically execute migration query
            dispatch({ type: 'START_QUERY_EXECUTION' });
            
            try {
              await loadMigrationData(locations, state.selectedPeriod, dateRange.startDate, dateRange.endDate);
              updateUrlWithLocations(locations); // Update URL to ensure consistency
              dispatch({ type: 'SET_QUERY_SUCCESS' });
            } catch (error) {
              console.error('Migration query failed after URL load:', error);
              dispatch({ type: 'SET_QUERY_ERROR' });
            }
            
            // Re-enable the effect
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
  }, [getLocationsParam, searchResults.isLoading, searchResults.allLocations]); // Wait for locations to load before processing URL

  const handleCloseShortcutsModal = useCallback(() => {
    dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: false });
    trackUserInteraction('modal_close', 'shortcuts_modal');
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: event.target.value });
  }, []);

  const handleExecuteQuery = useCallback(async () => {
    if (memoizedSelectedLocations.length === 0) return;
    
    dispatch({ type: 'START_QUERY_EXECUTION' });
    
    const locationTypes = memoizedSelectedLocations.map(loc => loc.type);
    const queryType = locationTypes.length === 1 ? locationTypes[0] : 'mixed';
    trackMigrationEvent.executeQuery(memoizedSelectedLocations.length, queryType);
    
    try {
      await loadMigrationData(memoizedSelectedLocations, state.selectedPeriod, dateRange.startDate, dateRange.endDate);
      updateUrlWithLocations(memoizedSelectedLocations);
      dispatch({ type: 'SET_QUERY_SUCCESS' });
    } catch (error) {
      console.error('Query execution error:', error);
      dispatch({ type: 'SET_QUERY_ERROR' });
      trackMigrationEvent.trackError('query_execution', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [memoizedSelectedLocations, state.selectedPeriod, dateRange.startDate, dateRange.endDate, loadMigrationData, updateUrlWithLocations]);

  const handleLocationSelect = useCallback((location: Location) => {
    if (!canAddMoreLocations(memoizedSelectedLocations.length)) {
      console.warn(`Cannot add more locations. Maximum of ${LOCATION_CONSTRAINTS.MAX_TOTAL_LOCATIONS} locations allowed.`);
      return;
    }
    
    dispatch({ type: 'ADD_LOCATION', payload: location });
    trackMigrationEvent.selectLocation(location.type, location.name);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [memoizedSelectedLocations.length]);

  const handleLocationRemove = useCallback((locationId: number) => {
    dispatch({ type: 'REMOVE_LOCATION', payload: locationId });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        handleExecuteQuery();
      } else {
        event.preventDefault();
        const firstResult = searchResults.getFirstAvailableResult();
        if (firstResult) {
          handleLocationSelect(firstResult);
        }
      }
    } else if (event.key === 'Backspace') {
      if (state.searchQuery === '' && memoizedSelectedLocations.length > 0) {
        event.preventDefault();
        
        if (state.highlightedForDeletion !== null) {
          dispatch({ type: 'REMOVE_HIGHLIGHTED_LOCATION' });
        } else {
          dispatch({ type: 'HIGHLIGHT_LAST_LOCATION' });
        }
      }
    } else {
      if (state.highlightedForDeletion !== null) {
        dispatch({ type: 'CLEAR_HIGHLIGHTED' });
      }
    }
  }, [handleExecuteQuery, searchResults, handleLocationSelect, state.searchQuery, memoizedSelectedLocations.length, state.highlightedForDeletion]);

  return (
    <Box sx={containerStyles}>
      <Header />

      {/* Show API disconnected page when not connected */}
      {!isConnected && <ApiDisconnectedPage />}

      {/* Main content - only show when connected */}
      {isConnected && (
        <Paper 
          elevation={0} 
          sx={paperStyles}
        >
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
              isLoading={state.isLoading}
              allowedType={searchResults.allowedType}
              onSearchChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onExecuteQuery={handleExecuteQuery}
            />

          </>
        )}

        {/* Loading State - Show when initially loading OR when migration data is loading (e.g., period change) */}
        {(state.queryExecutionState === 'loading' || migrationData.isLoading) && (
          <LoadingState selectedLocations={state.selectedLocations} />
        )}

        {/* Success State with Results - Show when successful AND not loading migration data */}
        {state.queryExecutionState === 'success' && !migrationData.isLoading && (
          <>

            <MigrationResultsTable
              selectedLocations={state.selectedLocations}
              selectedPeriod={state.selectedPeriod}
              onNewSearch={handleReset}
              onPeriodChange={handlePeriodChange}
              mapNodes={migrationData.mapNodes}
              mapConnections={migrationData.mapConnections}
              apiResponse={migrationData.apiResponse}
              loading={migrationData.isLoading}
              error={migrationData.error}
              onRetry={handleRetryMigrationData}
              migrationThreshold={migrationThreshold}
              onThresholdChange={setMigrationThreshold}
              flowVisibility={flowVisibility}
              onFlowVisibilityChange={setFlowVisibility}
              edgeColors={edgeColors}
              onEdgeColorsChange={setEdgeColors}
            />
            
            {/* Citation Footer - only show when visualizations are rendered */}
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
      )}

      <ShortcutsModal open={state.showShortcutsModal} onClose={handleCloseShortcutsModal} />
    </Box>
  );
}
