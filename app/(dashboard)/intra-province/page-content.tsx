'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { axisClasses } from '@mui/x-charts';
import moveInSampleDataset from '../../../public/move-in-sample-dataset.json';
import moveOutSampleDataset from '../../../public/move-out-sample-dataset.json';
import MigrationContent from '../migration/migration-content';
import VisualizationToolbar, { VisualizationFilters } from '@/components/visualization-toolbar/visualization-toolbar';
import { Subaction } from '@/components/visualization-toolbar/types';
import { Filter } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';

function valueFormatter(value: number | null) {
	return `${value}mm`;
  }
  
export default function IntraProvincePageContent() {
	const [activeDataset, setActiveDataset] = React.useState(moveInSampleDataset);
  const [subAction, setSubAction] = React.useState<Subaction>('movein');
  const [selectedProvinces, setSelectedProvinces] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);
  

const chartSetting = {
	yAxis: [
	  {
		label: 'rainfall (mm)',
	  },
	],
	width: 1000,
	height: 500,
	sx: {
	  [`.${axisClasses.left} .${axisClasses.label}`]: {
		transform: 'translate(-20px, 0)',
	  },
	},
  };
  

  const handleVisualize = async (filters: VisualizationFilters) => {

    setIsLoading(true);

    const appliedFilters: Filter[] = transformFilter(filters);
    setSelectedProvinces(filters.provinces.map(province => province.id));
    setSubAction(filters.subaction as 'movein' | 'moveout' | 'net');

    // const dataloaderService = new DataLoaderService();
    const migrationProcessor = new MigrationDataProcessor();
    await migrationProcessor.loadDataset('/Jan20-Dec20_sparse.json');
    if (onDataLoaded) {
      const data = await migrationProcessor.applyFilters(appliedFilters)
      onDataLoaded(data);
    }
    
    // In a real app, you might fetch data from an API based on filters
    console.log('Visualization requested with filters:', filters);
  };
  
  const onDataLoaded = (data: any) => {
    console.log(data);
    setActiveDataset(data);
    setIsLoading(false);
    setIsEmpty(false);
  }
  
  const handleFileUpload = (file: File) => {
    // In a real app, you would process the uploaded file
    console.log('File uploaded:', file.name);
  };

  // Filter series based on selected provinces
  const getFilteredSeries = () => {
    const allSeries = [
      { dataKey: 'bangkok', label: 'Bangkok', valueFormatter },
      { dataKey: 'samutPrakan', label: 'Samut Prakan', valueFormatter },
      { dataKey: 'chonBuri', label: 'Chon Buri', valueFormatter },
      { dataKey: 'rayong', label: 'Rayong', valueFormatter },
      { dataKey: 'chachoengsao', label: 'Chachoengsao', valueFormatter },
      { dataKey: 'nakhonSawan', label: 'Nakhon Sawan', valueFormatter },
      { dataKey: 'chiangMai', label: 'Chiang Mai', valueFormatter },
    ];
    
    if (selectedProvinces.length === 0) {
      return allSeries;
    }
    
    return allSeries.filter(series => 
      selectedProvinces.includes(series.dataKey)
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
		<Box sx={{ width: '100%' }}>
        <VisualizationToolbar 
          onVisualize={handleVisualize}
          onFileUpload={handleFileUpload}
          darkMode={true}
        />
      </Box>
		<MigrationContent />
	</Box>
  );
}