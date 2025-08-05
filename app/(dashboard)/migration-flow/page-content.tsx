'use client';

import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import VisualizationToolbar from '@/components/visualization-toolbar/visualization-toolbar';
import { VisualizationFilters } from '@/components/visualization-toolbar/state/types';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { Filter } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import { MigrationData, processMigrationData } from '@/app/services/data-loader/process-migration-data';
import ChordDiagramContainer from '@/components/chord-diagram';
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';
import { useAppSelector } from '@/app/store/hooks';
import { migrationService, transformMigrationDataForMap, getAvailableTimePeriods } from '@/app/services/api';
import type { MigrationResponse, MapNode, MapConnection } from '@/app/services/api';

interface MigrationTrendsProps {
}

const MigrationTrends: React.FC<MigrationTrendsProps> = ({ 
  
}) => {
  const title = "Migration Flow Visualization"
  const { themeMode } = useAppSelector(state => state.userPreferences);
  const darkMode = themeMode === 'dark';

  // State for chord diagram data (legacy)
  const [migrationData, setMigrationData] = useState<MigrationData>({
    matrix: [],
    names: []
  });
  
  // State for map visualization data (new API)
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [mapConnections, setMapConnections] = useState<MapConnection[]>([]);
  const [apiResponse, setApiResponse] = useState<MigrationResponse | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [useRealAPI, setUseRealAPI] = useState(true); // Toggle between old and new data sources
  
  const handleVisualize = async (filters: VisualizationFilters) => {
    setLoading(true);
    setIsEmpty(true);
    
    try {
      if (useRealAPI) {
        // Use new migration API
        await loadMigrationDataFromAPI(filters);
      } else {
        // Use legacy data processor for chord diagram
        await loadLegacyMigrationData(filters);
      }
    } catch (error) {
      console.error('Error loading migration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMigrationDataFromAPI = async (filters: VisualizationFilters) => {
    try {
      // TODO: This should use specific location filters from the migration-flow page
      // For now, disabled to prevent multiple API calls conflicting with main dashboard
      console.log('Migration Flow API loading temporarily disabled - using fallback to legacy data');
      
      // Fallback to legacy data to prevent duplicate API calls
      console.log('Falling back to legacy data source...');
      setUseRealAPI(false);
      await loadLegacyMigrationData(filters);
      return;

      /* DISABLED: To be re-enabled when migration-flow page has its own specific filters
      const queryOptions = {
        scale: 'province' as const,
        aggregation: 'monthly' as const,
        includeFlows: true,
        // Add location filtering based on filters if needed
        // locationIds: extractLocationIdsFromFilters(filters),
      };

      console.log('Fetching migration data from API...');
      const response = await migrationService.getMigrationData(queryOptions);
      
      if (response.data && response.data.length > 0) {
        setApiResponse(response);
        
        // Get the first available time period if none selected
        const timePeriods = getAvailableTimePeriods(response);
        const timePeriodId = selectedTimePeriod || timePeriods[0]?.id || '';
        setSelectedTimePeriod(timePeriodId);
        
        // Transform data for map visualization
        const { nodes, connections } = transformMigrationDataForMap(response, timePeriodId);
        setMapNodes(nodes);
        setMapConnections(connections);
        setIsEmpty(false);
        
        console.log('Migration data loaded from API:', {
          totalLocations: response.data.length,
          totalFlows: response.flows?.length || 0,
          nodes: nodes.length,
          connections: connections.length,
          timePeriods: timePeriods.length
        });
      } else {
        console.log('No migration data returned from API');
        setIsEmpty(true);
      }
      */
    } catch (error) {
      console.error('Failed to load migration data from API:', error);
      setIsEmpty(true);
      // Fallback to legacy data
      console.log('Falling back to legacy data source...');
      setUseRealAPI(false);
      await loadLegacyMigrationData(filters);
    }
  };

  const loadLegacyMigrationData = async (filters: VisualizationFilters) => {
    try {
      const appliedFilters: Filter[] = transformFilter(filters);
      
      // Process and load data using the MigrationDataProcessor
      const migrationProcessor = new MigrationDataProcessor();
      await migrationProcessor.fetchData('/Jan20-Dec20_sparse.json');
      
      const data = await migrationProcessor.applyFilters(appliedFilters);
      
      if (data && data.length > 0) {
        const monthSelector = null;
        const processed = await processMigrationData(data, monthSelector, appliedFilters);
        setMigrationData(processed);
        setIsEmpty(false);
        console.log('Legacy visualization data loaded:', processed);
      } else {
        console.log('No data returned after applying legacy filters');
        setIsEmpty(true);
      }
    } catch (error) {
      console.error('Error loading legacy data:', error);
      setIsEmpty(true);
    }
  };

  // Handle time period changes for map visualization
  const handleTimePeriodChange = (timePeriodId: string) => {
    if (apiResponse && timePeriodId !== selectedTimePeriod) {
      setSelectedTimePeriod(timePeriodId);
      try {
        const { nodes, connections } = transformMigrationDataForMap(apiResponse, timePeriodId);
        setMapNodes(nodes);
        setMapConnections(connections);
        console.log(`Updated visualization for time period: ${timePeriodId}`);
      } catch (error) {
        console.error('Error updating time period:', error);
      }
    }
  };

  const initialFilters: Partial<VisualizationFilters> = {
    visualizationType: 'chord',
    subaction: 'raw',
  };

  return (
    <Box sx={{ 
      bgcolor: darkMode ? 'background.paper' : 'transparent',
      color: darkMode ? 'text.primary' : 'inherit',
      width: '100%',
      height: 'fit-content'
    }}>
      <VisualizationToolbar 
        onVisualize={handleVisualize}
        onFileUpload={(file) => console.log('File uploaded:', file.name)}
        darkMode={darkMode}
        subActionsAllowed={['raw']}
        initialFilters={initialFilters}
        datasetsAllowed={['migration-2020', 'premium-1', 'premium-2']}
        visualizationTypesAllowed={['chord']}
      />
      
      {/* API Toggle */}
      <Container sx={{ px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Data Source:
          </Typography>
          <Box 
            component="button"
            onClick={() => setUseRealAPI(!useRealAPI)}
            sx={{
              px: 2,
              py: 1,
              border: 1,
              borderColor: useRealAPI ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              bgcolor: useRealAPI ? 'primary.main' : 'transparent',
              color: useRealAPI ? 'primary.contrastText' : 'text.primary',
              cursor: 'pointer',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: useRealAPI ? 'primary.dark' : 'grey.100'
              }
            }}
          >
            {useRealAPI ? 'Migration API (Live)' : 'Legacy Data (Static)'}
          </Box>
          {useRealAPI && apiResponse && (
            <Typography variant="caption" color="success.main">
              ✓ API Connected ({apiResponse.data.length} locations, {apiResponse.flows?.length || 0} flows)
            </Typography>
          )}
        </Box>
      </Container>
      
      {/* Visualization Container */}
      <Container sx={{ px: 2, py: 2, height: 'fit-content' }}>
        {useRealAPI && !isEmpty ? (
          // Map Visualization (New API Data)
          <Box>
            <Typography variant="h6" gutterBottom>
              Migration Flow Map - {selectedTimePeriod ? 
                getAvailableTimePeriods(apiResponse!).find(p => p.id === selectedTimePeriod)?.label || selectedTimePeriod
                : 'Loading...'}
            </Typography>
            <NodeFlowAnimation
              nodes={mapNodes}
              connections={mapConnections}
              curved={true}
              width={960}
              height={600}
              selectedPeriod={selectedTimePeriod}
              onPeriodChange={handleTimePeriodChange}
            />
          </Box>
        ) : (
          // Chord Diagram (Legacy Data or Fallback)
          <Box>
            <Typography variant="h6" gutterBottom>
              {useRealAPI ? 'Migration Flow Visualization (Loading...)' : 'Migration Flow Visualization (Legacy)'}
            </Typography>
            <ChordDiagramContainer
              migrationData={migrationData}
              darkMode={darkMode}
              title={title}
              isLoading={loading}
              isEmpty={isEmpty}
              height="800px"
            />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MigrationTrends;