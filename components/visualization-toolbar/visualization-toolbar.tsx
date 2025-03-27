'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography,
  Divider} from '@mui/material';
import { 
  ChartBar } from '@phosphor-icons/react/dist/ssr';
import { RestoreOutlined } from '@mui/icons-material';

import ProvinceFilterUI from './province-filter';
import DatasetSelector from '../dataset-selector/dataset-selector';
import SubactionsSelector from './subactions-selector';
import VisualizationSelector from './visualization-selector';
import DateTimePeriodFilter from './datetime-period';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { resetDataset } from '@/app/store/features/datasetSlice';
import { Province } from '@/models/province-district-subdistrict';
import { DatasetMetadata } from './dataset/types';
import { datasetSelector } from '@/app/store/dataset/selector';
import { DateTimeFilter, ProvinceFilter, SubactionFilter } from '@/app/services/data-loader/data-loader-interface';
import { Subaction, VISUALIZATION_TYPES, VisualizationMethod, VisualizationType } from './types';
interface VisualizationToolbarProps {
  onVisualize: (filters: VisualizationFilters) => void;
  onFileUpload?: (file: File) => void;
  onDatasetSelect?: (datasetId: string) => void;
  onDataLoaded?: (data: any) => void;
  darkMode?: boolean;
  userSubscription?: 'free' | 'premium';  // New prop

  /**
   * Allows the page to specify initial filters to be applied when the toolbar is mounted.
   */
  initialFilters?: Partial<VisualizationFilters>;

  /**
   * Allows the page to specify which subactions are allowed to be selected for that page content.
   */
  subActionsAllowed?: Subaction[];

  /**
   * Allows the page to specify which visualization types are allowed to be selected for that page content.
   */
  visualizationTypesAllowed?: VisualizationMethod[];
}

export interface VisualizationFilters {
  provinces: Province[];
  timePeriod: string;
  startDate?: string;
  endDate?: string;
  visualizationType: VisualizationMethod;
  dataType: Subaction;
  subaction: Subaction | null;
  datasetId: string | null;
}

const VisualizationToolbar: React.FC<VisualizationToolbarProps> = ({
  onVisualize,
  onFileUpload,
  onDatasetSelect,
  darkMode = true,
  userSubscription = 'free',
  subActionsAllowed,
  visualizationTypesAllowed,
  initialFilters
}) => {
  
  const dispatch = useAppDispatch();
  const { datasetId: reduxDatasetId, timePeriod, dateRange, filters: reduxFilters } = useAppSelector(datasetSelector);
  const [datasetId, setDatasetId] = useState<string|null>(initialFilters?.datasetId ?? null);
  const { start_date, end_date } = dateRange;
  const provinceFilter = useMemo(() => (reduxFilters.find(filter => filter.type === 'province') as ProvinceFilter ?? {
    type: 'province',
    filter_id: 'province-filter',
    province_ids: []
  }), [reduxFilters]);
  const reduxProvinceFilters = useMemo(() => (reduxFilters.find(filter => filter.type === 'province') as ProvinceFilter)?.province_ids.map(id => ({
    id: id,
    name: id,
    category: 'province'
  } as Province)) ?? [], [reduxFilters]);
  const subActionFilter = useMemo(() => (reduxFilters.find(filter => filter.type === 'subaction') as SubactionFilter ?? {
    type: 'subaction',
    filter_id: 'subaction-filter',
    subaction: 'unknown'
  }), [reduxFilters]);

  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null);
  
  
  const [filters, setFilters] = useState<VisualizationFilters>({
    provinces: initialFilters?.provinces ?? reduxProvinceFilters,
    timePeriod: initialFilters?.timePeriod ?? timePeriod,
    startDate: initialFilters?.startDate ?? start_date,
    endDate: initialFilters?.endDate ?? end_date,
    visualizationType: initialFilters?.visualizationType ?? 'bar',
    dataType: initialFilters?.dataType ?? 'movein',
    datasetId: initialFilters?.datasetId ?? datasetId,
    subaction: initialFilters?.subaction ?? null
  });
  const [supportedVisualizations, setSupportedVisualizations] = useState<VisualizationType[]>(() => {

    if (filters.subaction === null) return []

    return VISUALIZATION_TYPES.filter(v => v.supportedSubactions.includes(filters.subaction as Subaction) && (visualizationTypesAllowed ? visualizationTypesAllowed.includes(v.id) : true));
  });
  const [isDirty, setIsDirty] = useState(false);

  // Update local state when Redux state changes
  useEffect(() => {
    console.log("updating filters because some redux state changed; provinces, timePeriod, startDate, endDate, datasetId", reduxProvinceFilters, timePeriod, start_date, end_date, datasetId);
    setFilters(prev => ({
      ...prev,
      provinces: reduxProvinceFilters,
      timePeriod,
      startDate: start_date,
      endDate: end_date,
      datasetId
    }));
  }, [reduxProvinceFilters, timePeriod, start_date, end_date, datasetId]);

  useEffect(() => {
    if (datasetId === null) {
      setDatasetId(reduxDatasetId);
    }
  }, [reduxDatasetId, datasetId]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationMethod) => {
    console.log("handling visualization type change; updating visualizationType", type);
    setFilters(filters => ({
      ...filters,
      visualizationType: type,
    }));
    setIsDirty(true);
    
  };
  
  // Handle data type change
  const handleSubActionChange = (subAction: Subaction) => {
    console.log("handling subaction change; updating subaction", subAction);
    setFilters(filters => ({
      ...filters,
      subaction: subAction,
    }));
    setIsDirty(true);
    setSupportedVisualizations(VISUALIZATION_TYPES.filter(v => v.supportedSubactions.includes(subAction)));
  };

  const handleDateTimeChange = (filter: DateTimeFilter) => {
    console.log("handling date time change; updating startDate and endDate", filter);
    setFilters(filters => ({
      ...filters,
      timePeriod: filter.time_period,
      startDate: filter.start_date,
      endDate: filter.end_date
    }));
    setDatasetMetadata({
      dateTimeFilter: {
        time_period: filter.time_period,
        start_date: filter.start_date,
        end_date: filter.end_date
      }
    } as DatasetMetadata);
    setIsDirty(true);
  };
  
  // Handle visualization request
  const handleVisualize = async () => {
    onVisualize(filters);
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
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: 'default',
      subaction: 'movein'
    });
  };
  
  // Handle file upload from DatasetSelector
  const handleFileUpload = (file: File) => {
    setIsDirty(true);
    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  useEffect(() => {
    switch (datasetId) {
      case 'move-in-sample-dataset':
        default:
        setDatasetMetadata({
          dateTimeFilter: {
            time_period: 'fullYear',
            start_date: '2020-01-01',
            end_date: '2020-12-31'
          }
        } as DatasetMetadata);
        break;
    }
  }, [datasetId]);

  // Handle dataset selection from DatasetSelector
  const handleDatasetSelect = (selectedDatasetId: string) => {
    setIsDirty(true);
    if (onDatasetSelect) {
      setDatasetId(selectedDatasetId);
      onDatasetSelect(selectedDatasetId);
    }
  };

  // Handle province change
  const handleProvinceChange = (selectedProvinces: string[]) => {
    setFilters({
      provinces: selectedProvinces.map(province => ({
        id: province.toLowerCase(),
        name: province,
        category: 'province'
      })),
      timePeriod: datasetMetadata?.dateTimeFilter?.time_period ?? 'lastYear',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: datasetId,
      subaction: subActionFilter.subaction as Subaction
    });
    setIsDirty(true);
  };

  useEffect(() => {
    console.log("Active filters", filters);
  }, [filters]);

  const subActionOptions : { label: string; value: Subaction }[] = [
    {
      label: 'Move In',
      value: 'movein' as Subaction
    },
    {
      label: 'Move Out',
      value: 'moveout' as Subaction
    },
    {
      label: 'Net',
      value: 'net' as Subaction
    },
    {
      label: 'Overview',
      value: 'raw' as Subaction
    }
  ].filter(option => subActionsAllowed ? subActionsAllowed.includes(option.value as Subaction) : true);
  
  
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
          datasetId={datasetId}
          darkMode={darkMode} 
          userSubscription={userSubscription}
          onFileUpload={handleFileUpload}
          onDatasetSelect={handleDatasetSelect}
        />
        <ProvinceFilterUI 
          darkMode={darkMode} 
          onProvinceChange={handleProvinceChange}
          provinceFilter={provinceFilter}
        />
        <DateTimePeriodFilter 
          darkMode={darkMode} 
          onFilterChange={handleDateTimeChange}
          datasetMetadata={datasetMetadata}
        />
      </Box>
      
      <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, md: 0 } }}>
          <SubactionsSelector 
            selectedSubAction={filters.subaction} 
            darkMode={darkMode} 
            handleSubActionChange={handleSubActionChange} 
            subActionOptions={subActionOptions} 
          />
          <VisualizationSelector 
            filters={filters} 
            darkMode={darkMode} 
            handleVisualizationTypeChange={handleVisualizationTypeChange}
            supportedVisualizations={supportedVisualizations}
          />
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