'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { axisClasses } from '@mui/x-charts';
import moveInSampleDataset from '../../../public/move-in-sample-dataset.json';
import VisualizationToolbar from '../../../components/visualization-toolbar/visualization-toolbar';
import { VisualizationFilters } from '../../../components/visualization-toolbar/state/types';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { useMemo } from 'react';
import { normalizeAsKey } from '@/models/normalize';
import { Filter, DateTimeFilter } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import { useAppSelector } from '@/app/store/hooks';
import { DATASETS } from '@/models/datasets';
import * as dfd from 'danfojs';
import { MoveInDataset, ProvinceMonthlyEntry, getAllProvinceNames } from './types';
import { toJSON } from 'danfojs';

function valueFormatter(value: number | null) {
  return `${value}`;
}

export default function InterProvincePageContent() {
  const [activeDataset, setActiveDataset] = React.useState<MoveInDataset>(moveInSampleDataset as MoveInDataset);
  const [subAction, setSubAction] = React.useState<'movein' | 'moveout' | 'net'>('movein');
  const [selectedProvinces, setSelectedProvinces] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);
  const { themeMode } = useAppSelector(state => state.userPreferences);
  const darkMode = themeMode === 'dark';
  
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
  
  const [datasetName, setDatasetName] = React.useState('');

  const handleVisualize = async (filters: VisualizationFilters) => {
    setIsLoading(true);

    // Log all received filters for debugging
    console.log("Visualization filters received:", filters);

    const appliedFilters: Filter[] = transformFilter(filters);
    // Convert province IDs to lowercase for consistent matching
    setSelectedProvinces(filters.provinces.map(province => normalizeAsKey(province.id)));
    setSubAction(filters.subaction as 'movein' | 'moveout' | 'net');

    // Log the transformed filters to see if date filters were included
    console.log("Transformed filters:", appliedFilters);

    // const dataloaderService = new DataLoaderService();
    const migrationProcessor = new MigrationDataProcessor();
    const datasetId = filters.datasetId;

    const dataset = DATASETS.find(d => d.id === datasetId);
    setDatasetName(dataset?.name ?? '');
    const datasetUri = dataset?.metadata?.uri;
    if (datasetUri) {
      const data = await migrationProcessor.loadDataset(datasetUri);
      if (data) {
        onDataLoaded(data, appliedFilters);
      }
    }
    
    console.log('Selected provinces:', filters.provinces.map(p => p.id));
    console.log('Date range:', {
      timePeriod: filters.timePeriod,
      startDate: filters.startDate,
      endDate: filters.endDate
    });
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
    

    if (!activeDataset.length) return [];
    
    // Get all keys except 'month'
    const provinceKeys = Object.keys(activeDataset[0])
      .filter(key => key !== 'month')
      .map(normalizeAsKey);
    
    // Create series for each province
    const allSeries = provinceKeys.map(key => ({ 
      dataKey: key, 
      label: capitalizeEachWord(key), 
      valueFormatter,
      type: 'bar' as const
    }));
    
    console.log('Available provinces:', provinceKeys);
    console.log('Selected provinces:', selectedProvinces);
      
    if (selectedProvinces.length === 0) {
      return allSeries; // Show all provinces if none selected
    }
    
    // Filter to only include selected provinces
    const filteredSeries = allSeries.filter(series => 
      selectedProvinces.some(province => 
        series.dataKey.toLowerCase() === province.toLowerCase()
      )
    );
    
    console.log('Filtered series:', filteredSeries.map(s => s.dataKey));
    return filteredSeries.length > 0 ? filteredSeries : allSeries;
  }, [selectedProvinces, activeDataset]);

  /**
   * Transform a DataFrame to MoveInDataset
   * In our CSV, rows are provinces and columns are months
   * But our visualization expects rows to be months with provinces as columns
   */
  const transformDataFrameToMoveInDataset = (df: dfd.DataFrame, filters: Filter[]): MoveInDataset => {
    try {
      // Get all columns from the DataFrame
      const columns = df.columns;
      
      // Check if DataFrame has the expected structure
      if (columns.length < 2 || !columns.includes('province')) {
        console.warn('DataFrame does not have the expected structure. First column should be "province".');
        // Return empty dataset if structure is invalid
        return [];
      }
      
      // Extract date range filters
      const dateTimeFilter = filters.find(f => f.type === 'datetime') as DateTimeFilter | undefined;
      const startDateStr = dateTimeFilter?.start_date;
      const endDateStr = dateTimeFilter?.end_date;
      
      // Parse start and end dates if they exist
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      
      console.log('Date filter range:', { startDate, endDate });
      
      // The first column is assumed to be "province" containing province names
      // The rest are month columns (e.g., Jul19, Aug19, etc.)
      const monthColumns = columns.filter(col => col !== "province");
      
      // Filter month columns by date range if applicable
      const filteredMonthColumns = monthColumns.filter(monthCol => {
        // If no date range is provided, include all months
        if (!startDate && !endDate) return true;
        
        // Parse month string like "Jan19" to a Date object
        const parsedDate = parseMonthString(monthCol);
        if (!parsedDate) return true; // Include if parsing fails
        
        // Check if the month is within the date range
        if (startDate && parsedDate < startDate) return false;
        if (endDate && parsedDate > endDate) return false;
        
        return true;
      });
      
      console.log('Filtered months:', filteredMonthColumns);
      
      // Convert DataFrame to array of objects (JSON format)
      const jsonData = toJSON(df, { }) as unknown as Record<string, any>[];
      
      // Create a new entry for each month
      const moveInData: MoveInDataset = filteredMonthColumns.map(month => {
        // Create an initial entry with the month
        const entry: ProvinceMonthlyEntry = {
          month: month
        };
        
        // Add each province's value for this month
        jsonData.forEach(row => {
          const provinceName = row.province;
          if (!provinceName) return; // Skip if province name is missing
          
          // Convert value to number, default to 0 if invalid
          const value = Number(row[month]);
          entry[normalizeAsKey(provinceName)] = isNaN(value) ? 0 : value;
        });
        
        return entry;
      });
      
      return moveInData;
    } catch (error) {
      console.error('Error transforming DataFrame to MoveInDataset:', error);
      return []; // Return empty dataset on error
    }
  };

  /**
   * Parse month string like "Jan19" to a Date object
   * @param monthStr Month string in format "MonYY" 
   * @returns Date object or null if parsing fails
   */
  const parseMonthString = (monthStr: string): Date | null => {
    try {
      // Map of month abbreviations to month numbers (0-indexed)
      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      // Extract month and year parts
      const monthPart = monthStr.substring(0, 3).toLowerCase();
      const yearPart = monthStr.substring(3);
      
      // Get month number and parse year
      const monthNum = monthMap[monthPart];
      // Handle year format (19 → 2019, 20 → 2020, etc.)
      const fullYear = yearPart.length === 2 ? 2000 + parseInt(yearPart) : parseInt(yearPart);
      
      if (isNaN(monthNum) || isNaN(fullYear)) {
        return null;
      }
      
      // Create date for first day of the month
      return new Date(fullYear, monthNum, 1);
    } catch (e) {
      console.warn(`Failed to parse month string: ${monthStr}`, e);
      return null;
    }
  };

  const onDataLoaded = (data: dfd.DataFrame, filters: Filter[]) => {
    // Transform the DataFrame to our expected format
    const transformedData = transformDataFrameToMoveInDataset(data, filters);
    setActiveDataset(transformedData);
    setIsLoading(false);
    setIsEmpty(false);
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        <VisualizationToolbar 
          onVisualize={handleVisualize}
          onFileUpload={handleFileUpload}
          darkMode={darkMode}
          subActionsAllowed={['movein', 'moveout', 'net']}
          initialFilters={{
            subaction: 'movein',
            visualizationType: 'bar'
          }}
          datasetsAllowed={['migration-2019-2021-partial-move-in', 'migration-2019-2021-partial-move-out', 'premium-1', 'premium-2']}
          visualizationTypesAllowed={['bar']}
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
        <Box marginTop={2}>
          <Typography variant="h4" sx={{ marginBottom: 2 }}>
            {datasetName}
          </Typography>
          <BarChart
            dataset={activeDataset}
            xAxis={[{ scaleType: 'band', dataKey: 'month' }]}
            series={getFilteredSeries}
            {...chartSetting}
          />
        </Box>
        )}
      </Box>
    </Box>
  );
}