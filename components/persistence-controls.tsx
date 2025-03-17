'use client';

import React from 'react';
import { Box, Button, Typography, Paper, Tooltip, Alert } from '@mui/material';
import { CloudArrowUp, CloudSlash, CloudCheck } from '@phosphor-icons/react';
import { usePersistStore } from '@/app/store/hooks';

interface PersistenceControlsProps {
  darkMode?: boolean;
}

export default function PersistenceControls({ darkMode = false }: PersistenceControlsProps) {
  const { clearPersistedData, pausePersistence, resumePersistence, isPersistenceAvailable } = usePersistStore();
  
  if (!isPersistenceAvailable) {
    return (
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          bgcolor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: darkMode ? '#fff' : 'text.primary',
        }}
      >
        <Alert severity="info" sx={{ mb: 0 }}>
          Data persistence is not available in this environment.
        </Alert>
      </Paper>
    );
  }
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2, 
        borderRadius: 2,
        bgcolor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
        color: darkMode ? '#fff' : 'text.primary',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Data Persistence Controls
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Clear all saved data from local storage">
          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            startIcon={<CloudSlash />}
            onClick={clearPersistedData}
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: darkMode ? '#ff6b6b' : undefined
            }}
          >
            Clear Saved Data
          </Button>
        </Tooltip>
        
        <Tooltip title="Temporarily pause saving data to local storage">
          <Button 
            size="small" 
            variant="outlined"
            startIcon={<CloudArrowUp />}
            onClick={pausePersistence}
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: darkMode ? '#fff' : undefined
            }}
          >
            Pause Saving
          </Button>
        </Tooltip>
        
        <Tooltip title="Resume saving data to local storage">
          <Button 
            size="small" 
            variant="outlined"
            color="success"
            startIcon={<CloudCheck />}
            onClick={resumePersistence}
            sx={{ 
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
              color: darkMode ? '#4caf50' : undefined
            }}
          >
            Resume Saving
          </Button>
        </Tooltip>
      </Box>
    </Paper>
  );
} 