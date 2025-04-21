import React from 'react';
import { Box, Paper, Typography, Button, Chip, Stack, IconButton, Tooltip, useTheme } from '@mui/material';
import { EditOutlined } from '@mui/icons-material';
import { VisualizationFilters } from './state';
import { formatDateForDisplay, getTimePeriodLabel } from './utils';
import { Gear } from '@phosphor-icons/react';


interface CollapsedToolbarProps {
  filters: VisualizationFilters;
  darkMode?: boolean;
  onExpand: () => void;
  visualizationTitle: string;
}

/**
 * A presentation mode version of the visualization toolbar that shows a summary of the current filters
 */
const CollapsedToolbar: React.FC<CollapsedToolbarProps> = ({
  filters,
  darkMode = false,
  onExpand,
  visualizationTitle
}) => {
  const {
    provinces,
    timePeriod,
    startDate,
    endDate,
    visualizationType,
    subaction
  } = filters;

  const theme = useTheme();

  // Format the time period for display
  const formattedTimePeriod = `based on ` + (timePeriod ? getTimePeriodLabel(timePeriod) : 'all data');
  const dateRangeText = startDate && endDate 
    ? `from ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`
    : formattedTimePeriod;

  const capitalCaseAllWords = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Format provinces for display
  const provincesText = provinces.length > 0
    ? provinces.map(p => capitalCaseAllWords(p.name)).join(', ')
    : 'All Provinces';

  // Create a readable description of the visualization
  const visualizationTypeLabel = visualizationType === 'bar' 
    ? 'Bar Chart' 
    : visualizationType === 'map' 
      ? 'Map View' 
      : 'Chord Diagram';

  const subactionLabel = subaction === 'movein'
    ? 'Move In'
    : subaction === 'moveout'
      ? 'Move Out'
      : subaction === 'net'
        ? 'Net Movement'
        : 'Overview';

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 1,
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
        color: darkMode ? '#fff' : 'text.primary',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          Generated Report
        </Typography>
        <Tooltip title="Edit data source controls">
        <IconButton
          size="small"
          onClick={onExpand}
          sx={{ color: 'primary.main' }}
         >
          <Gear />
        </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ mb: 1 }}>
        {/* <Typography variant="body1" sx={{ mb: 1 }}>
          Showing <strong>{subactionLabel}</strong> data as a <strong>{visualizationTypeLabel}</strong> for <strong>{provincesText}</strong> <strong>{dateRangeText}</strong>.
        </Typography> */}
        
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip 
            label={`Subaction: ${subactionLabel}`}
            size="small"
            variant="outlined"
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: theme.palette.text.primary
            }}
          />
          <Chip 
            label={`Visualization: ${visualizationTypeLabel}`} 
            size="small"
            variant="outlined" 
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: theme.palette.text.primary
            }}
          />
          <Chip 
            label={`Date Range: ${dateRangeText}`} 
            size="small"
            variant="outlined"
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: theme.palette.text.primary
            }}
          />
        </Stack>
      </Box>
    </Paper>
  );
};

export default CollapsedToolbar; 