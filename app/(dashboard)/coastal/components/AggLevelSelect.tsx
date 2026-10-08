'use client';

import React from 'react';
import { Typography, Select, MenuItem, Stack, FormControl } from '@mui/material';

export type CoastalGrain = 'weekly' | 'monthly' | 'annually';

export interface AggLevelSelectProps {
  grain: CoastalGrain;
  onGrainChange: (grain: CoastalGrain) => void;
}

export const AggLevelSelect: React.FC<AggLevelSelectProps> = ({ grain, onGrainChange }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: 14 } }}>
    <Typography variant="body2" color="text.secondary">Agg. Level</Typography>
    <FormControl size="small">
      <Select value={grain} onChange={(e) => onGrainChange(e.target.value as CoastalGrain)}>
        <MenuItem value="weekly">Weekly</MenuItem>
        <MenuItem value="monthly">Monthly</MenuItem>
        <MenuItem value="annually">Annually</MenuItem>
      </Select>
    </FormControl>
  </Stack>
);
