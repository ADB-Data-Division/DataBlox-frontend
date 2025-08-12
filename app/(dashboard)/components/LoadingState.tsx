'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import { Location } from '../helper';

interface LoadingStateProps {
  selectedLocations: Location[];
}

export function LoadingState({ selectedLocations }: LoadingStateProps) {
  return (
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
        Processing {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''}...
      </Typography>
    </Box>
  );
}