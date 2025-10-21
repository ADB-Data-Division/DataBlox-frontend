'use client';

import React, { useState, useEffect } from 'react';
import { Slider, CircularProgress, Typography as MuiTypography, Box } from '@mui/material';
import { metadataService } from '@/app/services/api';
import { formatToMonthYear, formatDateRange } from '@/src/utils/date-formatter';
import type { TimePeriod } from '@/app/services/api/types';

interface MigrationAnalysisDurationProps {
  selectedStartDate?: string;
  selectedEndDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

export const MigrationAnalysisDuration: React.FC<MigrationAnalysisDurationProps> = ({
  selectedStartDate,
  selectedEndDate,
  onDateRangeChange
}) => {
  // State for metadata and periods
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current selected range indices
  const [selectedRange, setSelectedRange] = useState<[number, number]>([0, 0]);
  
  // Debounced range indices for API calls
  const [debouncedRange, setDebouncedRange] = useState<[number, number]>([0, 0]);
  
  // Track if this is the initial render to avoid unnecessary callback calls
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  
  // Track the last date range that was sent to the callback
  const [lastCallbackRange, setLastCallbackRange] = useState<{startDate: string, endDate: string} | null>(
    selectedStartDate && selectedEndDate ? { startDate: selectedStartDate, endDate: selectedEndDate } : null
  );

  // Load time periods from metadata API
  useEffect(() => {
    const loadTimePeriods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const metadata = await metadataService.getTimePeriods();
        
        if (metadata.available_periods && metadata.available_periods.length > 0) {
          const periods = metadata.available_periods.sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          );
          setTimePeriods(periods);
          
          // Find initial selected range indices
          if (selectedStartDate && selectedEndDate) {
            const startIndex = periods.findIndex(p => p.start_date === selectedStartDate);
            const endIndex = periods.findIndex(p => p.end_date === selectedEndDate);
            
            if (startIndex !== -1 && endIndex !== -1) {
              setSelectedRange([startIndex, endIndex]);
              setDebouncedRange([startIndex, endIndex]);
            } else {
              // Default to first and last periods
              setSelectedRange([0, periods.length - 1]);
              setDebouncedRange([0, periods.length - 1]);
            }
          } else {
            // Default to first and last periods
            setSelectedRange([0, periods.length - 1]);
            setDebouncedRange([0, periods.length - 1]);
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
  }, [selectedStartDate, selectedEndDate]);

  // Debounce effect: Update debouncedRange after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRange(selectedRange);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedRange]);

  // Sync selectedRange when props change
  useEffect(() => {
    if (selectedStartDate && selectedEndDate && timePeriods.length > 0) {
      const startIndex = timePeriods.findIndex(p => p.start_date === selectedStartDate);
      const endIndex = timePeriods.findIndex(p => p.end_date === selectedEndDate);
      
      if (startIndex !== -1 && endIndex !== -1) {
        setSelectedRange([startIndex, endIndex]);
        setDebouncedRange([startIndex, endIndex]);
        setLastCallbackRange({ startDate: selectedStartDate, endDate: selectedEndDate });
      }
    }
  }, [selectedStartDate, selectedEndDate, timePeriods]);

  // Effect to mark end of initial render
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle debounced range changes - call callbacks only when range has actually changed
  useEffect(() => {
    if (isInitialRender || timePeriods.length === 0) return;
    
    const [startIdx, endIdx] = debouncedRange;
    const startPeriod = timePeriods[startIdx];
    const endPeriod = timePeriods[endIdx];
    
    if (!startPeriod || !endPeriod) return;
    
    const newRange = { startDate: startPeriod.start_date, endDate: endPeriod.end_date };
    
    // Only call callbacks if the range has actually changed
    if (!lastCallbackRange || 
        newRange.startDate !== lastCallbackRange.startDate || 
        newRange.endDate !== lastCallbackRange.endDate) {
      if (onDateRangeChange) {
        onDateRangeChange(newRange.startDate, newRange.endDate);
      }
      
      setLastCallbackRange(newRange);
    }
  }, [debouncedRange, timePeriods, onDateRangeChange, isInitialRender, lastCallbackRange]);

  // Handle range selection change
  const handleRangeChange = (event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    setSelectedRange(range);
  };

  // Format date for display - use the date-formatter utility
  const formatDate = (dateString: string): string => {
    return formatToMonthYear(dateString);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ marginBottom: '16px', paddingLeft: '16px', paddingRight: '16px', textAlign: 'center' }}>
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
      <div style={{ marginBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
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
      <div style={{ marginBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
        <MuiTypography variant="body2" color="text.secondary">
          No time periods available
        </MuiTypography>
      </div>
    );
  }

  const [startIdx, endIdx] = selectedRange;
  const startPeriod = timePeriods[startIdx];
  const endPeriod = timePeriods[endIdx];
  
  // Create marks for the slider
  const periodMarks = timePeriods.map((period, index) => ({
    value: index,
    label: index % Math.max(1, Math.floor(timePeriods.length / 6)) === 0 
      ? `${formatDate(period.start_date)}` 
      : ''
  }));

  return (
    <div style={{ marginBottom: '4px', paddingLeft: '16px', paddingRight: '16px' }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '8px',
        color: '#374151'
      }}>
        Migration Analysis Duration
      </h3>
      
      <Box mb={1}>
        <MuiTypography variant="body2" style={{ color: '#6b7280', marginBottom: '4px' }}>
          Selected Date Range:
        </MuiTypography>
        {startPeriod && endPeriod && (
          <MuiTypography variant="body1" style={{ 
            color: '#374151', 
            fontWeight: '500'
          }}>
            {formatDateRange(startPeriod.start_date, endPeriod.end_date)}
          </MuiTypography>
        )}
      </Box>
      
      <Slider
        value={selectedRange}
        onChange={handleRangeChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => {
          const period = timePeriods[value];
          return period ? formatDate(period.start_date) : '';
        }}
        min={0}
        max={timePeriods.length - 1}
        step={1}
        marks={periodMarks}
        sx={{
          '& .MuiSlider-thumb': {
            backgroundColor: '#2563eb',
          },
          '& .MuiSlider-track': {
            backgroundColor: '#2563eb',
          },
          '& .MuiSlider-rail': {
            backgroundColor: '#e2e8f0',
          },
          '& .MuiSlider-mark': {
            backgroundColor: '#94a3b8',
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
          }
        }}
      />
    </div>
  );
};