'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import MigrationChart from '../../../components/migration-chart/migration-chart';

export default function MigrationContent() {
  const [moveInData, setMoveInData] = useState([]);
  const [moveOutData, setMoveOutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moveInResponse, moveOutResponse] = await Promise.all([
          fetch('/move-in-sample-dataset.json'),
          fetch('/move-out-sample-dataset.json')
        ]);
        
        const moveInData = await moveInResponse.json();
        const moveOutData = await moveOutResponse.json();
        
        setMoveInData(moveInData);
        setMoveOutData(moveOutData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Thailand Provincial Migration
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Visualizing migration patterns between agricultural and industrial provinces in Thailand
      </Typography>
      
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
  );
} 