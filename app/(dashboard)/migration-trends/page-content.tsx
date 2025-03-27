'use client';

import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import VisualizationToolbar, { VisualizationFilters } from '@/components/visualization-toolbar/visualization-toolbar';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { Filter } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import { MigrationData, processMigrationData } from '@/app/services/data-loader/process-migration-data';
import ChordDiagramContainer from '@/components/chord-diagram';
import { useAppSelector } from '@/app/store/hooks';

interface MigrationTrendsProps {
}

const MigrationTrends: React.FC<MigrationTrendsProps> = ({ 
  
}) => {
  const title = "Migration Flow Visualization"
  const { themeMode } = useAppSelector(state => state.userPreferences);
  const darkMode = themeMode === 'dark';

  // State for migration data
  const [migrationData, setMigrationData] = useState<MigrationData>({
    matrix: [],
    names: []
  });
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  
  const handleVisualize = async (filters: VisualizationFilters) => {
    setLoading(true);
    setIsEmpty(true);
    
    try {
      const appliedFilters: Filter[] = transformFilter(filters);
      
      // Process and load data using the MigrationDataProcessor
      const migrationProcessor = new MigrationDataProcessor();
      await migrationProcessor.fetchData('/Jan20-Dec20_sparse.json');
      
      const data = await migrationProcessor.applyFilters(appliedFilters);
      
      if (data && data.length > 0) {
        const monthSelector = null;
        const processed = processMigrationData(data, monthSelector, appliedFilters);
        setMigrationData(processed);
        setIsEmpty(false);
        console.log('Visualization data loaded:', processed);
      } else {
        console.log('No data returned after applying filters');
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
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
        onDataLoaded={(data) => console.log('Data loaded:', data)}
        darkMode={darkMode}
        subActionsAllowed={['raw']}
        initialFilters={initialFilters}
      />
      
      <Container sx={{ px: 2, py: 2, height: 'fit-content' }}>
        <ChordDiagramContainer
          migrationData={migrationData}
          darkMode={darkMode}
          title={title}
          isLoading={loading}
          isEmpty={isEmpty}
          height="800px"
        />
      </Container>
    </Box>
  );
};

export default MigrationTrends;