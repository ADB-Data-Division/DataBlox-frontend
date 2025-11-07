'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Paper,
  Chip,
  useTheme
} from '@mui/material';
import {
  ClockIcon,
  CaretDownIcon,
  CaretUpIcon,
  TrashIcon,
  MapPinIcon
} from '@phosphor-icons/react/dist/ssr';
import { RecentSearch, formatSearchTime } from '../../../src/utils/recentSearches';
import { Location } from '../helper';

interface RecentSearchesProps {
  recentSearches: RecentSearch[];
  onLoadRecentSearch: (locations: Location[]) => void;
  onRemoveRecentSearch: (searchId: string) => void;
  onClearAllRecentSearches: () => void;
  currentSelectedCount: number;
  maxLocations?: number;
}

export function RecentSearches({
  recentSearches,
  onLoadRecentSearch,
  onRemoveRecentSearch,
  onClearAllRecentSearches,
  currentSelectedCount,
  maxLocations = 5
}: RecentSearchesProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (recentSearches.length === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClockIcon size={20} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary">
              Recent searches will appear here after you run your first migration query
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLoadSearch = (search: RecentSearch) => {
    const availableSlots = maxLocations - currentSelectedCount;

    if (availableSlots <= 0) {
      // Could show a warning here, but for now just don't load
      return;
    }

    // Load as many locations as possible within the limit
    const locationsToLoad = search.locations.slice(0, availableSlots);
    onLoadRecentSearch(locationsToLoad);
  };

  const visibleSearches = isExpanded ? recentSearches : recentSearches.slice(0, 3);

  return (
    <Box sx={{ mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
          onClick={handleToggleExpand}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClockIcon size={20} color={theme.palette.text.secondary} />
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              Recent Searches ({recentSearches.length})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {recentSearches.length > 3 && (
              <Typography variant="caption" color="text.secondary">
                {isExpanded ? 'Show less' : `Show ${recentSearches.length - 3} more`}
              </Typography>
            )}
            {isExpanded ? (
              <CaretUpIcon size={16} color={theme.palette.text.secondary} />
            ) : (
              <CaretDownIcon size={16} color={theme.palette.text.secondary} />
            )}
          </Box>
        </Box>

        {/* Recent Searches List */}
        <Collapse in={isExpanded}>
          <List sx={{ py: 0 }}>
            {visibleSearches.map((search) => (
              <ListItem
                key={search.id}
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  py: 1.5,
                  px: 2
                }}
                onClick={() => handleLoadSearch(search)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                  <MapPinIcon size={16} color={theme.palette.text.secondary} />
                </Box>

                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500}>
                      {search.displayName}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={`${search.locationCount} location${search.locationCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: '20px', fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatSearchTime(search.timestamp)}
                      </Typography>
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentSearch(search.id);
                    }}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main'
                      }
                    }}
                  >
                    <TrashIcon size={16} />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {/* Clear All Button */}
          {recentSearches.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'error.main',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: 'error.dark'
                  }
                }}
                onClick={onClearAllRecentSearches}
              >
                Clear all recent searches
              </Typography>
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
}