import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  useTheme,
  CircularProgress,
  Alert
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
import type { MapNode, MapConnection, MigrationResponse } from '@/app/services/api';
import { getAvailableTimePeriods } from '@/app/services/api';

interface MigrationResultsTableProps {
  selectedLocations: Location[];
  selectedPeriod: string;
  onNewSearch: () => void;
  onEditSearch: () => void;
  onPeriodChange: (period: string, startDate: string, endDate: string) => void;
  // Migration data passed from parent
  mapNodes: MapNode[];
  mapConnections: MapConnection[];
  apiResponse: MigrationResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  migrationThreshold: number;
  onThresholdChange: (threshold: number) => void;
  flowVisibility: Record<string, { moveIn: boolean; moveOut: boolean }>;
  onFlowVisibilityChange: (visibility: Record<string, { moveIn: boolean; moveOut: boolean }>) => void;
  edgeColors: Record<string, string>;
  onEdgeColorsChange: (colors: Record<string, string>) => void;
}

export default function MigrationResultsTable({ 
  selectedLocations, 
  selectedPeriod,
  onNewSearch,
  onEditSearch,
  onPeriodChange,
  mapNodes,
  mapConnections,
  apiResponse,
  loading,
  error,
  onRetry,
  migrationThreshold,
  onThresholdChange,
  flowVisibility,
  onFlowVisibilityChange,
  edgeColors,
  onEdgeColorsChange
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
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          mb: 3,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ 
            textTransform: 'uppercase', 
            letterSpacing: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            mb: 1.5
          }}
        >
          Selected Locations
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {selectedLocations.map((location, index) => (
            <Chip
              key={location.id}
              icon={getLocationIcon(location.type)}
              label={location.name}
              color={getLocationColor(location.type)}
              size="medium"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
          ))}
          {/* Migration Flow
              {apiResponse && (
                <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                  {apiResponse.data.length} locations • {apiResponse.flows?.length || 0} flows
                </Typography>
              )} */}
          <Chip
            label={`${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''} • ${apiResponse?.flows?.length || 0} flows`}
            size="small"
            variant="outlined"
            sx={{ 
              fontWeight: 500,
              fontSize: '0.75rem',
              borderStyle: 'dashed'
            }}
          />
        </Box>

        <Button 
          variant="outlined" 
          size="small"
          onClick={onEditSearch}
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            mr: 1,
          }}
        >
          Edit Search
        </Button>

        <Button 
          variant="outlined" 
          size="small"
          onClick={onNewSearch}
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          New Search
        </Button>
      </Paper>
      
      {/* Results Container */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          backgroundColor: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          minHeight: '50vh'
        }}
      >
        {/* Loading State */}
        {loading && (
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
              Loading Migration Data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching data for {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''}...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Box sx={{ py: 4 }}>
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                onRetry && (
                  <Button color="inherit" size="small" onClick={onRetry}>
                    Retry
                  </Button>
                )
              }
            >
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Unable to load migration data. Please check your connection and try again.
            </Typography>
          </Box>
        )}

        {/* Migration Data Visualization - Always show the map */}
        {!loading && !error && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Migration Flow
            </Typography>

            <NodeFlowAnimation
              nodes={mapNodes}
              connections={mapConnections}
              curved={true}
              width={960}
              height={800}
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
              apiResponse={apiResponse}
              migrationThreshold={migrationThreshold}
              onThresholdChange={onThresholdChange}
              flowVisibility={flowVisibility}
              onFlowVisibilityChange={onFlowVisibilityChange}
              edgeColors={edgeColors}
              onEdgeColorsChange={onEdgeColorsChange}
            />

            {/* Notice when no data is available for the current period */}
            {mapNodes.length === 0 && (
              <Box sx={{
                mt: 2,
                p: 2,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
                border: `1px solid ${theme.palette.warning.main}`,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                  ℹ️ No migration data available for the selected locations and time period.
                  Try selecting a different time period or different locations.
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* Future: Add more sophisticated table/chart components here */}
        {/* This is where we can add pagination, filtering, sorting, etc. when dealing with large datasets */}
      </Paper>
    </Box>
  );
} 