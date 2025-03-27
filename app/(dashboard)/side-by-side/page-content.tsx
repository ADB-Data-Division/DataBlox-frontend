'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { axisClasses } from '@mui/x-charts';
import moveInSampleDataset from '../../../public/move-in-sample-dataset.json';
import VisualizationToolbar, { VisualizationFilters } from '../../../components/visualization-toolbar/visualization-toolbar';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { useMemo, useState } from 'react';
import { normalizeAsKey } from '@/models/normalize';
import { Filter, GeoJSONLevel } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import ChordDiagramContainer from '@/components/chord-diagram';
import { processMigrationData } from '@/app/services/data-loader/process-migration-data';
import { MigrationData } from '@/app/services/data-loader/process-migration-data';
import { useAppSelector } from '@/app/store/hooks';
import ThailandMap from '@/components/leaflet/leaflet';

export default function SideBySidePageContent() {
  const [activeDataset, setActiveDataset] = useState(moveInSampleDataset);
  const [subAction, setSubAction] = useState<'movein' | 'moveout' | 'net'>('movein');
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { themeMode } = useAppSelector(state => state.userPreferences);
  const darkMode = themeMode === 'dark';

  // State for migration data
  const [migrationData, setMigrationData] = useState<MigrationData>({
    matrix: [],
    names: []
  });
  
  const handleVisualize = async (filters: VisualizationFilters) => {
    setIsLoading(true);
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
        onDataLoaded(data);
        console.log('Visualization data loaded:', processed);
      } else {
        console.log('No data returned after applying filters');
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  function valueFormatter(value: number | null) {
    return `${value}`;
  }

  const chartSetting = {
    yAxis: [
      {
        label: 'Number of People',
        labelStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        },
        tickLabelStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        tickSize: 10,
      },
    ],
    width: 1000,
    height: 500,
    margin: { top: 40, right: 40, bottom: 60, left: 80 },
    sx: {
      [`.${axisClasses.left} .${axisClasses.label}`]: {
        transform: 'translate(-20px, 0)',
      },
      '.MuiChartsAxis-line': {
        stroke: '#aaa',
        strokeWidth: 1.5,
      },
      '.MuiChartsAxis-tick': {
        stroke: '#aaa',
        strokeWidth: 1.5,
      },
      '.MuiChartsAxis-tickLabel': {
        fontWeight: 'bold',
      },
    },
  };
  
  const handleFileUpload = (file: File) => {
    // In a real app, you would process the uploaded file
    console.log('File uploaded:', file.name);
  };

  const capitalizeEachWord = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Filter series based on selected provinces
  const getFilteredSeries = useMemo(() => {
    const keys = Object.keys(activeDataset[0]).map(normalizeAsKey);
    const allSeries = keys.map(key => ({ dataKey: key, label: capitalizeEachWord(key), valueFormatter }));
      
    if (selectedProvinces.length === 0) {
      return allSeries;
    }
    
    return allSeries.filter(series => 
      selectedProvinces.includes(series.dataKey)
    );
  }, [selectedProvinces, activeDataset]);

  const onDataLoaded = (data: any) => {
    console.log(data);
    setActiveDataset(data);
    setIsLoading(false);
    setIsEmpty(false);
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        <VisualizationToolbar 
          onVisualize={handleVisualize}
          onFileUpload={handleFileUpload}
          onDataLoaded={onDataLoaded}
          darkMode={true}
          subActionsAllowed={['raw']}
          initialFilters={{
            subaction: 'raw',
            visualizationType: 'chord'
          }}
        />
      </Box>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
        <Box sx={{ px: 2, py: 2, height: 'fit-content', width: '50%' }}>
          <ThailandMap adminLevel={GeoJSONLevel.PROVINCE} height="700px" />
        </Box>
        <Box sx={{ px: 2, py: 2, height: 'fit-content', width: '50%' }}>
          <ChordDiagramContainer
            migrationData={migrationData}
            darkMode={false}
            title="Migration Flow Visualization"
            isLoading={isLoading}
            isEmpty={isEmpty}
            height="700px"
          />
        </Box>
      </Box>
    </Box>
  );
}