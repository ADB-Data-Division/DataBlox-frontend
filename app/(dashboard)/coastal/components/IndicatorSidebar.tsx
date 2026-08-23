'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { CoastalAggFunc } from '@/types/coastal';

export interface IndicatorSidebarProps {
  selectedIndicators: string[];
  onToggleIndicator: (indicatorId: string) => void;
  aggFunc: CoastalAggFunc | string;
  onChangeAggFunc: (agg: CoastalAggFunc) => void;
}

const AVAILABLE_INDICATORS = [
  { id: 'vessels', label: 'Vessel Count', description: 'No. of maritime vessels' },
  { id: 'duration', label: 'Vessel Port Call Duration', description: 'Hours' },
  { id: 'chlor_a', label: 'Chlorophyll-a', description: 'mg/m³' },
  { id: 'sst', label: 'Sea Surface Temperature', description: '°C' },
];

export function IndicatorSidebar({
  selectedIndicators,
  onToggleIndicator,
  aggFunc,
  onChangeAggFunc,
}: IndicatorSidebarProps) {
  const atMax = selectedIndicators.length >= 2;

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {/* Legend Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Legend
          </Typography>
          <Stack spacing={1}>
            {selectedIndicators.map((ind, i) => {
              const item = AVAILABLE_INDICATORS.find((x) => x.id === ind);
              const color = i === 0 ? '#3B82F6' : '#EF4444';
              return (
                <Stack key={ind} direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 18,
                      height: 3,
                      borderRadius: 1,
                      backgroundColor: color,
                    }}
                  />
                  <Typography variant="body2">{item?.label || ind}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Indicators Checklist & Aggregation Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Indicators (max 2)
          </Typography>
          <FormGroup sx={{ mb: 2 }}>
            {AVAILABLE_INDICATORS.map((ind) => {
              const isSelected = selectedIndicators.includes(ind.id);
              const disabled = !isSelected && atMax;
              return (
                <FormControlLabel
                  key={ind.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => onToggleIndicator(ind.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ind.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ind.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 1 }}
                />
              );
            })}
          </FormGroup>

          <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Aggregation
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={aggFunc}
                onChange={(e) => onChangeAggFunc(e.target.value as CoastalAggFunc)}
              >
                <MenuItem value="average">Average</MenuItem>
                <MenuItem value="maximum">Maximum</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default IndicatorSidebar;
