'use client';

import { FormControl, InputLabel, Select, MenuItem, Typography, Box, Button, SelectChangeEvent } from "@mui/material";
import { CaretDown, Database, UploadSimple } from "@phosphor-icons/react";
import { Dataset, STATIC_DATASETS as DATASETS } from '@/models/datasets';

export type DatasetSelectorProps = {
	selectedDataset: string;
	darkMode: boolean;
	handleDatasetChange: (event: SelectChangeEvent<string>) => void;
	userSubscription: string;
	isCustomUpload: boolean;
	file: File | null;
	handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DatasetSelector({ selectedDataset, darkMode, handleDatasetChange, userSubscription, isCustomUpload, file, handleFileChange }: DatasetSelectorProps) {

	const filteredDatasets = (DATASETS as Dataset[]).filter(d => d.id !== 'custom');

	return (
		<>
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
            value={selectedDataset}
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
            {filteredDatasets.filter(d => d.subscription === 'free').map((dataset) => (
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
            {filteredDatasets.filter(d => d.subscription === 'premium').map((dataset) => (
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
		</>
	)
}