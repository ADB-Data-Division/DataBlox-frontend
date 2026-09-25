'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Card, CircularProgress, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart } from '@mui/x-charts/LineChart';
import { fetchHexCellTimeSeries } from '@/services/coastalService';
import type { HexCellTimeSeriesPoint } from '@/types/coastal';

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

// Vessel/duration counts add up across hexes; concentration/temperature readings are averaged.
// Missing chlor_a/sst stay null so the chart renders a gap, never a fake 0.
function aggregatePoint(points: HexCellTimeSeriesPoint[], field: 'chlor_a' | 'sst' | 'vessels' | 'duration') {
  const values = points.map((p) => (p as any)[field]).filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (values.length === 0) return field === 'vessels' || field === 'duration' ? 0 : null;
  const sum = values.reduce((acc: number, v: number) => acc + Number(v), 0);
  return field === 'vessels' || field === 'duration' ? sum : sum / values.length;
}

const INDICATOR_CONFIG: Record<
  string,
  { label: string; unit: string; color: string; defaultRange: [number, number] }
> = {
  chlor_a: {
    label: 'Chlorophyll-a',
    unit: 'mg/m³',
    color: '#10B981',
    defaultRange: [0, 5],
  },
  vessels: {
    label: 'Vessel Count',
    unit: 'vessels',
    color: '#8B5CF6',
    defaultRange: [0, 200],
  },
  duration: {
    label: 'Port Call Duration',
    unit: 'hours',
    color: '#3B82F6',
    defaultRange: [0, 150],
  },
  sst: {
    label: 'Sea Surface Temp.',
    unit: 'K',
    color: '#F97316',
    defaultRange: [290, 310],
  },
};

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// X-axis labels must stay unique per data point. Truncating weekly
// period_starts (YYYY-MM-DD) to YYYY-MM collapses 4-5 weeks onto one
// point-scale category, which renders as vertical zigzag spikes.
function toXLabel(periodStart: string, grainKey: string): string {
  const raw = periodStart || '';
  if (grainKey === 'annually') return raw.slice(0, 4);
  if (grainKey === 'weekly') return raw.slice(0, 10);
  return raw.slice(0, 7);
}

function formatXTick(value: string, grainKey: string): string {
  if (!value) return '';
  if (grainKey === 'annually') return value.slice(0, 4);
  const parts = value.split('-');
  // Monthly values are YYYY-MM; weekly values are YYYY-MM-DD.
  // Label January ticks with the year, leave the rest blank.
  if (parts.length >= 2 && parts[1] === '01') return parts[0];
  return '';
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
          combined.push({
            ...pointsAtIndex[0],
            chlor_a: aggregatePoint(pointsAtIndex, 'chlor_a'),
            sst: aggregatePoint(pointsAtIndex, 'sst'),
            vessels: aggregatePoint(pointsAtIndex, 'vessels'),
            duration: aggregatePoint(pointsAtIndex, 'duration'),
          });
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

  const grainKey = (grain || 'monthly').toLowerCase();

  const timeSeries = useMemo(() => {
    if (!realPoints || realPoints.length === 0) {
      return { xLabels: [], chlor_a: [], vessels: [], sst: [], duration: [] };
    }
    return {
      xLabels: realPoints.map((pt) => toXLabel(pt.period_start, grainKey)),
      chlor_a: realPoints.map((pt) => (pt.chlor_a !== null && pt.chlor_a !== undefined ? pt.chlor_a : null)),
      vessels: realPoints.map((pt) => (pt.vessels !== null && pt.vessels !== undefined ? pt.vessels : 0)),
      sst: realPoints.map((pt) => (pt.sst !== null && pt.sst !== undefined ? pt.sst : null)),
      duration: realPoints.map((pt) => (pt.duration !== null && pt.duration !== undefined ? pt.duration : 0)),
    };
  }, [realPoints, grain, grainKey]);

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

  const primaryConfig = INDICATOR_CONFIG[primaryId] || {
    label: primaryId,
    unit: '',
    color: '#3B82F6',
    defaultRange: [0, 10],
  };

  const secondaryConfig = secondaryId
    ? INDICATOR_CONFIG[secondaryId] || {
        label: secondaryId,
        unit: '',
        color: '#EF4444',
        defaultRange: [0, 100],
      }
    : null;

  const series: any[] = [];
  const yAxisConfig: any[] = [];

  // Weekly series carry ~350+ points; markers on every point overplot into
  // vertical blobs, so only draw them on sparse (monthly/annual) series.
  const pointCount = timeSeries.xLabels.length;
  const showMarks = pointCount <= 120;

  if (primaryConfig) {
    const dataArray = (timeSeries as any)[primaryId] || timeSeries.chlor_a;
    series.push({
      id: primaryId,
      data: dataArray,
      yAxisId: 'leftAxis',
      color: primaryConfig.color,
      label: primaryConfig.label,
      showMark: showMarks,
      connectNulls: false,
    });
    yAxisConfig.push({
      id: 'leftAxis',
      label: `${primaryConfig.label} (${primaryConfig.unit})`,
    });
  }

  if (secondaryConfig) {
    const dataArray = (timeSeries as any)[secondaryId] || timeSeries.vessels;
    series.push({
      id: secondaryId,
      data: dataArray,
      yAxisId: 'rightAxis',
      color: secondaryConfig.color,
      label: secondaryConfig.label,
      showMark: showMarks,
      connectNulls: false,
    });
    yAxisConfig.push({
      id: 'rightAxis',
      position: 'right' as const,
      label: `${secondaryConfig.label} (${secondaryConfig.unit})`,
    });
  }

  const dateSubtitle = `${formatMonthYear(dateRange.start)} - ${formatMonthYear(dateRange.end)}`;

  // Thin x-axis labels on dense (weekly) series so ticks and the right
  // y-axis stay inside the card instead of overflowing its space.
  const tickStep = Math.max(1, Math.ceil(pointCount / 14));

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
                </Typography>
              </Box>
            )}
            {secondaryConfig && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 3, bgcolor: secondaryConfig.color, borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {secondaryConfig.label}
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
        ) : timeSeries.xLabels.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No historical data available for this cell.
            </Typography>
          </Box>
        ) : (
          <LineChart
            height={260}
            series={series}
            xAxis={[
              {
                data: timeSeries.xLabels,
                scaleType: 'point',
                tickLabelInterval: (_value: string, index: number) => index % tickStep === 0,
                valueFormatter: (value: string) => formatXTick(value, grainKey),
              },
            ]}
            yAxis={yAxisConfig}
            margin={{ top: 20, bottom: 25, left: 60, right: secondaryConfig ? 80 : 20 }}
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
