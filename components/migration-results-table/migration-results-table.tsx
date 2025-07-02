import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import {
  MapPinAreaIcon,
  MapPinSimpleIcon,
  TrainRegionalIcon,
} from '@phosphor-icons/react/dist/ssr';

// Components
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';

// Utils and helpers
import { Location, getLocationIconType, getLocationColor } from '../../app/(dashboard)/helper';

interface MigrationResultsTableProps {
  selectedLocations: Location[];
  selectedPeriod: string;
  onNewSearch: () => void;
  onPeriodChange: (period: string) => void;
}

export default function MigrationResultsTable({ 
  selectedLocations, 
  selectedPeriod,
  onNewSearch,
  onPeriodChange
}: MigrationResultsTableProps) {
  const theme = useTheme();

  // Helper function to get icon component
  const getLocationIcon = (type: Location['type']) => {
    const iconType = getLocationIconType(type);
    switch (iconType) {
      case 'buildings': return <TrainRegionalIcon size={16} />;
      case 'users': return <MapPinAreaIcon size={16} />;
      case 'mapPin': return <MapPinSimpleIcon size={16} />;
    }
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" color="text.primary" sx={{ mr: 1 }}>
            Query Results for
          </Typography>
          {selectedLocations.map((location, index) => (
            <React.Fragment key={location.id}>
              <Chip
                icon={getLocationIcon(location.type)}
                label={location.name}
                color={getLocationColor(location.type)}
                size="medium"
                sx={{ fontWeight: 'medium' }}
              />
              {index < selectedLocations.length - 1 && (
                <Typography variant="h6" color="text.secondary" sx={{ mx: 0.5 }}>
                  ,
                </Typography>
              )}
            </React.Fragment>
          ))}
        </Box>
        <Button 
          variant="outlined" 
          size="small"
          onClick={onNewSearch}
          sx={{ flexShrink: 0 }}
        >
          New search
        </Button>
      </Box>
      
      {/* Results Container */}
      <Paper 
        elevation={1}
        sx={{ 
          p: 3,
          backgroundColor: theme.palette.background.default,
          borderRadius: 2,
          minHeight: '50vh'
        }}
      >
        {/* Migration Data Visualization */}
        <NodeFlowAnimation 
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
        />
        
        {/* Future: Add more sophisticated table/chart components here */}
        {/* This is where we can add pagination, filtering, sorting, etc. when dealing with large datasets */}
      </Paper>
    </Box>
  );
} 