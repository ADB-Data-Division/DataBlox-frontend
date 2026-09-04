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
import { INDICATORS_CONFIG } from './IndicatorTimelineChart';

export interface IndicatorSidebarProps {
  selectedIndicators: string[];
  onToggleIndicator: (indicatorId: string) => void;
  aggFunc: CoastalAggFunc | string;
  onChangeAggFunc: (agg: CoastalAggFunc) => void;
  mode?: 'timeline' | 'map';
  activeChoroplethIndicator?: string;
  onChangeChoroplethIndicator?: (ind: string) => void;
}

const AVAILABLE_INDICATORS = [
  { id: 'vessels', label: 'Vessel Count', description: 'No. of maritime vessels' },
  { id: 'duration', label: 'Vessel Port Call Duration', description: 'Hours' },
  { id: 'chlor_a', label: 'Chlorophyll-a', description: 'mg/m³' },
  { id: 'sst', label: 'Sea Surface Temperature', description: 'K' },
];

export function IndicatorSidebar({
  selectedIndicators,
  onToggleIndicator,
  aggFunc,
  onChangeAggFunc,
  mode = 'timeline',
  activeChoroplethIndicator = 'chlor_a',
  onChangeChoroplethIndicator,
}: IndicatorSidebarProps) {
  const maxCount = mode === 'map' ? 3 : 2;
  const atMax = selectedIndicators.length >= maxCount;
  const showVesselOverlay = selectedIndicators.includes('vessels');
  const hasChlor = selectedIndicators.includes('chlor_a');
  const hasSST = selectedIndicators.includes('sst');
  const bothEnvSelected = hasChlor && hasSST;

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {/* Legend Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Legend
          </Typography>

          {mode === 'timeline' ? (
            <Stack spacing={1}>
              {selectedIndicators.map((ind) => {
                const item = AVAILABLE_INDICATORS.find((x) => x.id === ind);
                const cfg = INDICATORS_CONFIG[ind];
                const color = cfg?.color || '#3B82F6';
                const label = cfg?.label || item?.label || ind;
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
                    <Typography variant="body2">{label}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {showVesselOverlay && (
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                  Numbers = Vessel Count
                </Typography>
              )}

              {/* Both Chlorophyll-a and SST Selected: Stack both colorbars and show switcher dropdown */}
              {bothEnvSelected ? (
                <>
                  <Box
                    sx={{
                      opacity: activeChoroplethIndicator === 'chlor_a' ? 1 : 0.35,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Chlorophyll-a (mg/m³)
                    </Typography>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
                        mb: 0.5,
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>0</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>20</Typography>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      opacity: activeChoroplethIndicator === 'sst' ? 1 : 0.35,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Sea Surface Temp. (K)
                    </Typography>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        background: 'linear-gradient(to right, #fee2e2, #f87171, #b91c1c)',
                        mb: 0.5,
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>290</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>310</Typography>
                    </Stack>
                  </Box>

                  {onChangeChoroplethIndicator && (
                    <Box sx={{ mt: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={activeChoroplethIndicator}
                          onChange={(e) => onChangeChoroplethIndicator(e.target.value)}
                        >
                          <MenuItem value="chlor_a">Chlorophyll-a</MenuItem>
                          <MenuItem value="sst">Sea Surface Temp.</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </>
              ) : hasSST || activeChoroplethIndicator === 'sst' ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Sea Surface Temp. (K)
                  </Typography>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      background: 'linear-gradient(to right, #fee2e2, #f87171, #b91c1c)',
                      mb: 0.5,
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>290</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>310</Typography>
                  </Stack>
                </Box>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Chlorophyll-a (mg/m³)
                  </Typography>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
                      mb: 0.5,
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>0</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>20</Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Indicators Checklist & Aggregation Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {mode === 'map' ? 'Indicators' : 'Indicators (max 2)'}
          </Typography>
          <FormGroup sx={{ mb: 2 }}>
            {AVAILABLE_INDICATORS.map((ind) => {
              const isSelected = selectedIndicators.includes(ind.id);
              const disabled = !isSelected && atMax;
              const cfg = INDICATORS_CONFIG[ind.id];
              return (
                <FormControlLabel
                  key={ind.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => onToggleIndicator(ind.id)}
                      sx={
                        cfg?.color
                          ? {
                              '&.Mui-checked': {
                                color: cfg.color,
                              },
                            }
                          : undefined
                      }
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
