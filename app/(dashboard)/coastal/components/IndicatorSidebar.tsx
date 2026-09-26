'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  // Far-zoom cluster toggle (rendered below Aggregation in map mode only).
  // Omitted = no toggle shown.
  clustersEnabled?: boolean;
  onChangeClustersEnabled?: (enabled: boolean) => void;
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
  clustersEnabled = true,
  onChangeClustersEnabled,
}: IndicatorSidebarProps) {
  const [search, setSearch] = useState('');
  // Explicit user toggles per group. Unset = open only if the group holds a selection.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
          {selectedIndicators.length > 0 && (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
              {selectedIndicators.map((id) => (
                <Chip
                  key={id}
                  size="small"
                  label={getIndicatorMeta(id)?.shortLabel || id}
                  onDelete={() => onToggleIndicator(id)}
                  sx={{ borderLeft: `4px solid ${getIndicatorMeta(id)?.color || '#3B82F6'}` }}
                />
              ))}
            </Stack>
          )}
          <TextField
            size="small"
            fullWidth
            placeholder="Search indicators"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 1 }}
            aria-label="Search indicators"
          />
          <Box sx={{ maxHeight: 420, overflowY: 'auto', mb: 1 }}>
            {visibleGroups.map(({ group, ids }) => {
              const hasSelected = ids.some((id) => selectedIndicators.includes(id));
              const open = query ? true : openGroups[group] ?? hasSelected;
              return (
                <Box key={group}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    component="button"
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !open }))}
                    sx={{
                      width: '100%',
                      py: 0.75,
                      px: 0,
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                      color: 'text.secondary',
                      textAlign: 'left',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      {group} ({ids.length})
                    </Typography>
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    />
                  </Stack>
                  <Collapse in={open} unmountOnExit>
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
                                  py: 0.25,
                                  '&.Mui-checked': {
                                    color: meta.color,
                                  },
                                }}
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {meta.label}{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                  · {meta.unit}
                                </Typography>
                              </Typography>
                            }
                          />
                        );
                      })}
                    </FormGroup>
                  </Collapse>
                </Box>
              );
            })}
          {visibleGroups.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No indicators match “{search}”.
            </Typography>
          )}
          </Box>

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

          {mode === 'map' && onChangeClustersEnabled && (
            <Box sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={clustersEnabled}
                    onChange={(e) => onChangeClustersEnabled(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Enable clusters
                  </Typography>
                }
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default IndicatorSidebar;

// Re-exported so existing imports keep working; prefer the registry module.
export { COASTAL_INDICATORS };
