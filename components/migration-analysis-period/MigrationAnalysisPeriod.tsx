'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography as MuiTypography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
  
  // Year and month selection state
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  // Track if this is the initial render to avoid unnecessary callback calls
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  
  // Track the last period that was sent to the callback
  const [lastCallbackPeriodId, setLastCallbackPeriodId] = useState<string | null>(selectedPeriod || null);

  // Extract available years from the time periods
  const availableYears = React.useMemo(() => {
    if (!timePeriods.length) return [];
    
    const years = new Set<number>();
    timePeriods.forEach(period => {
      const year = new Date(period.start_date).getFullYear();
      years.add(year);
    });
    
    const sortedYears = Array.from(years).sort();
    console.log('📅 Available years in migration data:', sortedYears);
    
    return sortedYears;
  }, [timePeriods]);

  // Extract available months for the selected year
  const availableMonths = React.useMemo(() => {
    if (!timePeriods.length || !selectedYear) return [];
    
    const yearNum = parseInt(selectedYear);
    const yearPeriods = timePeriods.filter(period => {
      const year = new Date(period.start_date).getFullYear();
      return year === yearNum;
    });
    
    const months = new Set<number>();
    yearPeriods.forEach(period => {
      const month = new Date(period.start_date).getMonth(); // 0-11
      months.add(month);
    });
    
    const sortedMonths = Array.from(months).sort((a, b) => a - b); // Sort chronologically (0=Jan, 11=Dec)
    console.log('📅 Available months for year', selectedYear, ':', sortedMonths.map(m => new Date(2000, m).toLocaleString('default', { month: 'short' })));
    
    return sortedMonths;
  }, [timePeriods, selectedYear]);

  // Get current selected period for display
  const currentPeriod = React.useMemo(() => {
    if (!timePeriods.length || !selectedYear || !selectedMonth) return null;
    
    return timePeriods.find(period => {
      const year = new Date(period.start_date).getFullYear();
      const month = new Date(period.start_date).getMonth();
      return year === parseInt(selectedYear) && month === parseInt(selectedMonth);
    });
  }, [timePeriods, selectedYear, selectedMonth]);

  // Load time periods from metadata API
  useEffect(() => {
    const loadTimePeriods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const metadata = await metadataService.getTimePeriods();
        
        if (metadata.available_periods && metadata.available_periods.length > 0) {
          setTimePeriods(metadata.available_periods);
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
  }, []);

  // Auto-select first available period when data loads (similar to original behavior)
  useEffect(() => {
    if (timePeriods.length > 0 && !selectedYear && !selectedMonth) {
      // Select the first period (like Jul 2019 in the original)
      const firstPeriod = timePeriods[0];
      const year = new Date(firstPeriod.start_date).getFullYear().toString();
      const month = new Date(firstPeriod.start_date).getMonth().toString();
      
      setSelectedYear(year);
      setSelectedMonth(month);
    }
  }, [timePeriods, selectedYear, selectedMonth]);

  // Sync with selectedPeriod prop when it changes
  useEffect(() => {
    if (selectedPeriod && timePeriods.length > 0) {
      const period = timePeriods.find(p => p.id === selectedPeriod);
      if (period) {
        const year = new Date(period.start_date).getFullYear().toString();
        const month = new Date(period.start_date).getMonth().toString();
        
        setSelectedYear(year);
        setSelectedMonth(month);
        setLastCallbackPeriodId(selectedPeriod);
      }
    }
  }, [selectedPeriod, timePeriods]);

  // Effect to mark end of initial render
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle period changes based on year/month selection
  useEffect(() => {
    if (isInitialRender || timePeriods.length === 0 || !selectedYear || !selectedMonth) return;
    
    const targetPeriod = timePeriods.find(period => {
      const year = new Date(period.start_date).getFullYear();
      const month = new Date(period.start_date).getMonth();
      return year === parseInt(selectedYear) && month === parseInt(selectedMonth);
    });
    
    if (targetPeriod && targetPeriod.id !== lastCallbackPeriodId) {
      if (onPeriodChange) {
        onPeriodChange(targetPeriod.id, targetPeriod.start_date, targetPeriod.end_date);
      }
      
      setLastCallbackPeriodId(targetPeriod.id);
    }
  }, [selectedYear, selectedMonth, timePeriods, onPeriodChange, isInitialRender, lastCallbackPeriodId]);




  // Loading state
  if (loading) {
    return (
      <div style={{ textAlign: 'center' }}>
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
      <div>
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
      <div>
        <MuiTypography variant="body2" color="text.secondary">
          No time periods available
        </MuiTypography>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        color: '#374151'
      }}>
        Migration Analysis Period
      </h3>

      <p style={{
        color: '#6b7280',
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
      
      {/* Year and Month Filter Dropdowns */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {availableYears.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="year-select-label">Select Year</InputLabel>
            <Select
              labelId="year-select-label"
              id="year-select"
              value={selectedYear}
              label="Select Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map(year => (
                <MenuItem key={year} value={String(year)}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Month Filter Dropdown - only show when a specific year is selected */}
        {selectedYear && availableMonths.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="month-select-label">Select Month</InputLabel>
            <Select
              labelId="month-select-label"
              id="month-select"
              value={selectedMonth}
              label="Select Month"
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(month => (
                <MenuItem key={month} value={String(month)}>
                  {new Date(2000, month).toLocaleString('default', { month: 'long' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    </div>
  );
};