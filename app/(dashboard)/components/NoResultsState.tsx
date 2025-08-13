'use client';

import { Box, Typography } from '@mui/material';

interface NoResultsStateProps {
  searchQuery: string;
  totalResults?: number;
}

export function NoResultsState({ searchQuery, totalResults = 0 }: NoResultsStateProps) {
  if (!searchQuery.trim()) return null;
  if (totalResults > 0) return null; // Don't show if there are results

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="body1" color="text.secondary">
        No locations found matching &ldquo;{searchQuery}&rdquo;
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Try searching with different keywords
      </Typography>
    </Box>
  );
}