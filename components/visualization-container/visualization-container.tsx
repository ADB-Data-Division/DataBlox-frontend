import React, { ReactNode, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export type VisualizationType = 'bar' | 'line' | 'map' | 'chord';

interface VisualizationContainerProps {
  type: VisualizationType;
  isLoading?: boolean;
  children?: ReactNode;
  height?: number;
  title?: string;
}

const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  type,
  isLoading = false,
  children,
  height = 500,
  title,
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
        overflow: 'hidden',
      }}
    >
      {title && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}
      
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
      }}>
        {isLoading ? (
          <>
            <CircularProgress />
            <Typography ml={2}>Loading {type}...</Typography>
          </>
        ) : children ? (
          children
        ) : (
          <Typography color="text.secondary">No data available</Typography>
        )}
      </Box>
    </Box>
  );
};

export default VisualizationContainer;