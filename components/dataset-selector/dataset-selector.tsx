'use client';

import React, { useState } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Typography,
  Button
} from '@mui/material';
import { Database, UploadSimple } from '@phosphor-icons/react';
import { CaretDown } from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setDatasetId } from '@/app/store/features/datasetSlice';

// Define available datasets
const DATASETS = [
  { id: 'default', name: 'Default Dataset', subscription: 'free' },
  { id: 'migration', name: 'Migration Dataset', subscription: 'free' },
  { id: 'industry', name: 'Industry Dataset', subscription: 'free' },
  { id: 'premium-1', name: 'Premium Dataset 1', subscription: 'premium' },
  { id: 'premium-2', name: 'Premium Dataset 2', subscription: 'premium' },
  { id: 'custom', name: 'Custom Upload', subscription: 'free' },
];

interface DatasetSelectorProps {
  darkMode?: boolean;
  userSubscription?: 'free' | 'premium';
  onFileUpload?: (file: File) => void;
  onDatasetSelect?: (datasetId: string) => void;
}

export default function DatasetSelector({ 
  darkMode = false, 
  userSubscription = 'free',
  onFileUpload,
  onDatasetSelect
}: DatasetSelectorProps) {
  const dispatch = useAppDispatch();
  const { datasetId } = useAppSelector(state => state.dataset);
  
  const [file, setFile] = useState<File | null>(null);
  const [isCustomUpload, setIsCustomUpload] = useState(datasetId === 'custom');

  const ALLOW_UPLOAD = false;
  
  const handleDatasetChange = (event: SelectChangeEvent<string>) => {
    const newDatasetId = event.target.value;
    
    // Update Redux state
    dispatch(setDatasetId(newDatasetId));
    
    // Handle custom upload
    setIsCustomUpload(newDatasetId === 'custom');
    
    if (newDatasetId !== 'custom') {
      setFile(null);
    }
    
    // Call optional callback
    if (onDatasetSelect) {
      onDatasetSelect(newDatasetId);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const uploadedFile = event.target.files[0];
      setFile(uploadedFile);
      
      // Set dataset to custom
      dispatch(setDatasetId('custom'));
      setIsCustomUpload(true);
      
      // Call optional callback
      if (onFileUpload) {
        onFileUpload(uploadedFile);
      }
    }
  };
  
  const filteredDatasets = DATASETS.filter(d => d.id !== 'custom');
  
  return (
    <Box>
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
          id="dataset-select"
          value={datasetId}
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
          <MenuItem disabled sx={{
            backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            color: darkMode ? 'rgba(255,255,255,0.7)' : undefined,
            padding: '8px 16px'
          }}>
            <Typography variant="caption" fontWeight="bold">
              Included in Your Subscription
            </Typography>
          </MenuItem>
          {filteredDatasets.filter(d => d.subscription === 'free').map((dataset) => (
            <MenuItem key={dataset.id} value={dataset.id} sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : undefined }}>
              {dataset.name}
            </MenuItem>
          ))}
          
          <MenuItem disabled sx={{ 
            mt: 1,
            backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            color: darkMode ? 'rgba(255,255,255,0.7)' : undefined,
            padding: '8px 16px'
          }}>
            <Typography variant="caption" fontWeight="bold">
              Premium Subscription
            </Typography>
          </MenuItem>
          {filteredDatasets.filter(d => d.subscription === 'premium').map((dataset) => (
            <MenuItem 
              key={dataset.id} 
              value={dataset.id}
              disabled={userSubscription !== 'premium'}
              sx={{
                backgroundColor: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
                color: darkMode ? 'rgba(255,255,255,0.7)' : undefined,
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
          {ALLOW_UPLOAD && (
            <MenuItem disabled value="custom" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : undefined }}>
              Custom Upload 🔒
            </MenuItem>
          )}
        </Select>
      </FormControl>
      
      {/* File Upload - only shown when custom dataset is selected */}
      {isCustomUpload && (
        <Box sx={{ mt: 2, minWidth: 200 }}>
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
    </Box>
  );
} 