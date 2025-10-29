'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert } from '@mui/material';
import { 
  ChartBar } from '@phosphor-icons/react/dist/ssr';
import { RestoreOutlined } from '@mui/icons-material';

import ProvinceFilterUI from './province-filter';
import DatasetInput from './dataset/dataset-input';
import SubactionsSelector from './subactions-selector';
import VisualizationSelector from './visualization-selector';
import DateTimePeriodFilter from './datetime-period';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { resetDataset } from '@/app/store/features/datasetSlice';
import { Province } from '@/models/province-district-subdistrict';
import { DatasetMetadata, DATASETS } from '@/models/datasets';
import { datasetSelector } from '@/app/store/dataset/selector';
import { DateTimeFilter, ProvinceFilter, SubactionFilter } from '@/app/services/data-loader/data-loader-interface';
import { Subaction, VISUALIZATION_TYPES, VisualizationMethod } from './types';
import LoadingToolbar from './loading-toolbar';
import CollapsedToolbar from './collapsed-toolbar';
import { 
  toolbarReducer, 
  VisualizationFilters, 
  setProvinces, 
  setTimePeriod, 
  setVisualizationType, 
  setSubaction, 
  setDatasetId, 
  setDatasetMetadata, 
  updateFiltersFromRedux, 
  resetFilters as resetToolbarFilters,
  setLoading,
  toggleCollapse,
  setSupportedVisualizationTypes
} from './state';
import { Presentation } from '@phosphor-icons/react';

interface VisualizationToolbarProps {
  onVisualize: (filters: VisualizationFilters) => void;
  onFileUpload?: (file: File) => void;
  onDatasetSelect?: (datasetId: string) => void;
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

  /**
   * Allows the page to specify which datasets are allowed to be selected for that page content.
   */
  datasetsAllowed?: string[];

  /**
   * Maximum number of locations that can be selected. If not provided, uses default from constraints.
   */
  maxLocations?: number;
}

const VisualizationToolbar: React.FC<VisualizationToolbarProps> = ({
  onVisualize,
  onFileUpload,
  onDatasetSelect,
  darkMode = true,
  userSubscription = 'free',
  subActionsAllowed,
  visualizationTypesAllowed,
  initialFilters,
  datasetsAllowed,
  maxLocations
}) => {
  
  const reduxDispatch = useAppDispatch();
  const { datasetId: reduxDatasetId, timePeriod, dateRange, filters: reduxFilters, isLoading: reduxLoading = false } = useAppSelector(datasetSelector);
  
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
  // Extract dateTimeFilter from reduxFilters
  const dateTimeFilter = useMemo(() => (reduxFilters.find(filter => filter.type === 'datetime') as DateTimeFilter ?? null), [reduxFilters]);

  const title = "Data Source Controls";

  

  // Initialize state with reducer
  const initialState = {
    filters: {
      provinces: initialFilters?.provinces ?? reduxProvinceFilters,
      timePeriod: initialFilters?.timePeriod ?? timePeriod,
      startDate: initialFilters?.startDate ?? start_date,
      endDate: initialFilters?.endDate ?? end_date,
      visualizationType: initialFilters?.visualizationType ?? 'bar',
      dataType: initialFilters?.dataType ?? 'movein',
      datasetId: initialFilters?.datasetId ?? reduxDatasetId,
      subaction: initialFilters?.subaction ?? (subActionFilter.subaction as Subaction || 'movein')
    },
    datasetMetadata: null,
    supportedVisualizations: [],
    isDirty: false,
    isLoading: true,
    isCollapsed: false
  };

  const [state, toolbarDispatch] = useReducer(toolbarReducer, initialState);
  
  // Add state for alert dialog
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  

  // Update local state when Redux state changes
  useEffect(() => {
    console.log("updating filters because some redux state changed; provinces, timePeriod, startDate, endDate, datasetId", reduxProvinceFilters, timePeriod, start_date, end_date, reduxDatasetId);
    toolbarDispatch(updateFiltersFromRedux(
      reduxProvinceFilters,
      timePeriod,
      start_date,
      end_date,
      reduxDatasetId
    ));
  }, [reduxProvinceFilters, timePeriod, start_date, end_date, reduxDatasetId]);

  // Update loading state based on Redux loading state
  useEffect(() => {
    toolbarDispatch(setLoading(reduxLoading));
  }, [reduxLoading]);
  
  // Handle dataset metadata updates based on dataset ID
  useEffect(() => {
    const datasetId = state.filters.datasetId;

    console.log("updating dataset metadata because datasetId changed; datasetId", datasetId);

    const dataset = DATASETS.find(d => d.id === datasetId);

    if (dataset) {
      const metadata = dataset.metadata;
      if (metadata) {
        console.log("updating dataset metadata; metadata", metadata);
        toolbarDispatch(setDatasetMetadata(metadata));
        
        // Convert string visualization types to VisualizationType objects
        const supportedVizTypes = metadata?.supported_visualization_types ?? [];
        const mappedVisualizations = VISUALIZATION_TYPES.filter(vizType => 
        {
          const isSupported = supportedVizTypes.includes(vizType.id as any);
          const isAllowed = visualizationTypesAllowed ? visualizationTypesAllowed.includes(vizType.id as VisualizationMethod) : true;
          return isSupported && isAllowed;
        }
        );
        
        toolbarDispatch(setSupportedVisualizationTypes(mappedVisualizations));
      }
    }
  }, [state.filters.datasetId, visualizationTypesAllowed]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationMethod) => {
    console.log("handling visualization type change; updating visualizationType", type);
    toolbarDispatch(setVisualizationType(type));
  };
  
  // Handle data type change
  const handleSubActionChange = (subAction: Subaction) => {
    console.log("handling subaction change; updating subaction", subAction);
    toolbarDispatch(setSubaction(subAction));
  };

  const handleDateTimeChange = (filter: DateTimeFilter) => {
    console.log("handling date time change; updating startDate and endDate", filter);
    toolbarDispatch(setTimePeriod(
      filter.time_period,
      filter.start_date,
      filter.end_date
    ));
  };
  
  // Toggle presentation mode
  const handleTogglePresentationMode = () => {
    toolbarDispatch(toggleCollapse(!state.isCollapsed));
  };

  // Exit presentation mode
  const handleExitPresentationMode = () => {
    toolbarDispatch(toggleCollapse(false));
  };

  // Handle visualization request
  const handleVisualize = async () => {
    // Validate all required fields
    let errorMessage = '';
    
    if (!state.filters.datasetId) {
      errorMessage = 'Please select a dataset first.';
    } else if (!state.filters.subaction) {
      errorMessage = 'Please select a subaction first.';
    } else if (!state.filters.visualizationType) {
      errorMessage = 'Please select a visualization type first.';
    } else if (!state.filters.startDate || !state.filters.endDate) {
      errorMessage = 'Please select a date range first.';
    } else if (state.filters.provinces.length === 0) {
      errorMessage = 'Please select at least one province.';
    }
    
    if (errorMessage) {
      console.error("Validation failed:", errorMessage);
      setAlertMessage(errorMessage);
      setAlertOpen(true);
      return;
    }

    // Enter presentation mode after visualization
    // toolbarDispatch(toggleCollapse(true));
    onVisualize(state.filters);
  };
  
  // Handle alert close
  const handleAlertClose = () => {
    setAlertOpen(false);
  };
  
  // Clear all filters
  const clearFilters = () => {
    // Reset Redux state and clear persisted data
    reduxDispatch(resetDataset());
    
    // Reset local state
    toolbarDispatch(resetToolbarFilters());
  };
  
  // Handle file upload from DatasetSelector
  const handleFileUpload = (file: File) => {
    if (onFileUpload) {
      onFileUpload(file);
    }
  };

  // Handle dataset selection from DatasetSelector
  const handleDatasetSelect = (selectedDatasetId: string) => {
    toolbarDispatch(resetToolbarFilters());
    toolbarDispatch(setDatasetId(selectedDatasetId));
    
    if (onDatasetSelect) {
      onDatasetSelect(selectedDatasetId);
    }
  };

  // Handle province change
  const handleProvinceChange = (selectedProvinces: string[]) => {
    const provinces = selectedProvinces.map(province => ({
      id: province.toLowerCase(),
      name: province,
      category: 'province'
    }));
    
    toolbarDispatch(setProvinces(provinces));
  };

  // Toggle collapse state
  const handleToggleCollapse = () => {
    toolbarDispatch(toggleCollapse(!state.isCollapsed));
  };

  // Handle expand from collapsed view
  const handleExpand = () => {
    toolbarDispatch(toggleCollapse(false));
  };

  useEffect(() => {
    console.log("Active filters", state.filters);
  }, [state.filters]);

  const subActionOptions : { label: string; value: Subaction }[] = 
  state.datasetMetadata?.subactions.map(subaction => ({
    label: subaction.label,
    value: subaction.subaction as Subaction
  })).filter(option => subActionsAllowed ? subActionsAllowed.includes(option.value) : true) ?? [];
  
  if (state.isLoading) {
    return <LoadingToolbar darkMode={darkMode} isLoading={state.isLoading} toolbarTitle={title} />;
  }

  // Render presentation mode if isCollapsed is true
  if (state.isCollapsed) {
    return (
      <CollapsedToolbar 
        filters={state.filters}
        darkMode={darkMode}
        onExpand={handleExitPresentationMode}
        visualizationTitle={title}
      />
    );
  }

  // Render expanded toolbar
  return (
    <>
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
            {title}
          </Typography>
          <Tooltip title="Enter presentation mode">
            <IconButton 
              size="small" 
              onClick={handleTogglePresentationMode}
              sx={{ color: 'primary.main' }}
            >
              <Presentation />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <DatasetInput 
            datasetId={state.filters.datasetId}
            darkMode={darkMode} 
            userSubscription={userSubscription}
            onFileUpload={handleFileUpload}
            onDatasetSelect={handleDatasetSelect}
            datasetsAllowed={datasetsAllowed}
          />
          {
            state.filters.datasetId && (
              <>
                <ProvinceFilterUI 
                  darkMode={darkMode} 
                  onProvinceChange={handleProvinceChange}
                  provinceFilter={provinceFilter}
                  maxLocations={maxLocations}
                />
                <DateTimePeriodFilter 
                  darkMode={darkMode} 
                  onFilterChange={handleDateTimeChange}
                  datasetMetadata={state.datasetMetadata || null}
                  selectedDateTimeFilter={dateTimeFilter}
                />
              </>
            )
          }
        </Box>
        
        <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, md: 0 } }}>
            <SubactionsSelector 
              selectedSubAction={state.filters.subaction} 
              darkMode={darkMode} 
              handleSubActionChange={handleSubActionChange} 
              subActionOptions={subActionOptions} 
            />
            <VisualizationSelector 
              filters={state.filters} 
              darkMode={darkMode} 
              handleVisualizationTypeChange={handleVisualizationTypeChange}
              supportedVisualizations={state.supportedVisualizations}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RestoreOutlined />}
              onClick={clearFilters}
              sx={{ minWidth: 120 }}
              disabled={!state.isDirty}
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
      
      {/* Alert Dialog */}
      <Dialog
        open={alertOpen}
        onClose={handleAlertClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{ zIndex: 1300, padding: 2 }}
      >
        <DialogTitle id="alert-dialog-title">
          {"Action Required"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAlertClose} color="primary" variant="contained" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VisualizationToolbar; 