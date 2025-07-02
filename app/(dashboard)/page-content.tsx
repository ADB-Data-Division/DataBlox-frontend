'use client';

import React, { useRef, KeyboardEvent, useEffect, useReducer, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Typography, 
  Box, 
  Paper, 
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme
} from '@mui/material';
import { 
  MagnifyingGlassIcon,
  MapPinAreaIcon,
  MapPinSimpleIcon,
  TrainRegionalIcon,
} from '@phosphor-icons/react/dist/ssr';

// Components
import MigrationResultsTable from '@/components/migration-results-table';

// Utils and helpers
import { filterItems, getCommandKey } from '../../src/utils/search';
import { 
  Location, 
  locationData, 
  getLocationIconType, 
  getLocationColor, 
  getAllLocations, 
  executeQuery,
  getLocationByUniqueId,
  getLocationsByUniqueIds 
} from './helper';
import { mapViewReducer, initialState } from './reducer';

export default function PageContent() {
  const theme = useTheme();
  const [state, dispatch] = useReducer(mapViewReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Debounce timer ref for period changes
  const periodChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track when we're resetting to prevent URL effect interference
  const isResettingRef = useRef<boolean>(false);

  // URL parameter utilities
  const updateUrlWithLocations = (locations: Location[]) => {
    const params = new URLSearchParams();
    // Use comma-separated unique IDs for the locations parameter
    if (locations.length > 0) {
      const uniqueIds = locations.map(location => location.uniqueId).join(',');
      params.set('locations', uniqueIds);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearUrlParams = () => {
    router.push(window.location.pathname, { scroll: false });
  };

  // Debounced period change handler
  const debouncedPeriodChange = useCallback((period: string) => {
    // Clear any existing timer
    if (periodChangeTimerRef.current) {
      clearTimeout(periodChangeTimerRef.current);
    }
    
    // Set new timer
    periodChangeTimerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_PERIOD', payload: period });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (periodChangeTimerRef.current) {
        clearTimeout(periodChangeTimerRef.current);
      }
      isResettingRef.current = false;
    };
  }, []);

  const handleReset = () => {
    // Clear any pending debounced changes
    if (periodChangeTimerRef.current) {
      clearTimeout(periodChangeTimerRef.current);
    }
    
    // Mark that we're resetting
    isResettingRef.current = true;
    
    // Clear URL first to prevent interference
    clearUrlParams();
    
    // Then reset all state
    dispatch({ type: 'RESET_QUERY_STATE' });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
    dispatch({ type: 'SET_SELECTED_PERIOD', payload: '2020-all' }); // Reset to default period
    
    // Clear the reset flag after a short delay to allow state updates
    setTimeout(() => {
      isResettingRef.current = false;
    }, 100);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey;

      // CMD/CTRL + K: Focus search
      if (cmdOrCtrl && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // CMD/CTRL + /: Show shortcuts modal
      if (cmdOrCtrl && event.key === '/') {
        event.preventDefault();
        dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: true });
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load locations from URL parameters on mount
  useEffect(() => {
    const loadFromUrl = async () => {
      // Skip URL processing if we're in the middle of a reset
      if (isResettingRef.current) {
        return;
      }
      
      const locationsParam = searchParams.get('locations');
      
      if (locationsParam) {
        try {
          // Split comma-separated unique IDs and convert to Location objects
          const uniqueIds = locationsParam.split(',').filter(id => id.trim() !== '');
          const locations = getLocationsByUniqueIds(uniqueIds);
          
          // Check if these locations are already loaded and query was successful
          const currentUniqueIds = state.selectedLocations.map(loc => loc.uniqueId).sort();
          const urlUniqueIds = uniqueIds.sort();
          const locationsMatch = currentUniqueIds.length === urlUniqueIds.length && 
                                currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);
          
          // Only load if locations don't match current state
          if (locations.length > 0 && !locationsMatch) {
            // Clear existing locations and load new ones
            dispatch({ type: 'CLEAR_ALL_LOCATIONS' });
            locations.forEach(location => {
              dispatch({ type: 'ADD_LOCATION', payload: location });
            });
            
            // Directly set to success state without loading - assume URL params represent completed queries
            dispatch({ type: 'SET_QUERY_SUCCESS' });
          }
        } catch (error) {
          console.error('Failed to parse locations from URL:', error);
        }
      }
    };
    
    loadFromUrl();
  }, [searchParams, state.selectedLocations, state.queryExecutionState]);

  const handleCloseShortcutsModal = () => {
    dispatch({ type: 'SET_SHORTCUTS_MODAL', payload: false });
  };

  // Get all locations
  const allLocations = getAllLocations();

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: event.target.value });
  };

  const handleLocationSelect = (location: Location) => {
    dispatch({ type: 'ADD_LOCATION', payload: location });
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleLocationRemove = (locationId: number) => {
    dispatch({ type: 'REMOVE_LOCATION', payload: locationId });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift + Enter: Execute query
        handleExecuteQuery();
      } else {
        // Enter: Select first result
        event.preventDefault();
        const firstResult = getFirstAvailableResult();
        if (firstResult) {
          handleLocationSelect(firstResult);
        }
      }
    } else if (event.key === 'Backspace') {
      // Only handle backspace if search field is empty
      if (state.searchQuery === '' && state.selectedLocations.length > 0) {
        event.preventDefault();
        
        if (state.highlightedForDeletion !== null) {
          // Second backspace: Remove the highlighted location
          dispatch({ type: 'REMOVE_HIGHLIGHTED_LOCATION' });
        } else {
          // First backspace: Highlight the last location for deletion
          dispatch({ type: 'HIGHLIGHT_LAST_LOCATION' });
        }
      }
    } else {
      // Any other key press clears the highlighted state
      if (state.highlightedForDeletion !== null) {
        dispatch({ type: 'CLEAR_HIGHLIGHTED' });
      }
    }
  };

  const handleExecuteQuery = async () => {
    if (state.selectedLocations.length === 0) return;
    
    dispatch({ type: 'START_QUERY_EXECUTION' });
    
    try {
      const result = await executeQuery(state.selectedLocations);
      
      if (result.success) {
        // Add selected locations to URL query parameters
        updateUrlWithLocations(state.selectedLocations);
        dispatch({ type: 'SET_QUERY_SUCCESS' });
      } else {
        dispatch({ type: 'SET_QUERY_ERROR' });
      }
    } catch (error) {
      console.error('Query execution error:', error);
      dispatch({ type: 'SET_QUERY_ERROR' });
    }
  };

  const getFirstAvailableResult = (): Location | null => {
    const filtered = filterItems(
      allLocations,
      state.searchQuery,
      ['name', 'description'],
      state.selectedLocations.map(loc => loc.id)
    );
    return filtered.length > 0 ? filtered[0] : null;
  };

  // Filter locations using the generic utility
  const selectedIds = state.selectedLocations.map(loc => loc.id);
  const filteredProvinces = filterItems(
    locationData.provinces,
    state.searchQuery,
    ['name', 'description'],
    selectedIds
  );
  const filteredDistricts = filterItems(
    locationData.districts,
    state.searchQuery,
    ['name', 'description'],
    selectedIds
  );
  const filteredSubDistricts = filterItems(
    locationData.subDistricts,
    state.searchQuery,
    ['name', 'description'],
    selectedIds
  );

  // Helper function to get icon component (for search results display)
  const getLocationIcon = (type: Location['type']) => {
    const iconType = getLocationIconType(type);
    switch (iconType) {
      case 'buildings': return <TrainRegionalIcon size={16} />;
      case 'users': return <MapPinAreaIcon size={16} />;
      case 'mapPin': return <MapPinSimpleIcon size={16} />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Typography variant="h1" fontWeight="bold" sx={{ mb: 1, fontSize: '24px' }}>
        GPS Estimates Dashboard
      </Typography>

      {/* Main Content Paper */}
      <Paper 
        elevation={0} 
        sx={{ 
          py: 1,
          backgroundColor: theme.palette.background.paper,
          minHeight: '70vh'
        }}
      >

        {/* Search Interface - Hidden in success state */}
        {state.queryExecutionState !== 'success' && (
          <>
            {/* Selected Locations Display */}
            {state.selectedLocations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
              Selected state{state.selectedLocations.length > 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {state.selectedLocations.map((location) => (
                <Chip
                  key={location.id}
                  icon={getLocationIcon(location.type)}
                  label={location.name}
                  color={getLocationColor(location.type)}
                  onDelete={() => handleLocationRemove(location.id)}
                  size="medium"
                  sx={{ 
                    fontWeight: 'medium',
                    ...(state.highlightedForDeletion === location.id && {
                      backgroundColor: theme.palette.error.light,
                      color: theme.palette.error.contrastText,
                      '& .MuiChip-icon': {
                        color: theme.palette.error.contrastText,
                      },
                      '& .MuiChip-deleteIcon': {
                        color: theme.palette.error.contrastText,
                        '&:hover': {
                          color: theme.palette.error.dark,
                        }
                      },
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                        '100%': { opacity: 1 },
                      }
                    })
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Search Bar with Button */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Search for provinces, districts, subdistricts"
            value={state.searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="medium"
            disabled={state.isLoading}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlassIcon size={20} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            helperText={
              <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <span>Enter to select, Shift+Enter or button to execute, {getCommandKey()}+K to focus, Backspace to remove last, {getCommandKey()}+/ for help</span>
                {state.selectedLocations.length > 0 && (
                  <span style={{ color: theme.palette.primary.main }}>
                    {state.selectedLocations.length} location{state.selectedLocations.length > 1 ? 's' : ''} selected
                    {state.highlightedForDeletion && (
                      <span style={{ color: theme.palette.error.main, marginLeft: '8px' }}>
                        (Press Backspace again to delete)
                      </span>
                    )}
                  </span>
                )}
              </Box>
            }
          />

          {/* View Migration Trends Button */}
          {state.selectedLocations.length > 0 && (
            <Button
              variant="contained"
              size="large"
              onClick={handleExecuteQuery}
              disabled={state.isLoading}
              sx={{
                px: 3,
                py: 1.75,
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: 2,
                minWidth: '240px',
                height: '56px', // Match TextField height
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              View Migration Trends
            </Button>
          )}
        </Box>
          </>
        )}

        {/* Loading State */}
        {state.queryExecutionState === 'loading' && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 8,
            minHeight: '40vh'
          }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
              Executing Query
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Processing {state.selectedLocations.length} location{state.selectedLocations.length > 1 ? 's' : ''}...
            </Typography>
          </Box>
        )}

        {/* Success State with Results */}
        {state.queryExecutionState === 'success' && (
          <MigrationResultsTable
            selectedLocations={state.selectedLocations}
            selectedPeriod={state.selectedPeriod}
            onNewSearch={handleReset}
            onPeriodChange={debouncedPeriodChange}
          />
        )}

        {/* Search Results - Only show when not in loading or success state */}
        {state.showSearchResults && state.queryExecutionState === 'idle' && (
          <>
            {/* Provinces Section */}
            {filteredProvinces.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              PROVINCE
            </Typography>
            <List disablePadding>
              {filteredProvinces.map((province, index) => (
                <React.Fragment key={province.id}>
                  <ListItem
                    onClick={() => handleLocationSelect(province)}
                    sx={{
                      px: 0,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: 1
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TrainRegionalIcon size={20} color={theme.palette.text.primary} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {province.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {province.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredProvinces.length - 1 && (
                    <Divider sx={{ ml: 4.5 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {/* Districts Section */}
        {filteredDistricts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              DISTRICT
            </Typography>
            <List disablePadding>
              {filteredDistricts.map((district, index) => (
                <React.Fragment key={district.id}>
                  <ListItem
                    onClick={() => handleLocationSelect(district)}
                    sx={{
                      px: 0,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: 1
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <MapPinAreaIcon size={20} color={theme.palette.text.primary} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {district.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {district.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredDistricts.length - 1 && (
                    <Divider sx={{ ml: 4.5 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {/* Sub Districts Section */}
        {filteredSubDistricts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              SUB DISTRICT
            </Typography>
            <List disablePadding>
              {filteredSubDistricts.map((subDistrict, index) => (
                <React.Fragment key={subDistrict.id}>
                  <ListItem
                    onClick={() => handleLocationSelect(subDistrict)}
                    sx={{
                      px: 0,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: 1
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <MapPinSimpleIcon size={20} color={theme.palette.text.primary} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {subDistrict.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {subDistrict.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredSubDistricts.length - 1 && (
                    <Divider sx={{ ml: 4.5 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

            {/* No Results State */}
            {state.searchQuery.trim() && 
             filteredProvinces.length === 0 && 
             filteredDistricts.length === 0 && 
             filteredSubDistricts.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  No locations found matching &ldquo;{state.searchQuery}&rdquo;
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try searching with different keywords
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Shortcuts Modal */}
      <Dialog
        open={state.showShortcutsModal}
        onClose={handleCloseShortcutsModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography component="span" variant="subtitle1" fontWeight="bold">
            Keyboard Shortcuts
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Focus search bar</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {getCommandKey()}
                </Box>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  K
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Select first result</Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                Enter
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">View Migration Trends</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  Shift
                </Box>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  Enter
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Remove last selection</Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                Backspace
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Show this help</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {getCommandKey()}
                </Box>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.grey[300]}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  /
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShortcutsModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
