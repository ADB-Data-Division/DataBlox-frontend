'use client';

import React, { useState, useEffect } from 'react';
import { Slider, CircularProgress, Typography as MuiTypography } from '@mui/material';
import { metadataService } from '@/app/services/api';
import type { TimePeriod } from '@/app/services/api/types';
import { formatToMonthYear, formatDateRange } from '@/src/utils/date-formatter';

interface MigrationAnalysisPeriodProps {
  selectedPeriod?: string;
  onPeriodChange?: (periodId: string, startDate: string, endDate: string) => void;
}

export const MigrationAnalysisPeriod: React.FC<MigrationAnalysisPeriodProps> = ({
  selectedPeriod,
  onPeriodChange
}) => {
  // State for metadata and periods
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current selected period index
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0);
  
  // Debounced period index for API calls
  const [debouncedPeriodIndex, setDebouncedPeriodIndex] = useState<number>(0);
  
  // Track if this is the initial render to avoid unnecessary callback calls
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  
  // Track the last period that was sent to the callback
  const [lastCallbackPeriodId, setLastCallbackPeriodId] = useState<string | null>(selectedPeriod || null);

  // Load time periods from metadata API
  useEffect(() => {
    const loadTimePeriods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const metadata = await metadataService.getTimePeriods();
        
        if (metadata.available_periods && metadata.available_periods.length > 0) {
          setTimePeriods(metadata.available_periods);
          
          // Find initial selected period index
          if (selectedPeriod) {
            const foundIndex = metadata.available_periods.findIndex(p => p.id === selectedPeriod);
            if (foundIndex !== -1) {
              setSelectedPeriodIndex(foundIndex);
              setDebouncedPeriodIndex(foundIndex);
            }
          }
        } else {
          setError('No time periods available');
        }
      } catch (err) {
        console.error('Failed to load time periods:', err);
        setError(err instanceof Error ? err.message : 'Failed to load time periods');
      } finally {
        setLoading(false);
      }
    };

    loadTimePeriods();
  }, [selectedPeriod]);

  // Debounce effect: Update debouncedPeriodIndex after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPeriodIndex(selectedPeriodIndex);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedPeriodIndex]);

  // Sync selectedPeriodIndex when selectedPeriod prop changes
  useEffect(() => {
    if (selectedPeriod && timePeriods.length > 0) {
      const foundIndex = timePeriods.findIndex(p => p.id === selectedPeriod);
      if (foundIndex !== -1) {
        setSelectedPeriodIndex(foundIndex);
        setDebouncedPeriodIndex(foundIndex);
        setLastCallbackPeriodId(selectedPeriod);
      }
    }
  }, [selectedPeriod, timePeriods]);

  // Effect to mark end of initial render
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle debounced period changes - call callbacks only when period has actually changed
  useEffect(() => {
    if (isInitialRender || timePeriods.length === 0) return;
    
    const currentPeriod = timePeriods[debouncedPeriodIndex];
    if (!currentPeriod) return;
    
    // Only call callbacks if the period has actually changed
    if (currentPeriod.id !== lastCallbackPeriodId) {
      if (onPeriodChange) {
        onPeriodChange(currentPeriod.id, currentPeriod.start_date, currentPeriod.end_date);
      }
      
      setLastCallbackPeriodId(currentPeriod.id);
    }
  }, [debouncedPeriodIndex, timePeriods, onPeriodChange, isInitialRender, lastCallbackPeriodId]);

  // Handle period selection change
  const handlePeriodChange = (event: Event, newValue: number | number[]) => {
    const index = newValue as number;
    setSelectedPeriodIndex(index);
  };




  // Loading state
  if (loading) {
    return (
      <div style={{ marginBottom: '32px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
        <CircularProgress size={24} />
        <MuiTypography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Loading available time periods...
        </MuiTypography>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ marginBottom: '32px', paddingLeft: '24px', paddingRight: '24px' }}>
        <MuiTypography variant="h6" color="error">
          Error loading time periods
        </MuiTypography>
        <MuiTypography variant="body2" color="text.secondary">
          {error}
        </MuiTypography>
      </div>
    );
  }

  // No periods available
  if (timePeriods.length === 0) {
    return (
      <div style={{ marginBottom: '32px', paddingLeft: '24px', paddingRight: '24px' }}>
        <MuiTypography variant="body2" color="text.secondary">
          No time periods available
        </MuiTypography>
      </div>
    );
  }

  const currentPeriod = timePeriods[selectedPeriodIndex];
  const periodLabels = timePeriods.map((period, index) => ({
    value: index,
    label: index % Math.max(1, Math.floor(timePeriods.length / 6)) === 0 
      ? formatToMonthYear(period.start_date)
      : ''
  }));

  return (
    <div style={{ marginBottom: '32px', paddingLeft: '24px', paddingRight: '24px' }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '16px',
        color: '#374151'
      }}>
        Migration Analysis Period
      </h3>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        {currentPeriod && (
          <span style={{ 
            color: '#374151', 
            fontWeight: '500',
            marginLeft: '8px'
          }}>
            Current data: {formatDateRange(currentPeriod.start_date, currentPeriod.end_date)}
          </span>
        )}
      </p>
      
      <Slider
        value={selectedPeriodIndex}
        onChange={handlePeriodChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => {
          const period = timePeriods[value];
          return period ? formatDateRange(period.start_date, period.end_date) : '';
        }}
        min={0}
        max={timePeriods.length - 1}
        step={1}
        marks={periodLabels}
        sx={{
          '& .MuiSlider-thumb': {
            backgroundColor: '#2563eb',
            width: 20,
            height: 20,
            '&:hover': {
              boxShadow: '0 0 0 8px rgba(37, 99, 235, 0.16)',
            },
          },
          '& .MuiSlider-track': {
            display: 'none', // Hide the blue track line from start to selected position
          },
          '& .MuiSlider-track::before': {
            display: 'none', // Hide any pseudo-elements of the track
          },
          '& .MuiSlider-track::after': {
            display: 'none', // Hide any pseudo-elements of the track
          },
          '& .MuiSlider-rail': {
            backgroundColor: '#e2e8f0 !important',
            opacity: '1 !important',
            height: 4,
          },
          '& .MuiSlider-mark': {
            backgroundColor: '#94a3b8',
            height: 8,
            width: 2,
          },
          '& .MuiSlider-markActive': {
            backgroundColor: '#2563eb', // Highlight the mark at the selected position
          },
          '& .MuiSlider-markLabel': {
            fontSize: '11px',
            color: '#64748b',
            transform: 'rotate(-45deg)',
            transformOrigin: 'top left',
            whiteSpace: 'nowrap',
            marginTop: '8px'
          },
          '& .MuiSlider-valueLabel': {
            fontSize: '12px',
            backgroundColor: '#1f2937',
          },
          // Ensure no track elements show blue color anywhere
          '& .MuiSlider-root': {
            '& .MuiSlider-track': {
              backgroundColor: 'transparent !important',
              border: 'none !important',
            }
          }
        }}
      />
    </div>
  );
};