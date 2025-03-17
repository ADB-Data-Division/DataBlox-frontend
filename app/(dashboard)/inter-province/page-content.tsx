'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { axisClasses } from '@mui/x-charts';
import moveInSampleDataset from '../../../public/move-in-sample-dataset.json';
import moveOutSampleDataset from '../../../public/move-out-sample-dataset.json';
import VisualizationToolbar, { VisualizationFilters } from '../../../components/visualization-toolbar/visualization-toolbar';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { DataLoaderService } from '@/app/services/data-loader/data-loader-service';
import { useEffect, useMemo } from 'react';
import { normalizeAsKey } from '@/models/normalize';
import { Filter } from '@/app/services/data-loader/data-loader-interface';

export default function InterProvincePageContent() {
  const [activeDataset, setActiveDataset] = React.useState(moveInSampleDataset);
  const [dataType, setDataType] = React.useState<'moveIn' | 'moveOut' | 'net'>('moveIn');
  const [selectedProvinces, setSelectedProvinces] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);
  
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
  
  const handleVisualize = async (filters: VisualizationFilters) => {

    setIsLoading(true);

    const appliedFilters: Filter[] = [];
    setSelectedProvinces(filters.provinces.map(province => province.id));
    setDataType(filters.dataType);
    
    // Set the active dataset based on the data type
    if (filters.dataType === 'moveIn') {
      setActiveDataset(moveInSampleDataset);
    } else if (filters.dataType === 'moveOut') {

      // const dataloaderService = new DataLoaderService();
      const migrationProcessor = new MigrationDataProcessor();
      await migrationProcessor.loadDataset('/Jan20-Dec20_sparse.json');
      if (onDataLoaded) {
        const data = await migrationProcessor.applyFilters(appliedFilters)
        onDataLoaded(data);
      }
    } else {
      // // For 'net', you would need to calculate the difference
      // // This is a simplified example
      // const netDataset = moveInSampleDataset.map((item, index) => {
      //   const moveOut = moveOutSampleDataset[index];
      //   const netItem: any = { month: item.month };
        
      //   Object.keys(item).forEach(key => {
      //     if (key !== 'month') {
      //       netItem[key] = (item as any)[key] - (moveOut as any)[key];
      //     }
      //   });
        
      //   return netItem;
      // });
      
      // setActiveDataset(netDataset);
    }
    
    // In a real app, you might fetch data from an API based on filters
    console.log('Visualization requested with filters:', filters);
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
        />
      </Box>
      <Box sx={{ width: '100%' }}>
        {(isEmpty && isLoading) && (
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            Loading...
          </Typography>
        )}
      {(isEmpty && isLoading === false) && (
        <>
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            Please select a dataset to visualize.
          </Typography>
        </>
        )}

        {isEmpty === false && (
        <>
          <Typography variant="h4" sx={{ marginBottom: 2 }}>
            {dataType === 'moveIn' ? 'Move In' : 
            dataType === 'moveOut' ? 'Move Out' : 'Net Migration'}
          </Typography>
          <BarChart
            dataset={activeDataset}
            xAxis={[{ scaleType: 'band', dataKey: 'month' }]}
            series={getFilteredSeries}
            {...chartSetting}
          />
          <Typography variant="h6" sx={{ marginTop: 2, marginBottom: 2 }}>
            Analysis of Thailand&apos;s Inter-Province Migration Patterns
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            The most striking pattern in Thailand&apos;s migration data is the consistent dominance of Bangkok as the primary destination for internal migrants, with monthly inflows consistently exceeding 3,000 people and peaking at nearly 3,700 in March and December. Industrial provinces like Samut Prakan and Chon Buri maintain steady inflows between 1,500-2,000 people monthly, highlighting the economic pull of Thailand&apos;s Eastern Economic Corridor development zone. Rayong and Chachoengsao, also industrial provinces, show moderate but stable migration patterns with monthly inflows around 1,000-1,400 people.
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            In stark contrast, agricultural provinces like Nakhon Sawan and Chiang Mai experience significantly lower inflows, typically below 700 people per month, reflecting the ongoing rural-to-urban migration trend. Seasonal patterns are evident with higher migration to industrial areas during the dry season (November-March) and reduced movement during the rainy season (July-August) when agricultural work increases. This visualization clearly illustrates Thailand&apos;s urbanization challenge, as people consistently move from agricultural regions to industrial centers seeking better economic opportunities, potentially creating labor shortages in food production areas while increasing population density in already crowded urban centers.
          </Typography>
        </>
        )}
        
      </Box>
    </Box>
  );
}