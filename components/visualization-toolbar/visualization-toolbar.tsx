'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  OutlinedInput, 
  Paper, 
  Select, 
  SelectChangeEvent, 
  TextField, 
  Typography,
  IconButton,
  Tooltip,
  Divider,
  useTheme
} from '@mui/material';
import { 
  UploadSimple, 
  ChartBar, 
  MapPin,
  X,
  CaretDown,
  Database } from '@phosphor-icons/react/dist/ssr';

// Define available provinces
const PROVINCES = [
  // Industrial provinces
  { id: 'bangkok', name: 'Bangkok', category: 'industrial' },
  { id: 'samutPrakan', name: 'Samut Prakan', category: 'industrial' },
  { id: 'chonBuri', name: 'Chon Buri', category: 'industrial' },
  { id: 'rayong', name: 'Rayong', category: 'industrial' },
  { id: 'chachoengsao', name: 'Chachoengsao', category: 'industrial' },
  
  // Agricultural provinces
  { id: 'nakhonSawan', name: 'Nakhon Sawan', category: 'agricultural' },
  { id: 'chiangMai', name: 'Chiang Mai', category: 'agricultural' }
];

// Define time periods
const TIME_PERIODS = [
  { id: 'last3Months', name: 'Last 3 Months' },
  { id: 'last6Months', name: 'Last 6 Months' },
  { id: 'lastYear', name: 'Last Year' },
  { id: 'custom', name: 'Custom Range' }
];

// Define visualization types
const VISUALIZATION_TYPES = [
  { id: 'barChart', name: 'Bar Chart', icon: <ChartBar size={20} /> },
  { id: 'map', name: 'Map View', icon: <MapPin size={20} /> }
];

// Define available datasets with subscription levels
const DATASETS = [
  // Free datasets
  { id: 'migration2020', name: 'Migration Data', subscription: 'free' },
  { id: 'migration2021', name: 'Device Migration Data', subscription: 'free' },
  { id: 'migration2023', name: 'Tourism Migration Data', subscription: 'free' },
  
  // Premium datasets
  { id: 'migration2022', name: 'Migration Data 2022', subscription: 'premium' },
  { id: 'industryShift', name: 'Industry Shift Analysis', subscription: 'premium' },
  { id: 'sectoralTrends', name: 'Sectoral Trends 2022', subscription: 'premium' },
  
  // Custom upload (always available)
  { id: 'custom', name: 'Custom Upload', subscription: 'free' }
];

interface VisualizationToolbarProps {
  onVisualize: (filters: VisualizationFilters) => void;
  onFileUpload?: (file: File) => void;
  onDatasetSelect?: (datasetId: string) => void;
  darkMode?: boolean;
  userSubscription?: 'free' | 'premium';  // New prop
}

export interface VisualizationFilters {
  provinces: string[];
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
  const [file, setFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<VisualizationFilters>({
    provinces: [],
    timePeriod: 'lastYear',
    visualizationType: 'barChart',
    dataType: 'moveIn',
    datasetId: userSubscription === 'premium' ? 'migration2022' : 'migration2020'
  });
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  
  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const uploadedFile = event.target.files[0];
      setFile(uploadedFile);
      // Set dataset to custom when a file is uploaded
      setFilters({
        ...filters,
        datasetId: 'custom'
      });
      setIsCustomUpload(true);
      if (onFileUpload) {
        onFileUpload(uploadedFile);
      }
    }
  };
  
  // Handle dataset selection
  const handleDatasetChange = (event: SelectChangeEvent) => {
    const datasetId = event.target.value;
    setFilters({
      ...filters,
      datasetId
    });
    setIsCustomUpload(datasetId === 'custom');
    
    if (datasetId !== 'custom') {
      setFile(null);
      if (onDatasetSelect) {
        onDatasetSelect(datasetId);
      }
    }
  };
  
  // Handle province selection
  const handleProvinceChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFilters({
      ...filters,
      provinces: typeof value === 'string' ? value.split(',') : value,
    });
  };
  
  // Handle time period selection
  const handleTimePeriodChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters({
      ...filters,
      timePeriod: value,
    });
    setShowCustomDateRange(value === 'custom');
  };
  
  // Handle date range changes
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (type: string) => {
    setFilters({
      ...filters,
      visualizationType: type,
    });
  };
  
  // Handle data type change
  const handleDataTypeChange = (type: 'moveIn' | 'moveOut' | 'net') => {
    setFilters({
      ...filters,
      dataType: type,
    });
  };
  
  // Handle visualization request
  const handleVisualize = () => {
    onVisualize(filters);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      provinces: [],
      timePeriod: 'lastYear',
      visualizationType: 'barChart',
      dataType: 'moveIn',
      datasetId: userSubscription === 'premium' ? 'migration2022' : 'migration2020'
    });
    setShowCustomDateRange(false);
    setIsCustomUpload(false);
    setFile(null);
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
        <Tooltip title="Clear all filters">
          <IconButton 
            size="small" 
            onClick={clearFilters}
            sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
          >
            <X size={18} />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {/* Dataset Selection with subscription groups */}
        <FormControl 
          sx={{ 
            minWidth: 200,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
            },
            '.MuiInputLabel-root': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            },
            '.MuiSelect-icon': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            }
          }}
        >
          <InputLabel id="dataset-select-label" sx={{ color: darkMode ? '#fff' : undefined }}>
            Dataset
          </InputLabel>
          <Select
            labelId="dataset-select-label"
            value={filters.datasetId}
            onChange={handleDatasetChange}
            label="Dataset"
            IconComponent={CaretDown}
            startAdornment={<Database size={18} style={{ marginRight: 8, opacity: 0.7 }} />}
            sx={{ color: darkMode ? '#fff' : undefined }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
                }
              },
              sx: {
                '& .Mui-disabled': {
                  opacity: 1
                }
              }
            }}
          >
            <MenuItem disabled>
              <Typography variant="caption" fontWeight="bold">
                Included in Your Subscription
              </Typography>
            </MenuItem>
            {DATASETS.filter(d => d.subscription === 'free').map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.name}
              </MenuItem>
            ))}
            
            <MenuItem disabled sx={{ 
              mt: 1,
              backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
              padding: '8px 16px'
            }}>
              <Typography variant="caption" fontWeight="bold">
                Premium Subscription
              </Typography>
            </MenuItem>
            {DATASETS.filter(d => d.subscription === 'premium').map((dataset) => (
              <MenuItem 
                key={dataset.id} 
                value={dataset.id}
                disabled={userSubscription !== 'premium'}
                sx={{
                  backgroundColor: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
                  '&.Mui-disabled': {
                    color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.7)',
                    opacity: 1,
                    fontWeight: 'normal'
                  }
                }}
              >
                {dataset.name} 
                {userSubscription !== 'premium' && (
                  <Box component="span" sx={{ 
                    ml: 1,
                    color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                  }}>
                    🔒
                  </Box>
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* File Upload - only shown when custom dataset is selected */}
        {isCustomUpload && (
          <Box sx={{ minWidth: 200 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadSimple />}
              sx={{ 
                height: '100%',
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
                color: darkMode ? '#fff' : 'inherit'
              }}
            >
              {file ? file.name.substring(0, 15) + '...' : 'Upload Data'}
              <input
                type="file"
                hidden
                accept=".json,.csv"
                onChange={handleFileChange}
              />
            </Button>
          </Box>
        )}
        
        {/* Province Filter */}
        <FormControl 
          sx={{ 
            minWidth: 200, 
            maxWidth: 400,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
            },
            '.MuiInputLabel-root': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            },
            '.MuiSelect-icon': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            }
          }}
        >
          <InputLabel id="province-select-label" sx={{ color: darkMode ? '#fff' : undefined }}>
            Filter by Province
          </InputLabel>
          <Select
            labelId="province-select-label"
            multiple
            value={filters.provinces}
            onChange={handleProvinceChange}
            input={<OutlinedInput label="Provinces" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const province = PROVINCES.find(p => p.id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={province?.name} 
                      size="small"
                      sx={{ 
                        bgcolor: province?.category === 'industrial' ? 
                          'primary.main' : 'success.main',
                        color: '#fff'
                      }}
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 250
                }
              }
            }}
            sx={{ color: darkMode ? '#fff' : undefined }}
          >
            <MenuItem disabled value="">
              <em>Select provinces</em>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" fontWeight="bold">
                Industrial Provinces
              </Typography>
            </MenuItem>
            {PROVINCES.filter(p => p.category === 'industrial').map((province) => (
              <MenuItem key={province.id} value={province.id}>
                {province.name}
              </MenuItem>
            ))}
            <MenuItem disabled>
              <Typography variant="caption" fontWeight="bold">
                Agricultural Provinces
              </Typography>
            </MenuItem>
            {PROVINCES.filter(p => p.category === 'agricultural').map((province) => (
              <MenuItem key={province.id} value={province.id}>
                {province.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Time Period Filter */}
        <FormControl 
          sx={{ 
            minWidth: 150,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
            },
            '.MuiInputLabel-root': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            },
            '.MuiSelect-icon': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            }
          }}
        >
          <InputLabel id="time-period-label" sx={{ color: darkMode ? '#fff' : undefined }}>
            Time Period
          </InputLabel>
          <Select
            labelId="time-period-label"
            value={filters.timePeriod}
            onChange={handleTimePeriodChange}
            label="Time Period"
            IconComponent={CaretDown}
            sx={{ color: darkMode ? '#fff' : undefined }}
          >
            {TIME_PERIODS.map((period) => (
              <MenuItem key={period.id} value={period.id}>
                {period.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Custom Date Range */}
        {showCustomDateRange && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={filters.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ 
                width: 150,
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
                },
                '.MuiInputLabel-root': {
                  color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
                },
                input: {
                  color: darkMode ? '#fff' : undefined
                }
              }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={filters.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ 
                width: 150,
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
                },
                '.MuiInputLabel-root': {
                  color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
                },
                input: {
                  color: darkMode ? '#fff' : undefined
                }
              }}
            />
          </Box>
        )}
      </Box>
      
      <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: { xs: 2, md: 0 } }}>
          {/* Data Type Selection */}
          <Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden' }}>
            <Button
              variant={filters.dataType === 'moveIn' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleDataTypeChange('moveIn')}
              sx={{ 
                borderRadius: '4px 0 0 4px',
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: filters.dataType !== 'moveIn' && darkMode ? '#fff' : undefined
              }}
            >
              Move In
            </Button>
            <Button
              variant={filters.dataType === 'moveOut' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleDataTypeChange('moveOut')}
              sx={{ 
                borderRadius: 0,
                borderLeft: 0,
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: filters.dataType !== 'moveOut' && darkMode ? '#fff' : undefined
              }}
            >
              Move Out
            </Button>
            <Button
              variant={filters.dataType === 'net' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleDataTypeChange('net')}
              sx={{ 
                borderRadius: '0 4px 4px 0',
                borderLeft: 0,
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: filters.dataType !== 'net' && darkMode ? '#fff' : undefined
              }}
            >
              Net
            </Button>
          </Box>
          
          {/* Visualization Type Selection */}
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {VISUALIZATION_TYPES.map((type) => (
              <Tooltip key={type.id} title={type.name}>
                <IconButton
                  color={filters.visualizationType === type.id ? 'primary' : 'default'}
                  onClick={() => handleVisualizationTypeChange(type.id)}
                  sx={{ 
                    bgcolor: filters.visualizationType === type.id ? 
                      (darkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)') : 
                      'transparent',
                    color: darkMode && filters.visualizationType !== type.id ? 
                      'rgba(255,255,255,0.7)' : undefined
                  }}
                >
                  {type.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
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