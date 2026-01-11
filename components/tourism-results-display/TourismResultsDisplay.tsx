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
} from '@phosphor-icons/react/dist/ssr';

// Components
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';

// Utils and helpers
import { Location, getLocationColor } from '../../app/(dashboard)/helper';
import type { TourismResponse } from '@/app/services/api';
import type { TourismMapNode, TourismMapConnection } from '@/app/services/api/tourism-flow-transformer';
import { getTourismTimePeriods } from '@/app/services/api/tourism-flow-transformer';

interface TourismResultsTableProps {
  selectedLocations: Location[];
  selectedPeriod: string;
  onNewSearch: () => void;
  onEditSearch: () => void;
  onPeriodChange: (period: string, startDate: string, endDate: string) => void;
  // Tourism data passed from parent
  mapNodes: TourismMapNode[];
  mapConnections: TourismMapConnection[];
  apiResponse: TourismResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  // Flow visibility (simplified for tourism - only arrivals, no departures toggle)
  flowVisibility: Record<string, { moveIn: boolean; moveOut: boolean }>;
  onFlowVisibilityChange: (visibility: Record<string, { moveIn: boolean; moveOut: boolean }>) => void;
  edgeColors: Record<string, string>;
  onEdgeColorsChange: (colors: Record<string, string>) => void;
}

export default function TourismResultsTable({ 
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
  flowVisibility,
  onFlowVisibilityChange,
  edgeColors,
  onEdgeColorsChange
}: TourismResultsTableProps) {
  const theme = useTheme();

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
          Selected Provinces
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {selectedLocations.map((location, index) => (
            <Chip
              key={location.id}
              icon={<MapPinAreaIcon size={16} />}
              label={location.name}
              color={getLocationColor(location.type)}
              size="medium"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
          ))}
          <Chip
            label={`${selectedLocations.length} province${selectedLocations.length > 1 ? 's' : ''} • ${apiResponse?.flows?.length || 0} flows`}
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
              Loading Tourism Data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching data for {selectedLocations.length} province{selectedLocations.length > 1 ? 's' : ''}...
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
              Unable to load tourism data. Please check your connection and try again.
            </Typography>
          </Box>
        )}

        {/* Tourism Data Visualization - Always show the map */}
        {!loading && !error && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Tourism Flow
            </Typography>

            <NodeFlowAnimation
              nodes={mapNodes}
              connections={mapConnections}
              curved={true}
              width={960}
              height={800}
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
              apiResponse={apiResponse as any}
              migrationThreshold={0}
              onThresholdChange={() => {}}
              flowVisibility={flowVisibility}
              onFlowVisibilityChange={onFlowVisibilityChange}
              edgeColors={edgeColors}
              onEdgeColorsChange={onEdgeColorsChange}
              dataType="tourism"
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
                  ℹ️ No tourism data available for the selected provinces and time period.
                  Try selecting a different time period or different provinces.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
