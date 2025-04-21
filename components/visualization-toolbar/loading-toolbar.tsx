'use client';

import React from 'react';
import { 
  Box, 
  Paper, 
  Typography,
  Divider,
  Skeleton
} from '@mui/material';

export interface LoadingToolbarProps {
  darkMode: boolean;
  isLoading: boolean;
  toolbarTitle: string;
}

const LoadingToolbar: React.FC<LoadingToolbarProps> = ({
  darkMode,
  isLoading,
  toolbarTitle
}) => {
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
        color: darkMode ? '#fff' : 'text.primary',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {toolbarTitle}
        </Typography>
      </Box>
      
      {isLoading && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {/* Dataset selector skeleton */}
          <Box sx={{ minWidth: 200 }}>
            <Skeleton 
              variant="text" 
              width={70} 
              height={20} 
              animation="pulse" 
              sx={{ mb: 1, opacity: 0.7 }} 
            />
            <Skeleton 
              variant="rounded" 
              width={200} 
              height={55} 
              animation="pulse" 
              sx={{ opacity: 0.7 }} 
            />
          </Box>
          
          {/* Province filter skeleton */}
          <Box sx={{ minWidth: 400 }}>
            <Skeleton 
              variant="text" 
              width={70} 
              height={20} 
              animation="pulse" 
              sx={{ mb: 1, opacity: 0.7 }} 
            />
            <Skeleton 
              variant="rounded" 
              width={400} 
              height={55} 
              animation="pulse"
              sx={{ opacity: 0.7 }} 
            />
            {/* <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Skeleton variant="circular" width={48} height={48} animation="pulse" sx={{ opacity: 0.7 }} />
              <Skeleton variant="circular" width={48} height={48} animation="pulse" sx={{ opacity: 0.8 }} />
              <Skeleton variant="circular" width={48} height={48} animation="pulse" sx={{ opacity: 0.7 }} />
              <Skeleton variant="circular" width={48} height={48} animation="pulse" sx={{ opacity: 0.9 }} />
            </Box> */}
          </Box>
          
          {/* Date time period filter skeleton */}
          <Box sx={{ minWidth: 150 }}>
            <Skeleton 
              variant="text" 
              width={90} 
              height={20} 
              animation="pulse" 
              sx={{ mb: 1, opacity: 0.7 }} 
            />
            <Skeleton 
              variant="rounded" 
              width={150} 
              height={55} 
              animation="pulse" 
              sx={{ opacity: 0.7 }} 
            />
          </Box>
        </Box>
      )}
      
      <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
      
      {isLoading && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, md: 0 } }}>
            {/* Subactions selector skeleton */}
            <Skeleton 
              variant="rounded" 
              width={120} 
              height={40} 
              animation="pulse" 
              sx={{ opacity: 0.7 }} 
            />
            
            {/* Visualization selector skeleton */}
            <Skeleton 
              variant="rounded" 
              width={160} 
              height={40} 
              animation="pulse" 
              sx={{ opacity: 0.7 }} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Reset button skeleton */}
            <Skeleton 
              variant="rounded" 
              width={120} 
              height={40} 
              animation="pulse" 
              sx={{ opacity: 0.7 }} 
            />
            {/* Visualize button skeleton */}
            <Skeleton 
              variant="rounded" 
              width={120} 
              height={40} 
              animation="pulse" 
              sx={{ opacity: 0.8 }} 
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default LoadingToolbar; 