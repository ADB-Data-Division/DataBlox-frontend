'use client';

import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from "@mui/material";
import { CaretDown } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { DateTimeFilter } from "@/app/services/data-loader/data-loader-interface";

import { 
  isDateTimeFilter, 
  getDatasetYear,
  generateDateTimeFilter
} from "./utils";
import { DateTimePeriodFilterProps, TimePeriod } from "./types";
import { addFilter, setDateRange } from "@/app/store/features/datasetSlice";

export default function DateTimePeriodFilter({ 
  onFilterChange, 
  selectedDateTimeFilter, 
  defaultFilter, // For backward compatibility
  datasetMetadata, 
  darkMode = false,
}: DateTimePeriodFilterProps) {
  // Get state from Redux
  const dispatch = useAppDispatch();
  // Use either selectedDateTimeFilter or defaultFilter
  const activeFilter = selectedDateTimeFilter || defaultFilter;
  
  // Add proper guards for time_periods array
  const timePeriod = datasetMetadata?.time_periods && datasetMetadata.time_periods.length > 0 
    ? datasetMetadata.time_periods[0].time_period 
    : undefined;
  const startDate = datasetMetadata?.time_periods && datasetMetadata.time_periods.length > 0 
    ? datasetMetadata.time_periods[0].start_date 
    : undefined;
  const endDate = datasetMetadata?.time_periods && datasetMetadata.time_periods.length > 0 
    ? datasetMetadata.time_periods[0].end_date 
    : undefined;

  const timePeriods : TimePeriod[] = (datasetMetadata?.time_periods || []).map((timePeriod) => ({
    id: timePeriod.time_period,
    name: timePeriod.label,
    isEnabled: true
  }));

  console.log("activeFilter", activeFilter);
  console.log("timePeriods", timePeriods);
  
  // Move useRef to component top level
  const initialSetupRef = useRef(false);
  
  const [showCustomDateRange, setShowCustomDateRange] = useState(timePeriod === 'custom');
  const [useMonthGranularity, setUseMonthGranularity] = useState(true);
  const customStartDate = startDate ? DateTime.fromISO(startDate) : undefined;
  const customEndDate = endDate ? DateTime.fromISO(endDate) : undefined;
  const datasetYear = getDatasetYear(startDate);
  
  // Define handlePredefinedPeriodChange
  const handlePredefinedPeriodChange = useCallback((periodId: string) => {
    setShowCustomDateRange(periodId === 'custom');  
    
    let { startDate: modifiedStartDate, endDate: modifiedEndDate } = generateDateTimeFilter(
      periodId,   
      datasetYear, 
      useMonthGranularity, 
      customStartDate, 
      customEndDate
    );

    const selectedDateTimeFilter = datasetMetadata?.time_periods.find(tp => tp.time_period === periodId);

    if (selectedDateTimeFilter && periodId !== 'custom') {
      modifiedStartDate = DateTime.fromISO(selectedDateTimeFilter.start_date);
      modifiedEndDate = DateTime.fromISO(selectedDateTimeFilter.end_date);
    }
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: periodId,
      label: timePeriods.find(period => period.id === periodId)?.name || '',
      start_date: modifiedStartDate.toFormat('yyyy-MM-dd'),
      end_date: modifiedEndDate.toFormat('yyyy-MM-dd')
    };

    // Update Redux state
		dispatch(addFilter(dateTimeFilter));
    dispatch(setDateRange({
      start_date: modifiedStartDate.toFormat('yyyy-MM-dd'),
      end_date: modifiedEndDate.toFormat('yyyy-MM-dd')
    }));
    
    // Propagate the filter change to the parent component
    onFilterChange(dateTimeFilter);
  }, [
    useMonthGranularity, 
    onFilterChange,
    customStartDate,
    customEndDate,
    datasetYear,
    timePeriods,
    dispatch,
    datasetMetadata
  ]);

  // const handleCustomDateChange = (field: 'start_date' | 'end_date', value: string) => {
  //   if (!timePeriod) {
  //     return;
  //   }
  //   const modifiedDate = DateTime.fromISO(value);
    
  //   const { startDate: modifiedStartDate, endDate: modifiedEndDate } = generateDateTimeFilter(
  //     timePeriod,
  //     datasetYear,
  //     useMonthGranularity,
  //     customStartDate,
  //     customEndDate
  //   );
    
  //   const dateTimeFilter: DateTimeFilter = {
  //     type: 'datetime',
  //     filter_id: 'datetime-filter',
  //     time_period: timePeriod,
  //     start_date: modifiedStartDate.toFormat('yyyy-MM-dd'),
  //     end_date: modifiedEndDate.toFormat('yyyy-MM-dd')
  //   };
    
  //   onFilterChange(dateTimeFilter);
  // };


  // Initialize the component based on Redux state
  useEffect(() => {
    setShowCustomDateRange(timePeriod === 'custom');
  }, [timePeriod]);
  
  // Initialize dates if not already set - prevent infinite loop
  useEffect(() => {
    // Guards against multiple runs and hydration inconsistencies
    if (initialSetupRef.current) {
      return; // Only run once on client side
    }
    
    // Run only client-side to prevent hydration mismatch
    if (typeof window !== 'undefined' && !initialSetupRef.current) {
      initialSetupRef.current = true;
      
      if (activeFilter && isDateTimeFilter(activeFilter)) {
        // Use existing filter from default values
        handlePredefinedPeriodChange(activeFilter.time_period || 'last3Months');
      } else if (datasetMetadata) {
        if (timePeriod) {
          // Use time period from dataset metadata
          handlePredefinedPeriodChange(timePeriod);
        } else {
          // Fallback to full year if dataset exists but no time period
          handlePredefinedPeriodChange('fullYear');
        }
      } else {
        // Default behavior (last 3 months)
        handlePredefinedPeriodChange('last3Months');
      }
    }
  }, [dispatch, timePeriod, startDate, endDate, activeFilter, datasetMetadata, handlePredefinedPeriodChange]);
  
  // Effect to update dates when granularity toggle changes - simplified to prevent loops
  // useEffect(() => {
  //   // Only run this effect when the granularity toggle changes
  //   if (start_date && end_date) {
  //     const transformedStart = useMonthGranularity 
  //       ? transformToMonthGranularity(start_date, false) 
  //       : start_date;
  //     const transformedEnd = useMonthGranularity 
  //       ? transformToMonthGranularity(end_date, true) 
  //       : end_date;
      
  //     // Only dispatch if there's an actual change to prevent loops
  //     if (transformedStart !== start_date || transformedEnd !== end_date) {
  //       // Create and dispatch the filter once instead of separate dispatches
  //       const dateTimeFilter: DateTimeFilter = {
  //         type: 'datetime',
  //         filter_id: 'datetime-filter',
  //         start_date: transformedStart,
  //         end_date: transformedEnd
  //       };
        
  //       onFilterChange(dateTimeFilter);
  //     }
  //   }
  // }, [useMonthGranularity, start_date, end_date, onFilterChange]); // Add startDate, endDate, and onFilterChange
  
  // const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
  //   // Transform the date if month granularity is enabled
  //   const transformedValue = useMonthGranularity 
  //     ? transformToMonthGranularity(value, field === 'end_date')
  //     : value;
      
  //   // Update Redux state
  //   dispatch(setDate({ field, value: transformedValue }));
  // }
  
  const handleGranularityToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseMonthGranularity(event.target.checked);
  };

  if (!datasetMetadata) {
    return (
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Please select a dataset first.
        </Typography>
      </Box>
    );
  }

  return (
    <>
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
      <InputLabel id="time-period-label" shrink sx={{ color: darkMode ? '#fff' : undefined }}>
        Time Period
      </InputLabel>
      <Select
        labelId="time-period-label"
        value={activeFilter?.time_period || ''}
        onChange={(e) => handlePredefinedPeriodChange(e.target.value)}
        label="Time Period"
        IconComponent={CaretDown}
        sx={{ color: darkMode ? '#fff' : undefined, height: '100%' }}
      >
        {timePeriods.map((period) => (
          <MenuItem key={period.id} value={period.id} disabled={!period.isEnabled}>
            {period.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    
    {/* Month Granularity Toggle */}
    {/* <FormControlLabel
      control={
        <Switch
          checked={useMonthGranularity}
          onChange={handleGranularityToggle}
          size="small"
          sx={{
            '.MuiSwitch-track': {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
            },
            '.MuiSwitch-thumb': {
              backgroundColor: darkMode ? '#fff' : undefined
            }
          }}
        />
      }
      label="Monthly Granularity"
      sx={{ 
        color: darkMode ? '#fff' : undefined,
        '.MuiTypography-root': {
          fontSize: '0.8rem'
        },
        ml: 1
      }}
    /> */}
    
    {/* Custom Date Range */}
    {/* {showCustomDateRange && (
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={startDate ?? ''}
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) => handleCustomDateChange('start_date', e.target.value)}
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
            },
            '.MuiInputBase-root': {
              height: '100%'
            }
          }}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={endDate ?? ''}
          onChange={(e) => handleCustomDateChange('end_date', e.target.value)}
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
            },
            '.MuiInputBase-root': {
              height: '100%'
            }
          }}
        />
      </Box>
    )} */}
    </>
  );
} 