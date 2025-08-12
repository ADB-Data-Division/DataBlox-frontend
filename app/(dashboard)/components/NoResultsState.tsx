'use client';

import { Box, Typography } from '@mui/material';

interface NoResultsStateProps {
  searchQuery: string;
}

export function NoResultsState({ searchQuery }: NoResultsStateProps) {
  if (!searchQuery.trim()) return null;

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