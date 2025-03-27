'use client';

import React, { useState } from 'react';
import { Box, Typography, Container, CircularProgress, Alert } from '@mui/material';
import ChordDiagram from './chord-diagram';
import { ChordDiagramContainerProps } from './types';
import { TooltipData } from '../chord-tooltip/types';
import ChordTooltip from '../chord-tooltip/chord-tooltip';
import { MigrationData } from '@/app/services/data-loader/process-migration-data';

const ChordDiagramContainer: React.FC<ChordDiagramContainerProps> = ({
  migrationData,
  width = '100%',
  height = '500px',
  darkMode = false,
  title = 'Migration Flow Diagram',
  colorScheme,
  isLoading: externalLoading,
  isEmpty: externalEmpty
}) => {
  // Manage local state for loading and errors
  const [internalError, setInternalError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    source: undefined,
    destination: undefined,
    sourceToDestValue: undefined,
    sourceToDestPercent: undefined,
    destToSourceValue: undefined,
    destToSourcePercent: undefined,
    sourceColor: undefined,
    destColor: undefined,
    x: 0,
    y: 0
  });

  // Determine loading state (either from internal state or external prop)
  const isLoading = externalLoading !== undefined ? externalLoading : false;
  
  // Determine if content is empty (either from internal state or external prop)
  const isEmpty = externalEmpty !== undefined ? externalEmpty : !migrationData || migrationData.matrix.length === 0;

  // Handle error boundary
  const handleChordError = (error: Error) => {
    console.error('Error in chord diagram:', error);
    setInternalError(`Error rendering chart: ${error.message}`);
  };

  // Calculate dimensions based on container size
  const chartWidth = typeof width === 'number' ? width : 480;
  const chartHeight = typeof height === 'number' ? height : 320;

  return (
    <Box
      sx={{
        width,
        height,
        bgcolor: darkMode ? 'background.paper' : 'transparent',
        color: darkMode ? 'text.primary' : 'inherit',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: 1
      }}
    >
      {/* Title Section */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
      </Box>

      {/* Content Section */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        {isLoading ? (
          <CircularProgress />
        ) : internalError ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {internalError}
          </Alert>
        ) : isEmpty ? (
          <Typography variant="body1" sx={{ textAlign: 'center' }}>
            No data available. Please select provinces and apply filters.
          </Typography>
        ) : (
          <React.Fragment>
            {/* Only render the chord diagram if we have data */}
            {migrationData && (
              <ChordDiagram
                data={migrationData}
                width={chartWidth}
                height={chartHeight}
                darkMode={darkMode}
                colorScheme={colorScheme}
                onTooltipChange={setTooltip}
              />
            )}
          </React.Fragment>
        )}
      </Box>

      {/* Custom tooltip component */}
      <ChordTooltip {...tooltip} darkMode={darkMode} />
    </Box>
  );
};

export default ChordDiagramContainer; 