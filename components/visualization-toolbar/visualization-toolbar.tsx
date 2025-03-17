'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  SelectChangeEvent, 
  Typography,
  Divider,
  useTheme
} from '@mui/material';
import { 
  ChartBar } from '@phosphor-icons/react/dist/ssr';
import { RestoreOutlined } from '@mui/icons-material';

import ProvinceFilter from './province-filter';
import DateTimePeriodFilter from './datetime-period-filter';
import DatasetSelector from '../dataset-selector/dataset-selector';
import SubactionsSelector from './subactions-selector';
import VisualizationSelector from './visualization-selector';
import { useAppDispatch, useAppSelector, usePersistStore } from '@/app/store/hooks';
import { resetDataset } from '@/app/store/features/datasetSlice';
import { Province } from '@/models/province-district-subdistrict';

interface VisualizationToolbarProps {
  onVisualize: (filters: VisualizationFilters) => void;
  onFileUpload?: (file: File) => void;
  onDatasetSelect?: (datasetId: string) => void;
  darkMode?: boolean;
  userSubscription?: 'free' | 'premium';  // New prop
}

export interface VisualizationFilters {
  provinces: Province[];
  timePeriod: string;
  startDate?: string;
  endDate?: string;
  visualizationType: string;
  dataType: 'moveIn' | 'moveOut' | 'net';
  datasetId: string;
}

const VisualizationToolbar: React.FC<VisualizationToolbarProps> = ({
  onVisualize,
  onFileUpload,
  onDatasetSelect,
  darkMode = true,
  userSubscription = 'free'  // Default to free
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { clearPersistedData } = usePersistStore();
  const { datasetId, timePeriod, dateRange, provinces } = useAppSelector(state => state.dataset);
  const { startDate, endDate } = dateRange;
  
  const [filters, setFilters] = useState<VisualizationFilters>({
    provinces: provinces,
    timePeriod: timePeriod,
    startDate: startDate,
    endDate: endDate,
    visualizationType: 'barChart',
    dataType: 'moveIn',
    datasetId: datasetId
  });
  const [isDirty, setIsDirty] = useState(false);

  // Update local state when Redux state changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      provinces,
      timePeriod,
      startDate,
      endDate,
      datasetId
    }));
  }, [provinces, timePeriod, startDate, endDate, datasetId]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (type: string) => {
    setFilters(filters => ({
      ...filters,
      visualizationType: type,
    }));
    setIsDirty(true);
  };
  
  // Handle data type change
  const handleDataTypeChange = (type: 'moveIn' | 'moveOut' | 'net') => {
    setFilters(filters => ({
      ...filters,
      dataType: type,
    }));
    setIsDirty(true);
  };
  
  // Handle visualization request
  const handleVisualize = () => {
    // Get the latest values from Redux for time-related fields
    const updatedFilters = {
      ...filters,
      provinces,
      timePeriod,
      startDate,
      endDate,
      datasetId
    };
    onVisualize(updatedFilters);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setIsDirty(false);
    // Reset Redux state and clear persisted data
    dispatch(resetDataset());
    
    // Reset local state
    setFilters({
      provinces: [],
      timePeriod: 'lastYear',
      visualizationType: 'barChart',
      dataType: 'moveIn',
      datasetId: 'default'
    });
  };
  
  // Clear all persisted data
  const handleClearPersistedData = () => {
    clearPersistedData();
    setIsDirty(false);
    
    // Reset local state
    setFilters({
      provinces: [],
      timePeriod: 'lastYear',
      visualizationType: 'barChart',
      dataType: 'moveIn',
      datasetId: 'default'
    });
  };

  // Handle file upload from DatasetSelector
  const handleFileUpload = (file: File) => {
    setIsDirty(true);
    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  // Handle dataset selection from DatasetSelector
  const handleDatasetSelect = (selectedDatasetId: string) => {
    setIsDirty(true);
    if (onDatasetSelect) {
      onDatasetSelect(selectedDatasetId);
    }
  };

  // Handle province change
  const handleProvinceChange = (selectedProvinces: string[]) => {
    setIsDirty(true);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
        color: darkMode ? '#fff' : 'text.primary',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Data Source Controls
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <DatasetSelector 
          darkMode={darkMode} 
          userSubscription={userSubscription}
          onFileUpload={handleFileUpload}
          onDatasetSelect={handleDatasetSelect}
        />
        <ProvinceFilter 
          darkMode={darkMode} 
          onProvinceChange={handleProvinceChange}
        />
        <DateTimePeriodFilter 
          darkMode={darkMode} 
          onTimePeriodChange={(value) => setIsDirty(true)}
          onDateChange={(field, value) => setIsDirty(true)}
        />
      </Box>
      
      <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, md: 0 } }}>
          <SubactionsSelector selectedSubAction={filters.dataType} darkMode={darkMode} handleSubActionChange={handleDataTypeChange} />
          <VisualizationSelector filters={filters} darkMode={darkMode} handleVisualizationTypeChange={handleVisualizationTypeChange} />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreOutlined />}
            onClick={clearFilters}
            sx={{ minWidth: 120 }}
            disabled={!isDirty}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<ChartBar />}
            onClick={handleVisualize}
            sx={{ minWidth: 120 }}
          >
            Visualize
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default VisualizationToolbar; 