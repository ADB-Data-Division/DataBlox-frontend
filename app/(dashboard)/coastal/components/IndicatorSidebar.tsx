'use client';

import React, { useMemo, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import type { CoastalAggFunc } from '@/types/coastal';
import {
  COASTAL_INDICATORS,
  COASTAL_INDICATOR_GROUPS,
  NO_DATA_COLOR,
  NO_DATA_LABEL,
  getIndicatorMeta,
} from '../indicators';

export interface IndicatorSidebarProps {
  selectedIndicators: string[];
  onToggleIndicator: (indicatorId: string) => void;
  aggFunc: CoastalAggFunc | string;
  onChangeAggFunc: (agg: CoastalAggFunc) => void;
  mode?: 'timeline' | 'map';
  activeChoroplethIndicator?: string;
  onChangeChoroplethIndicator?: (ind: string) => void;
}

function gradientFor(id: string): string {
  const meta = getIndicatorMeta(id);
  if (!meta) return '#3B82F6';
  const [low, mid, high] = meta.mapColors.length === 3
    ? meta.mapColors
    : [meta.mapColors[0], meta.mapColors[1], meta.mapColors[1]];
  return `linear-gradient(to right, ${low}, ${mid}, ${high})`;
}

function ChoroplethColorbar({ indicatorId, dimmed }: { indicatorId: string; dimmed: boolean }) {
  const meta = getIndicatorMeta(indicatorId);
  if (!meta) return null;
  return (
    <Box sx={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.2s' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {meta.shortLabel} ({meta.unit})
      </Typography>
      <Box sx={{ height: 8, borderRadius: 1, background: gradientFor(indicatorId), mb: 0.5 }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{meta.mapDomain[0]}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{meta.mapDomain[1]}</Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
        <Box sx={{ width: 12, height: 8, borderRadius: 0.5, backgroundColor: NO_DATA_COLOR }} />
        <Typography variant="caption" color="text.secondary">{NO_DATA_LABEL}</Typography>
      </Stack>
    </Box>
  );
}

export function IndicatorSidebar({
  selectedIndicators,
  onToggleIndicator,
  aggFunc,
  onChangeAggFunc,
  mode = 'timeline',
  activeChoroplethIndicator = 'chlor_a',
  onChangeChoroplethIndicator,
}: IndicatorSidebarProps) {
  const [search, setSearch] = useState('');
  const maxCount = mode === 'map' ? 3 : 2;
  const atMax = selectedIndicators.length >= maxCount;
  const showVesselOverlay = selectedIndicators.includes('vessels');
  const query = search.trim().toLowerCase();

  const visibleGroups = useMemo(
    () =>
      COASTAL_INDICATOR_GROUPS.map(({ group, ids }) => ({
        group,
        ids: ids.filter((id) => {
          if (!query) return true;
          const meta = getIndicatorMeta(id);
          return (
            meta?.label.toLowerCase().includes(query) ||
            id.toLowerCase().includes(query) ||
            meta?.unit.toLowerCase().includes(query)
          );
        }),
      })).filter(({ ids }) => ids.length > 0),
    [query],
  );

  // Map-mode legend: one colorbar per selected map-capable indicator, with a
  // switcher when more than one is selected. Temperature is always °C.
  const mapLegendIds = useMemo(() => {
    const ids = selectedIndicators.filter((id) => {
      const meta = getIndicatorMeta(id);
      return meta?.supports_map && id !== 'vessels';
    });
    if (ids.length === 0) {
      return [activeChoroplethIndicator].filter((id) => getIndicatorMeta(id));
    }
    return ids;
  }, [selectedIndicators, activeChoroplethIndicator]);

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
                const meta = getIndicatorMeta(ind);
                const color = meta?.color || '#3B82F6';
                const label = meta?.label || ind;
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

              {mapLegendIds.map((id) => (
                <ChoroplethColorbar
                  key={id}
                  indicatorId={id}
                  dimmed={mapLegendIds.length > 1 && id !== activeChoroplethIndicator}
                />
              ))}

              {mapLegendIds.length > 1 && onChangeChoroplethIndicator && (
                <Box sx={{ mt: 1 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={activeChoroplethIndicator}
                      onChange={(e) => onChangeChoroplethIndicator(e.target.value)}
                    >
                      {mapLegendIds.map((id) => (
                        <MenuItem key={id} value={id}>
                          {getIndicatorMeta(id)?.label || id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
          <TextField
            size="small"
            fullWidth
            placeholder="Search indicators"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 1.5 }}
            aria-label="Search indicators"
          />
          {visibleGroups.map(({ group, ids }) => (
            <Box key={group} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {group}
              </Typography>
              <FormGroup sx={{ mb: 1 }}>
                {ids.map((id) => {
                  const meta = getIndicatorMeta(id);
                  if (!meta) return null;
                  const isSelected = selectedIndicators.includes(id);
                  const disabled = !isSelected && atMax;
                  return (
                    <FormControlLabel
                      key={id}
                      control={
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => onToggleIndicator(id)}
                          sx={{
                            '&.Mui-checked': {
                              color: meta.color,
                            },
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {meta.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meta.unit}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', mb: 0.5 }}
                    />
                  );
                })}
              </FormGroup>
            </Box>
          ))}
          {visibleGroups.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No indicators match “{search}”.
            </Typography>
          )}

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

// Re-exported so existing imports keep working; prefer the registry module.
export { COASTAL_INDICATORS };
