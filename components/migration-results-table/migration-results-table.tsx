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
  onPeriodChange: (period: string) => void;
  // Migration data passed from parent
  mapNodes: MapNode[];
  mapConnections: MapConnection[];
  apiResponse: MigrationResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export default function MigrationResultsTable({ 
  selectedLocations, 
  selectedPeriod,
  onNewSearch,
  onPeriodChange,
  mapNodes,
  mapConnections,
  apiResponse,
  loading,
  error,
  onRetry
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

        {/* Success State - Migration Data Visualization */}
        {!loading && !error && mapNodes.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Migration Flow Visualization
              {apiResponse && (
                <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                  {apiResponse.data.length} locations • {apiResponse.flows?.length || 0} flows
                </Typography>
              )}
            </Typography>
            
            <NodeFlowAnimation 
              nodes={mapNodes}
              connections={mapConnections}
              curved={true}
              width={960}
              height={600}
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
            />
            
            {/* Comprehensive Migration Flow Data Table */}
            {apiResponse && apiResponse.flows && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Complete Migration Flow Data
                </Typography>
                <Paper elevation={1} sx={{ overflow: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #ddd',
                          fontWeight: '600'
                        }}>
                          From
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #ddd',
                          fontWeight: '600'
                        }}>
                          To
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          borderBottom: '2px solid #ddd',
                          fontWeight: '600'
                        }}>
                          Flow Count
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          borderBottom: '2px solid #ddd',
                          fontWeight: '600'
                        }}>
                          Return Flow Count
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #ddd',
                          fontWeight: '600'
                        }}>
                          Units
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiResponse.flows
                        .filter(flow => flow.time_period_id === selectedPeriod || 
                                       (selectedPeriod && !apiResponse.time_periods.find(tp => tp.id === selectedPeriod) && 
                                        flow.time_period_id === apiResponse.time_periods[0]?.id))
                        .map((flow, index) => (
                          <tr key={`${flow.origin.id}-${flow.destination.id}-${index}`} style={{
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9'
                          }}>
                            <td style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              fontWeight: '500'
                            }}>
                              {flow.origin.name}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              fontWeight: '500'
                            }}>
                              {flow.destination.name}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              textAlign: 'right',
                              fontWeight: '500',
                              color: '#2563eb'
                            }}>
                              {flow.flow_count.toLocaleString()}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              textAlign: 'right',
                              fontWeight: '500',
                              color: flow.return_flow_count ? '#dc2626' : '#9ca3af'
                            }}>
                              {flow.return_flow_count ? flow.return_flow_count.toLocaleString() : 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #eee',
                              color: '#6b7280'
                            }}>
                              people/year
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* No Data State */}
        {!loading && !error && mapNodes.length === 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 8,
            minHeight: '40vh'
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Migration Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              No migration flows found for the selected locations and time period.
              <br />
              Try selecting different locations or check back later.
            </Typography>
          </Box>
        )}
        
        {/* Future: Add more sophisticated table/chart components here */}
        {/* This is where we can add pagination, filtering, sorting, etc. when dealing with large datasets */}
      </Paper>
    </Box>
  );
} 