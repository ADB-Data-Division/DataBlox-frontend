'use client';

import { FormControl, InputLabel, Select, MenuItem, Box, TextField, SelectChangeEvent } from "@mui/material";
import { CaretDown } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setTimePeriod, setDate } from "@/app/store/features/datasetSlice";

// Define time periods
const TIME_PERIODS = [
	{ id: 'lastYear', name: 'Last Year', isEnabled: true },
	{ id: 'last6Months', name: 'Last 6 Months', isEnabled: true },
	{ id: 'last3Months', name: 'Last 3 Months', isEnabled: true },
	{ id: 'custom', name: 'Custom Range', isEnabled: false }
];

export type DateTimePeriodFilterProps = {
	darkMode: boolean;
	// Optional props for backward compatibility or custom handling
	onTimePeriodChange?: (timePeriod: string) => void;
	onDateChange?: (field: 'startDate' | 'endDate', value: string | undefined) => void;
}	

export default function DateTimePeriodFilter({ 
	darkMode, 
	onTimePeriodChange, 
	onDateChange 
}: DateTimePeriodFilterProps) {
	// Get state from Redux
	const dispatch = useAppDispatch();
	const { timePeriod, dateRange } = useAppSelector(state => state.dataset);
	const { startDate, endDate } = dateRange;
	
	const [showCustomDateRange, setShowCustomDateRange] = useState(timePeriod === 'custom');
	
	// Initialize the component based on Redux state
	useEffect(() => {
		setShowCustomDateRange(timePeriod === 'custom');
	}, [timePeriod]);
	
	console.log("Rendering DateTimePeriodFilter", {
		timePeriod,
		startDate,
		endDate
	});

	const handleTimePeriodChange = (event: SelectChangeEvent<string>) => {
		const newTimePeriod = event.target.value;
		
		// Update Redux state
		dispatch(setTimePeriod(newTimePeriod));
		
		// Handle custom date range
		if (newTimePeriod === 'custom') {
			setShowCustomDateRange(true);
			const defaultStartDate = DateTime.now().minus({ months: 3 }).toFormat('yyyy-MM-dd');
			const defaultEndDate = DateTime.now().toFormat('yyyy-MM-dd');
			
			dispatch(setDate({ field: 'startDate', value: defaultStartDate }));
			dispatch(setDate({ field: 'endDate', value: defaultEndDate }));
		} else {
			setShowCustomDateRange(false);
			dispatch(setDate({ field: 'startDate', value: undefined }));
			dispatch(setDate({ field: 'endDate', value: undefined }));
		}
		
		// Call optional callback for backward compatibility
		if (onTimePeriodChange) {
			onTimePeriodChange(newTimePeriod);
		}
	}

	const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
		// Update Redux state
		dispatch(setDate({ field, value }));
		
		// Call optional callback for backward compatibility
		if (onDateChange) {
			onDateChange(field, value);
		}
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
            value={timePeriod}
            onChange={handleTimePeriodChange}
            label="Time Period"
            IconComponent={CaretDown}
            sx={{ color: darkMode ? '#fff' : undefined, height: '100%' }}
          >
            {TIME_PERIODS.map((period) => (
              <MenuItem key={period.id} value={period.id} disabled={!period.isEnabled}>
                {period.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Custom Date Range */}
        {showCustomDateRange && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startDate ?? ''}
			  slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
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
              onChange={(e) => handleDateChange('endDate', e.target.value)}
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
		)}
		</>
	)
}