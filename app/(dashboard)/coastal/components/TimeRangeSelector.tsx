import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Slider,
  Stack,
  FormControl,
} from '@mui/material';

export type CoastalGrain = 'weekly' | 'monthly' | 'annually';

export interface TimeRangeSelectorProps {
  startDate: string;
  endDate: string;
  grain: CoastalGrain;
  minDate?: string;
  maxDate?: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  onGrainChange: (grain: CoastalGrain) => void;
  disabled?: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  startDate,
  endDate,
  grain,
  minDate = '2019-01-01',
  maxDate = '2025-12-31',
  onRangeChange,
  onGrainChange,
  disabled = false,
}) => {
  const minYear = parseInt(minDate.split('-')[0], 10);
  const minMonth = parseInt(minDate.split('-')[1], 10);
  const maxYear = parseInt(maxDate.split('-')[0], 10);
  const maxMonth = parseInt(maxDate.split('-')[1], 10);

  const years = useMemo(() => {
    const y = [];
    for (let i = minYear; i <= maxYear; i++) {
      y.push(i);
    }
    return y;
  }, [minYear, maxYear]);

  const totalMonths = (maxYear - minYear) * 12 + (maxMonth - minMonth) + 1;

  const dateToIndex = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return (y - minYear) * 12 + (m - minMonth);
  };

  const indexToDateStr = (index: number) => {
    const y = minYear + Math.floor((index + minMonth - 1) / 12);
    const m = ((index + minMonth - 1) % 12) + 1;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${y}-${mStr}-01`;
  };

  const startIdx = dateToIndex(startDate);
  const endIdx = dateToIndex(endDate);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      const newStart = indexToDateStr(newValue[0]);
      let newEnd = indexToDateStr(newValue[1]);
      
      const endParts = newEnd.split('-');
      const endYearNum = parseInt(endParts[0], 10);
      const endMonthNum = parseInt(endParts[1], 10);
      const lastDay = new Date(endYearNum, endMonthNum, 0).getDate();
      newEnd = `${endParts[0]}-${endParts[1]}-${lastDay < 10 ? '0' + lastDay : lastDay}`;
      
      onRangeChange(newStart, newEnd);
    }
  };

  const startYear = parseInt(startDate.split('-')[0], 10) || minYear;
  const startMonth = parseInt(startDate.split('-')[1], 10) || minMonth;
  const endYear = parseInt(endDate.split('-')[0], 10) || maxYear;
  const endMonth = parseInt(endDate.split('-')[1], 10) || maxMonth;

  const handleStartYearChange = (e: any) => {
    const y = parseInt(e.target.value, 10);
    const newStart = `${y}-${startMonth < 10 ? '0' + startMonth : startMonth}-01`;
    onRangeChange(newStart, endDate);
  };

  const handleStartMonthChange = (e: any) => {
    const m = parseInt(e.target.value, 10);
    const newStart = `${startYear}-${m < 10 ? '0' + m : m}-01`;
    onRangeChange(newStart, endDate);
  };

  const handleEndYearChange = (e: any) => {
    const y = parseInt(e.target.value, 10);
    const lastDay = new Date(y, endMonth, 0).getDate();
    const newEnd = `${y}-${endMonth < 10 ? '0' + endMonth : endMonth}-${lastDay}`;
    onRangeChange(startDate, newEnd);
  };

  const handleEndMonthChange = (e: any) => {
    const m = parseInt(e.target.value, 10);
    const lastDay = new Date(endYear, m, 0).getDate();
    const newEnd = `${endYear}-${m < 10 ? '0' + m : m}-${lastDay}`;
    onRangeChange(startDate, newEnd);
  };

  const handleGrainChange = (e: any) => {
    onGrainChange(e.target.value as CoastalGrain);
  };

  const marks = useMemo(() => {
    const mks = [];
    for (let i = 0; i < totalMonths; i += 12) {
      const y = minYear + Math.floor((i + minMonth - 1) / 12);
      const m = ((i + minMonth - 1) % 12);
      mks.push({
        value: i,
        label: `${MONTHS[m]} ${y}`,
      });
    }
    if (totalMonths - 1 > mks[mks.length - 1].value + 6) {
      const y = maxYear;
      const m = maxMonth - 1;
      mks.push({
        value: totalMonths - 1,
        label: `${MONTHS[m]} ${y}`,
      });
    }
    return mks;
  }, [totalMonths, minYear, minMonth, maxYear, maxMonth]);

  return (
    <Box sx={{ width: '100%', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h6" component="div">
          Time Range
        </Typography>
        
        <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">Start:</Typography>
            <FormControl size="small" disabled={disabled}>
              <Select value={startMonth} onChange={handleStartMonthChange}>
                {MONTHS.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" disabled={disabled}>
              <Select value={startYear} onChange={handleStartYearChange}>
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">End:</Typography>
            <FormControl size="small" disabled={disabled}>
              <Select value={endMonth} onChange={handleEndMonthChange}>
                {MONTHS.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" disabled={disabled}>
              <Select value={endYear} onChange={handleEndYearChange}>
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Agg. Level</Typography>
          <FormControl size="small" disabled={disabled}>
            <Select value={grain} onChange={handleGrainChange}>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="annually">Annually</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Box sx={{ px: 3 }}>
        <Slider
          value={[startIdx, endIdx]}
          onChange={handleSliderChange}
          min={0}
          max={totalMonths - 1}
          step={1}
          marks={marks}
          disabled={disabled}
          valueLabelDisplay="auto"
          valueLabelFormat={(val) => {
            const y = minYear + Math.floor((val + minMonth - 1) / 12);
            const m = ((val + minMonth - 1) % 12);
            return `${MONTHS[m]} ${y}`;
          }}
        />
      </Box>
    </Box>
  );
};
