'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { axisClasses } from '@mui/x-charts';
import moveInSampleDataset from '../../../public/move-in-sample-dataset.json';
import moveOutSampleDataset from '../../../public/move-out-sample-dataset.json';
import MigrationContent from '../migration/migration-content';
import VisualizationToolbar, { VisualizationFilters } from '@/components/visualization-toolbar/visualization-toolbar';

function valueFormatter(value: number | null) {
	return `${value}mm`;
  }
  
export default function IntraProvincePageContent() {
	const [activeDataset, setActiveDataset] = React.useState(moveInSampleDataset);
	const [dataType, setDataType] = React.useState<'moveIn' | 'moveOut' | 'net'>('moveIn');
	const [selectedProvinces, setSelectedProvinces] = React.useState<string[]>([]);
	

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
  

  const handleVisualize = (filters: VisualizationFilters) => {
    setSelectedProvinces(filters.provinces);
    setDataType(filters.dataType);
    
    // Set the active dataset based on the data type
    if (filters.dataType === 'moveIn') {
      setActiveDataset(moveInSampleDataset);
    } else if (filters.dataType === 'moveOut') {
      setActiveDataset(moveOutSampleDataset);
    } else {
      // For 'net', you would need to calculate the difference
      // This is a simplified example
      const netDataset = moveInSampleDataset.map((item, index) => {
        const moveOut = moveOutSampleDataset[index];
        const netItem: any = { month: item.month };
        
        Object.keys(item).forEach(key => {
          if (key !== 'month') {
            netItem[key] = (item as any)[key] - (moveOut as any)[key];
          }
        });
        
        return netItem;
      });
      
      setActiveDataset(netDataset);
    }
    
    // In a real app, you might fetch data from an API based on filters
    console.log('Visualization requested with filters:', filters);
  };
  
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