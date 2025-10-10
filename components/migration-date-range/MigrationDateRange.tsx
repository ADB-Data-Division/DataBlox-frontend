'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Slider, CircularProgress, Typography, Box } from '@mui/material';
import { metadataService } from '@/app/services/api';
import type { TimePeriod } from '@/app/services/api/types';
import { formatToMonthYear, formatDateRange } from '@/src/utils/date-formatter';

interface MigrationDateRangeProps {
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

export const MigrationDateRange: React.FC<MigrationDateRangeProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onDateRangeChange
}) => {
  // State for metadata and periods
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current selected range indices [startIndex, endIndex]
  const [selectedRange, setSelectedRange] = useState<number[]>([0, 0]);
  
  // Debounced range for API calls
  const [debouncedRange, setDebouncedRange] = useState<number[]>([0, 0]);
  
  // Track if this is the initial render
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  
  // Track the last range that was sent to the callback
  const [lastCallbackRange, setLastCallbackRange] = useState<string | null>(null);

  // Load time periods from metadata API
  useEffect(() => {
    const loadTimePeriods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const metadata = await metadataService.getTimePeriods();
        
        if (metadata.available_periods && metadata.available_periods.length > 0) {
          setTimePeriods(metadata.available_periods);
          
          // Find initial range
          let startIndex = 0;
          let endIndex = metadata.available_periods.length - 1;
          
          if (initialStartDate) {
            const foundIndex = metadata.available_periods.findIndex(p => p.start_date === initialStartDate);
            if (foundIndex !== -1) startIndex = foundIndex;
          }
          
          if (initialEndDate) {
            const foundIndex = metadata.available_periods.findIndex(p => p.end_date === initialEndDate);
            if (foundIndex !== -1) endIndex = foundIndex;
          }
          
          setSelectedRange([startIndex, endIndex]);
          setDebouncedRange([startIndex, endIndex]);
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
  }, [initialStartDate, initialEndDate]);

  // Debounce effect: Update debouncedRange after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRange(selectedRange);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedRange]);

  // Effect to mark end of initial render
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle debounced range changes
  useEffect(() => {
    if (isInitialRender || timePeriods.length === 0) return;
    
    const [startIdx, endIdx] = debouncedRange;
    const startPeriod = timePeriods[startIdx];
    const endPeriod = timePeriods[endIdx];
    
    if (!startPeriod || !endPeriod) return;
    
    const rangeKey = `${startPeriod.start_date}|${endPeriod.end_date}`;
    
    // Only call callbacks if the range has actually changed
    if (rangeKey !== lastCallbackRange) {
      if (onDateRangeChange) {
        onDateRangeChange(startPeriod.start_date, endPeriod.end_date);
      }
      
      setLastCallbackRange(rangeKey);
    }
  }, [debouncedRange, timePeriods, onDateRangeChange, isInitialRender, lastCallbackRange]);

  // Handle range selection change
  const handleRangeChange = (event: Event, newValue: number | number[]) => {
    const range = newValue as number[];
    setSelectedRange(range);
  };

  // Format display text
  const displayText = useMemo(() => {
    if (timePeriods.length === 0) return '';
    const [startIdx, endIdx] = selectedRange;
    const startPeriod = timePeriods[startIdx];
    const endPeriod = timePeriods[endIdx];
    if (!startPeriod || !endPeriod) return '';
    return formatDateRange(startPeriod.start_date, endPeriod.end_date);
  }, [selectedRange, timePeriods]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ mb: 3, px: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Loading available time periods...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ mb: 3, px: 3 }}>
        <Typography variant="h6" color="error">
          Error loading time periods
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

  // No periods available
  if (timePeriods.length === 0) {
    return (
      <Box sx={{ mb: 3, px: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No time periods available
        </Typography>
      </Box>
    );
  }

  const periodLabels = timePeriods.map((period, index) => ({
    value: index,
    label: index % Math.max(1, Math.floor(timePeriods.length / 6)) === 0 
      ? formatToMonthYear(period.start_date)
      : ''
  }));

  return (
    <Box sx={{ mb: 3, px: 3 }}>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Select Time Range
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Current selection: <strong>{displayText}</strong>
      </Typography>
      
      <Slider
        value={selectedRange}
        onChange={handleRangeChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => {
          const period = timePeriods[value];
          return period ? formatToMonthYear(period.start_date) : '';
        }}
        min={0}
        max={timePeriods.length - 1}
        step={1}
        marks={periodLabels}
        disableSwap
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
            backgroundColor: '#2563eb',
            height: 4,
          },
          '& .MuiSlider-rail': {
            backgroundColor: '#e2e8f0',
            opacity: 1,
            height: 4,
          },
          '& .MuiSlider-mark': {
            backgroundColor: '#94a3b8',
            height: 8,
            width: 2,
          },
          '& .MuiSlider-markActive': {
            backgroundColor: '#2563eb',
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
        }}
      />
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Drag the sliders to select a custom time range for analysis
      </Typography>
    </Box>
  );
};
