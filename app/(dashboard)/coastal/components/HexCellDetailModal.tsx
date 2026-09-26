'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Card, CircularProgress, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart } from '@mui/x-charts/LineChart';
import { fetchHexCellTimeSeries } from '@/services/coastalService';
import type { HexCellTimeSeriesPoint } from '@/types/coastal';
import {
  NO_DATA_LABEL,
  getIndicatorMeta,
  isZeroFillIndicator,
} from '../indicators';

export interface HexCellDetailModalProps {
  cellIds?: string[];
  locationName: string;
  country?: string;
  grain?: string;
  dateRange: { start: string; end: string };
  indicators: string[];
  onClose: () => void;
}

const MAX_VISIBLE_HEX_CHIPS = 3;

// Shared fixed height so empty and filled states occupy the same slot and
// selecting/clearing a hex does not shift the choropleth map below.
const HEX_DETAIL_CARD_HEIGHT = 380;

// Aggregation across selected hexes follows the registry null policy:
// `zero_fill` indicators sum (missing means a real 0); every other
// indicator averages the non-null readings and stays null when all are
// missing, so the chart renders a gap, never a fake 0.
function readHexValue(point: HexCellTimeSeriesPoint, field: string): number | null | undefined {
  if (point.values && point.values[field] !== undefined) {
    return point.values[field];
  }
  return (point as unknown as Record<string, number | null | undefined>)[field];
}

export function aggregatePoint(points: HexCellTimeSeriesPoint[], field: string): number | null {
  const values = points
    .map((p) => readHexValue(p, field))
    .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (values.length === 0) return isZeroFillIndicator(field) ? 0 : null;
  const sum = values.reduce((acc: number, v: number) => acc + Number(v), 0);
  if (isZeroFillIndicator(field)) return sum;
  const meta = getIndicatorMeta(field);
  if (meta?.agg === 'max') return Math.max(...values);
  if (meta?.agg === 'min') return Math.min(...values);
  if (meta?.agg === 'sum') return sum;
  return sum / values.length;
}

interface HexIndicatorConfig {
  label: string;
  unit: string;
  color: string;
  defaultRange: [number, number];
}

function configForHex(id: string): HexIndicatorConfig {
  const meta = getIndicatorMeta(id);
  if (!meta) {
    return { label: id, unit: '', color: '#3B82F6', defaultRange: [0, 10] };
  }
  const [lo, hi] = meta.mapDomain;
  return { label: meta.label, unit: meta.unit, color: meta.color, defaultRange: [lo, hi] };
}

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function HexCellDetailModal({
  cellIds = [],
  locationName,
  country,
  grain = 'monthly',
  dateRange,
  indicators,
  onClose,
}: HexCellDetailModalProps) {
  const [realPoints, setRealPoints] = useState<HexCellTimeSeriesPoint[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (cellIds.length === 0 || !country) {
      setRealPoints(null);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    Promise.all(
      cellIds.map((cell_id) =>
        fetchHexCellTimeSeries({
          country,
          cell_id,
          start_date: dateRange.start,
          end_date: dateRange.end,
          grain,
        }).catch(() => null)
      )
    )
      .then((results) => {
        if (!isMounted) return;
        const seriesList = results
          .map((res) => (res?.series && Array.isArray(res.series) ? res.series : []))
          .filter((series) => series.length > 0);

        if (seriesList.length === 0) {
          setRealPoints([]);
          return;
        }
        if (seriesList.length === 1) {
          setRealPoints(seriesList[0]);
          return;
        }

        // Aggregate across selected hexes, aligning points by index (they share the same date range/grain).
        const pointCount = Math.max(...seriesList.map((s) => s.length));
        const combined: HexCellTimeSeriesPoint[] = [];
        for (let i = 0; i < pointCount; i++) {
          const pointsAtIndex = seriesList.map((s) => s[i]).filter(Boolean);
          if (pointsAtIndex.length === 0) continue;
          const base: HexCellTimeSeriesPoint = { ...pointsAtIndex[0] };
          const fields = new Set<string>(['chlor_a', 'sst', 'vessels', 'duration']);
          for (const p of pointsAtIndex) {
            Object.keys(p.values || {}).forEach((k) => fields.add(k));
          }
          const values: Record<string, number | null> = { ...(base.values || {}) };
          for (const field of fields) {
            (base as unknown as Record<string, number | null>)[field] = aggregatePoint(pointsAtIndex, field);
            values[field] = aggregatePoint(pointsAtIndex, field);
          }
          base.values = values;
          combined.push(base);
        }
        setRealPoints(combined);
      })
      .catch(() => {
        if (isMounted) setRealPoints([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cellIds, country, dateRange.start, dateRange.end, grain]);

  const timeSeries = useMemo(() => {
    if (!realPoints || realPoints.length === 0) {
      return { months: [] as string[], seriesById: {} as Record<string, (number | null)[]> };
    }
    const ids = new Set<string>(['chlor_a', 'vessels', 'sst', 'duration', ...indicators]);
    for (const pt of realPoints) {
      Object.keys(pt.values || {}).forEach((k) => ids.add(k));
    }
    const seriesById: Record<string, (number | null)[]> = {};
    for (const id of ids) {
      seriesById[id] = realPoints.map((pt) => {
        const v = readHexValue(pt, id);
        if (v === null || v === undefined || Number.isNaN(Number(v))) {
          // Only zero_fill indicators default missing to 0; the rest stay
          // null so the chart renders a gap.
          return isZeroFillIndicator(id) ? 0 : null;
        }
        return Number(v);
      });
    }
    return {
      months: realPoints.map((pt) => pt.period_start.slice(0, 7)),
      seriesById,
    };
  }, [realPoints, indicators]);

  if (cellIds.length === 0) {
    return (
      <Card
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          height: HEX_DETAIL_CARD_HEIGHT,
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a hex on the map to view more details
        </Typography>
      </Card>
    );
  }

  const activeIndicators = indicators.length > 0 ? indicators.slice(0, 2) : ['chlor_a', 'vessels'];
  const primaryId = activeIndicators[0] || 'chlor_a';
  const secondaryId = activeIndicators[1];

  const primaryConfig = configForHex(primaryId);

  const secondaryConfig = secondaryId ? configForHex(secondaryId) : null;

  const seriesHasData = (id: string): boolean =>
    (timeSeries.seriesById[id] || []).some((v) => v !== null && v !== undefined);

  const series: any[] = [];
  const yAxisConfig: any[] = [];

  if (primaryConfig) {
    const dataArray = timeSeries.seriesById[primaryId] || [];
    series.push({
      id: primaryId,
      data: dataArray,
      yAxisId: 'leftAxis',
      color: primaryConfig.color,
      label: primaryConfig.label,
      showMark: true,
    });
    yAxisConfig.push({
      id: 'leftAxis',
      label: `${primaryConfig.label} (${primaryConfig.unit})`,
    });
  }

  if (secondaryConfig) {
    const dataArray = timeSeries.seriesById[secondaryId] || [];
    series.push({
      id: secondaryId,
      data: dataArray,
      yAxisId: 'rightAxis',
      color: secondaryConfig.color,
      label: secondaryConfig.label,
      showMark: true,
    });
    yAxisConfig.push({
      id: 'rightAxis',
      position: 'right' as const,
      label: `${secondaryConfig.label} (${secondaryConfig.unit})`,
    });
  }

  const dateSubtitle = `${formatMonthYear(dateRange.start)} - ${formatMonthYear(dateRange.end)}`;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        p: 2.5,
        height: HEX_DETAIL_CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden', gap: 0.75 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Hex:
            </Typography>
            {cellIds.slice(0, MAX_VISIBLE_HEX_CHIPS).map((id) => (
              <Chip key={id} label={id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', flexShrink: 0 }} />
            ))}
            {cellIds.length > MAX_VISIBLE_HEX_CHIPS && (
              <Chip
                size="small"
                variant="outlined"
                label={`${cellIds.length - MAX_VISIBLE_HEX_CHIPS} more...`}
                sx={{ flexShrink: 0 }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {locationName} · {dateSubtitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, textAlign: 'center', px: 2 }}>
          {indicators.length >= 3 && (
            <Typography variant="body2" sx={{ color: '#ea580c', fontWeight: 600 }}>
              Note: Only up to two lines can be displayed at a time.
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {primaryConfig && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 3, bgcolor: primaryConfig.color, borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {primaryConfig.label}
                  {!seriesHasData(primaryId) && !loading ? ` (${NO_DATA_LABEL})` : ''}
                </Typography>
              </Box>
            )}
            {secondaryConfig && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 3, bgcolor: secondaryConfig.color, borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {secondaryConfig.label}
                  {secondaryId && !seriesHasData(secondaryId) && !loading ? ` (${NO_DATA_LABEL})` : ''}
                </Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close details">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: 260 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={32} />
          </Box>
        ) : timeSeries.months.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No historical data available for this cell.
            </Typography>
          </Box>
        ) : (
          <LineChart
            series={series}
            xAxis={[
              {
                data: timeSeries.months,
                scaleType: 'point',
                valueFormatter: (value: string) => {
                  const parts = value.split('-');
                  if (parts[1] === '01') return parts[0];
                  return '';
                },
              },
            ]}
            yAxis={yAxisConfig}
            margin={{ top: 20, bottom: 25, left: 60, right: secondaryConfig ? 65 : 20 }}
            slotProps={{ legend: { hidden: true } }}
            sx={{
              [`& .MuiMarkElement-series-${primaryId}`]: {
                fill: `${primaryConfig.color} !important`,
                stroke: `${primaryConfig.color} !important`,
                strokeWidth: 1,
                scale: '0.55',
              },
              '& .MuiChartsAxis-left .MuiChartsAxis-label': {
                fill: `${primaryConfig.color} !important`,
                fontWeight: 700,
              },
              '& .MuiChartsAxis-left .MuiChartsAxis-tickLabel': {
                fill: `${primaryConfig.color} !important`,
                fontWeight: 600,
              },
              '& .MuiChartsAxis-left .MuiChartsAxis-line': {
                stroke: `${primaryConfig.color} !important`,
              },
              '& .MuiChartsAxis-left .MuiChartsAxis-tick': {
                stroke: `${primaryConfig.color} !important`,
              },
              ...(secondaryConfig
                ? {
                    [`& .MuiMarkElement-series-${secondaryId}`]: {
                      fill: `${secondaryConfig.color} !important`,
                      stroke: `${secondaryConfig.color} !important`,
                      strokeWidth: 1,
                      scale: '0.55',
                    },
                    '& .MuiChartsAxis-right .MuiChartsAxis-label': {
                      fill: `${secondaryConfig.color} !important`,
                      fontWeight: 700,
                    },
                    '& .MuiChartsAxis-right .MuiChartsAxis-tickLabel': {
                      fill: `${secondaryConfig.color} !important`,
                      fontWeight: 600,
                    },
                    '& .MuiChartsAxis-right .MuiChartsAxis-line': {
                      stroke: `${secondaryConfig.color} !important`,
                    },
                    '& .MuiChartsAxis-right .MuiChartsAxis-tick': {
                      stroke: `${secondaryConfig.color} !important`,
                    },
                  }
                : {}),
              '& .MuiLineElement-root': {
                strokeWidth: 2,
              },
            }}
          />
        )}
      </Box>
    </Card>
  );
}
