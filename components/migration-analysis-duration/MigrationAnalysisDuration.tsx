'use client';

import React, { useState, useEffect } from 'react';
import { Slider, CircularProgress, Typography as MuiTypography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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

  // Dropdown state for start date
  const [startMonth, setStartMonth] = useState<string>('');
  const [startYear, setStartYear] = useState<string>('');

  // Dropdown state for end date
  const [endMonth, setEndMonth] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');

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
              // Default to Jan 2024 - Dec 2024 if available, otherwise first and last periods
              // Find first period that starts in 2024
              const defaultStartIndex = periods.findIndex(p => {
                const startYear = new Date(p.start_date).getFullYear();
                return startYear === 2024;
              });
              
              // Find last period that ends in 2024
              let defaultEndIndex = -1;
              for (let i = periods.length - 1; i >= 0; i--) {
                const endYear = new Date(periods[i].end_date).getFullYear();
                if (endYear === 2024) {
                  defaultEndIndex = i;
                  break;
                }
              }
              
              if (defaultStartIndex !== -1 && defaultEndIndex !== -1 && defaultStartIndex <= defaultEndIndex) {
                setSelectedRange([defaultStartIndex, defaultEndIndex]);
                setDebouncedRange([defaultStartIndex, defaultEndIndex]);
              } else {
                // Fallback to first and last periods
                setSelectedRange([0, periods.length - 1]);
                setDebouncedRange([0, periods.length - 1]);
              }
            }
          } else {
            // Default to Jan 2024 - Dec 2024 if available, otherwise first and last periods
            // Find first period that starts in 2024
            const defaultStartIndex = periods.findIndex(p => {
              const startYear = new Date(p.start_date).getFullYear();
              return startYear === 2024;
            });
            
            // Find last period that ends in 2024
            let defaultEndIndex = -1;
            for (let i = periods.length - 1; i >= 0; i--) {
              const endYear = new Date(periods[i].end_date).getFullYear();
              if (endYear === 2024) {
                defaultEndIndex = i;
                break;
              }
            }
            
            if (defaultStartIndex !== -1 && defaultEndIndex !== -1 && defaultStartIndex <= defaultEndIndex) {
              setSelectedRange([defaultStartIndex, defaultEndIndex]);
              setDebouncedRange([defaultStartIndex, defaultEndIndex]);
            } else {
              // Fallback to first and last periods
              setSelectedRange([0, periods.length - 1]);
              setDebouncedRange([0, periods.length - 1]);
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

  // Sync dropdowns when slider changes or when component initializes with date range
  useEffect(() => {
    // If we have time periods loaded, sync with slider
    if (timePeriods.length > 0) {
      const [startIdx, endIdx] = selectedRange;
      if (startIdx < timePeriods.length && endIdx < timePeriods.length) {
        const startPeriod = timePeriods[startIdx];
        const endPeriod = timePeriods[endIdx];

        if (startPeriod && endPeriod) {
          const startDate = new Date(startPeriod.start_date);
          const endDate = new Date(endPeriod.end_date);

          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            // Update start dropdowns
            setStartMonth(startDate.toLocaleString('en-US', { month: 'short' }).toLowerCase());
            setStartYear(startDate.getFullYear().toString().slice(-2));

            // Update end dropdowns
            setEndMonth(endDate.toLocaleString('en-US', { month: 'short' }).toLowerCase());
            setEndYear(endDate.getFullYear().toString().slice(-2));
          }
        }
      }
    } else if (selectedStartDate && selectedEndDate) {
      // Fallback: initialize from props if time periods not loaded yet
      const startDate = new Date(selectedStartDate);
      const endDate = new Date(selectedEndDate);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        setStartMonth(startDate.toLocaleString('en-US', { month: 'short' }).toLowerCase());
        setStartYear(startDate.getFullYear().toString().slice(-2));
        setEndMonth(endDate.toLocaleString('en-US', { month: 'short' }).toLowerCase());
        setEndYear(endDate.getFullYear().toString().slice(-2));
      }
    }
  }, [selectedRange, timePeriods, selectedStartDate, selectedEndDate]);

  // Handle dropdown changes
  const handleStartMonthChange = (month: string) => {
    setStartMonth(month);
    updateRangeFromDropdowns(month, startYear, endMonth, endYear);
  };

  const handleStartYearChange = (year: string) => {
    setStartYear(year);
    updateRangeFromDropdowns(startMonth, year, endMonth, endYear);
  };

  const handleEndMonthChange = (month: string) => {
    setEndMonth(month);
    updateRangeFromDropdowns(startMonth, startYear, month, endYear);
  };

  const handleEndYearChange = (year: string) => {
    setEndYear(year);
    updateRangeFromDropdowns(startMonth, startYear, endMonth, year);
  };

  // Update slider range when dropdowns change
  const updateRangeFromDropdowns = (newStartMonth: string, newStartYear: string, newEndMonth: string, newEndYear: string) => {
    if (timePeriods.length === 0) return;

    // Find the closest matching periods for the dropdown selections
    const startYearFull = 2000 + parseInt(newStartYear);
    const endYearFull = 2000 + parseInt(newEndYear);

    // Find start period
    let startIdx = 0;
    for (let i = 0; i < timePeriods.length; i++) {
      const periodDate = new Date(timePeriods[i].start_date);
      if (periodDate.getFullYear() >= startYearFull) {
        // Find the specific month if possible
        if (periodDate.getFullYear() === startYearFull) {
          const periodMonth = periodDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
          if (periodMonth === newStartMonth) {
            startIdx = i;
            break;
          }
        } else {
          startIdx = i;
          break;
        }
      }
    }

    // Find end period
    let endIdx = timePeriods.length - 1;
    for (let i = timePeriods.length - 1; i >= 0; i--) {
      const periodDate = new Date(timePeriods[i].end_date);
      if (periodDate.getFullYear() <= endYearFull) {
        // Find the specific month if possible
        if (periodDate.getFullYear() === endYearFull) {
          const periodMonth = periodDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
          if (periodMonth === newEndMonth) {
            endIdx = i;
            break;
          }
        } else {
          endIdx = i;
          break;
        }
      }
    }

    // Ensure start is before end
    if (startIdx > endIdx) {
      if (startIdx > endIdx) startIdx = endIdx;
    }

    setSelectedRange([startIdx, endIdx]);
  };

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
        marginBottom: '16px',
        color: '#374151'
      }}>
        Migration Analysis Duration
      </h3>
      
      {/* Date Range Dropdowns */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
        {/* Start Date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MuiTypography variant="body2" sx={{ fontWeight: 500, minWidth: '35px' }}>
            Start:
          </MuiTypography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={startMonth}
              label="Month"
              onChange={(e) => handleStartMonthChange(e.target.value)}
              sx={{ fontSize: '14px' }}
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                <MenuItem key={month} value={month.toLowerCase()}>{month}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={startYear}
              label="Year"
              onChange={(e) => handleStartYearChange(e.target.value)}
              sx={{ fontSize: '14px' }}
            >
              {(() => {
                // Generate years from available time periods or fallback to date range
                if (timePeriods.length > 0) {
                  const years = new Set<number>();
                  timePeriods.forEach(period => {
                    const year = new Date(period.start_date).getFullYear();
                    if (!isNaN(year)) {
                      years.add(year);
                    }
                  });
                  
                  if (years.size > 0) {
                    return Array.from(years).sort((a, b) => b - a).map(year => (
                      <MenuItem key={year} value={year.toString().slice(-2)}>{year}</MenuItem>
                    ));
                  }
                }
                
                // Fallback: generate years from selected date range
                if (selectedStartDate && selectedEndDate) {
                  const startYear = new Date(selectedStartDate).getFullYear();
                  const endYear = new Date(selectedEndDate).getFullYear();
                  
                  if (!isNaN(startYear) && !isNaN(endYear)) {
                    const years = [];
                    for (let year = startYear; year <= endYear; year++) {
                      years.push(year);
                    }
                    
                    return years.map(year => (
                      <MenuItem key={year} value={year.toString().slice(-2)}>{year}</MenuItem>
                    ));
                  }
                }
                
                return <MenuItem disabled>No years available</MenuItem>;
              })()}
            </Select>
          </FormControl>
        </Box>

        {/* End Date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MuiTypography variant="body2" sx={{ fontWeight: 500, minWidth: '30px' }}>
            End:
          </MuiTypography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={endMonth}
              label="Month"
              onChange={(e) => handleEndMonthChange(e.target.value)}
              sx={{ fontSize: '14px' }}
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                <MenuItem key={month} value={month.toLowerCase()}>{month}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={endYear}
              label="Year"
              onChange={(e) => handleEndYearChange(e.target.value)}
              sx={{ fontSize: '14px' }}
            >
              {(() => {
                // Generate years from available time periods or fallback to date range
                if (timePeriods.length > 0) {
                  const years = new Set<number>();
                  timePeriods.forEach(period => {
                    const year = new Date(period.end_date).getFullYear();
                    if (!isNaN(year)) {
                      years.add(year);
                    }
                  });
                  
                  if (years.size > 0) {
                    return Array.from(years).sort((a, b) => b - a).map(year => (
                      <MenuItem key={year} value={year.toString().slice(-2)}>{year}</MenuItem>
                    ));
                  }
                }
                
                // Fallback: generate years from selected date range
                if (selectedStartDate && selectedEndDate) {
                  const startYear = new Date(selectedStartDate).getFullYear();
                  const endYear = new Date(selectedEndDate).getFullYear();
                  
                  if (!isNaN(startYear) && !isNaN(endYear)) {
                    const years = [];
                    for (let year = startYear; year <= endYear; year++) {
                      years.push(year);
                    }
                    
                    return years.map(year => (
                      <MenuItem key={year} value={year.toString().slice(-2)}>{year}</MenuItem>
                    ));
                  }
                }
                
                return <MenuItem disabled>No years available</MenuItem>;
              })()}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
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