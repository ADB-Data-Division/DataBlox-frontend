'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import MigrationChart from '../../../components/migration-chart/migration-chart';
import VisualizationToolbar, { VisualizationFilters } from '@/components/visualization-toolbar/visualization-toolbar';
import { transformFilter } from '@/app/services/filter/transform';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { Filter } from '@/app/services/data-loader/data-loader-interface';

// Define the type for migration data
interface MigrationData {
  month: string;
  [key: string]: any; // For province data
}

export default function MigrationContent() {
  const [moveInData, setMoveInData] = useState<MigrationData[]>([]);
  const [moveOutData, setMoveOutData] = useState<MigrationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [subAction, setSubAction] = useState<'movein' | 'moveout' | 'net'>('movein');
  const [isEmpty, setIsEmpty] = useState(true);

  const handleVisualize = async (filters: VisualizationFilters) => {
    setLoading(true);
    setIsEmpty(true); // Reset to empty until we verify we have data

    const appliedFilters: Filter[] = transformFilter(filters);
    setSelectedProvinces(filters.provinces.map(province => province.id));
    setSubAction(filters.subaction as 'movein' | 'moveout' | 'net');

    // Process and load data using the MigrationDataProcessor
    const migrationProcessor = new MigrationDataProcessor();
    try {
      // Fetch the data from the JSON file
      await migrationProcessor.fetchData('/Jan20-Dec20_sparse.json');
      
      // Apply the filters to get the processed data
      const data = await migrationProcessor.applyFilters(appliedFilters);
      
      // Check if we received data
      if (data && data.length > 0) {
        // Set the appropriate data based on the selected action type
        if (filters.subaction === 'movein') {
          setMoveInData(data);
          setTabValue(0);
        } else if (filters.subaction === 'moveout') {
          setMoveOutData(data);
          setTabValue(1);
        }
        
        setIsEmpty(false); // We have data, so it's not empty
        console.log('Visualization data loaded:', data);
      } else {
        console.log('No data returned after applying filters');
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = (file: File) => {
    // In a real app, you would process the uploaded file
    console.log('File uploaded:', file.name);
  };
  
  const onDataLoaded = (data: any) => {
    console.log('Data loaded:', data);
    if (tabValue === 0) {
      setMoveInData(data);
    } else {
      setMoveOutData(data);
    }
    setIsEmpty(data.length === 0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        <VisualizationToolbar 
          onVisualize={handleVisualize}
          onFileUpload={handleFileUpload}
          onDataLoaded={onDataLoaded}
          darkMode={true}
        />
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Thailand Provincial Migration
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Visualizing migration patterns between agricultural and industrial provinces in Thailand
          </Typography>
          
          {!isEmpty && (
            <>
              <Paper sx={{ mb: 4 }}>
                <Tabs value={tabValue} onChange={handleTabChange} centered>
                  <Tab label="Move In" />
                  <Tab label="Move Out" />
                </Tabs>
              </Paper>
              
              {tabValue === 0 && (
                <MigrationChart 
                  data={moveInData} 
                  title="Monthly Migration Into Provinces" 
                  height={500}
                />
              )}
              
              {tabValue === 1 && (
                <MigrationChart 
                  data={moveOutData} 
                  title="Monthly Migration Out of Provinces" 
                  height={500}
                />
              )}
            </>
          )}
          
          {isEmpty && !loading && (
            <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
              Please select a dataset and apply filters to visualize migration data.
            </Typography>
          )}
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Key Insights
            </Typography>
            <Typography variant="body1">
              The data shows a clear pattern of migration from agricultural provinces (green colors) to industrial provinces (blue/purple colors), 
              especially during the dry season (November-March) when agricultural work decreases. This migration pattern reflects Thailand&apos;s 
              ongoing urbanization and industrialization, as people move from rural areas to urban centers seeking better economic opportunities.
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
} 