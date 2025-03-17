'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Divider, 
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme
} from '@mui/material';
import PersistenceControls from '@/components/persistence-controls';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setThemeMode, ThemeMode } from '@/app/store/features/userPreferencesSlice';
import { Sun, Moon, Desktop } from '@phosphor-icons/react';

export default function SettingsPage() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { datasetId, timePeriod, dateRange, provinces } = useAppSelector(state => state.dataset);
  const { themeMode } = useAppSelector(state => state.userPreferences);
  
  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setThemeMode(event.target.value as ThemeMode));
  };
  
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {/* Theme Settings */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: isDarkMode ? '#fff' : 'text.primary',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Theme Settings
        </Typography>
        
        <Divider sx={{ my: 2, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
        
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : undefined }}>
            Theme Mode
          </FormLabel>
          <RadioGroup
            aria-label="theme-mode"
            name="theme-mode"
            value={themeMode}
            onChange={handleThemeChange}
          >
            <FormControlLabel 
              value="light" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sun size={20} weight="regular" />
                  <span>Light</span>
                </Box>
              } 
            />
            <FormControlLabel 
              value="dark" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Moon size={20} weight="regular" />
                  <span>Dark</span>
                </Box>
              } 
            />
            <FormControlLabel 
              value="system" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Desktop size={20} weight="regular" />
                  <span>System (follows your device settings)</span>
                </Box>
              } 
            />
          </RadioGroup>
        </FormControl>
      </Paper>
      
      {/* Persistence Controls */}
      <PersistenceControls darkMode={isDarkMode} />
      
      {/* Current Persisted State */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: isDarkMode ? '#fff' : 'text.primary',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Current Persisted State
        </Typography>
        
        <Divider sx={{ my: 2, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : undefined }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
          <Typography variant="subtitle2">Dataset ID:</Typography>
          <Typography>{datasetId}</Typography>
          
          <Typography variant="subtitle2">Time Period:</Typography>
          <Typography>{timePeriod}</Typography>
          
          <Typography variant="subtitle2">Date Range:</Typography>
          <Typography>
            {dateRange.startDate ? `${dateRange.startDate} to ${dateRange.endDate}` : 'Not set'}
          </Typography>
          
          <Typography variant="subtitle2">Selected Provinces:</Typography>
          <Typography>
            {provinces.length > 0 ? provinces.join(', ') : 'None selected'}
          </Typography>
          
          <Typography variant="subtitle2">Theme Mode:</Typography>
          <Typography>{themeMode}</Typography>
        </Box>
        
        <Typography variant="caption" sx={{ display: 'block', mt: 3, color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
          This data is automatically saved to your browser&apos;s local storage and will persist between visits.
          Use the persistence controls to manage this data.
        </Typography>
      </Paper>
    </Container>
  );
} 