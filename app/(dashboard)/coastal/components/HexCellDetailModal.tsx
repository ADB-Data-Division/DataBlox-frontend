'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Card, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart } from '@mui/x-charts/LineChart';
import { fetchHexCellTimeSeries } from '@/services/coastalService';
import type { HexCellTimeSeriesPoint } from '@/types/coastal';

export interface HexCellDetailModalProps {
  cellId?: string | null;
  locationName: string;
  country?: string;
  grain?: string;
  dateRange: { start: string; end: string };
  indicators: string[];
  onClose: () => void;
}

const INDICATOR_CONFIG: Record<
  string,
  { label: string; unit: string; color: string; defaultRange: [number, number] }
> = {
  chlor_a: {
    label: 'Chlorophyll-a',
    unit: 'mg/m³',
    color: '#3B82F6',
    defaultRange: [0, 5],
  },
  vessels: {
    label: 'Vessel Count',
    unit: 'vessels',
    color: '#EF4444',
    defaultRange: [0, 200],
  },
  sst: {
    label: 'Sea Surface Temp.',
    unit: 'K',
    color: '#A855F7',
    defaultRange: [290, 310],
  },
  duration: {
    label: 'Port Call Duration',
    unit: 'hours',
    color: '#F59E0B',
    defaultRange: [0, 150],
  },
};

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function HexCellDetailModal({
  cellId,
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
    if (!cellId || !country) {
      setRealPoints(null);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchHexCellTimeSeries({
      country,
      cell_id: cellId,
      start_date: dateRange.start,
      end_date: dateRange.end,
      grain,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res?.series && Array.isArray(res.series)) {
          setRealPoints(res.series);
        } else {
          setRealPoints([]);
        }
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
  }, [cellId, country, dateRange.start, dateRange.end, grain]);

  const timeSeries = useMemo(() => {
    if (!realPoints || realPoints.length === 0) {
      return { months: [], chlor_a: [], vessels: [], sst: [], duration: [] };
    }
    return {
      months: realPoints.map((pt) => pt.period_start.slice(0, 7)),
      chlor_a: realPoints.map((pt) => (pt.chlor_a !== null && pt.chlor_a !== undefined ? pt.chlor_a : 0)),
      vessels: realPoints.map((pt) => (pt.vessels !== null && pt.vessels !== undefined ? pt.vessels : 0)),
      sst: realPoints.map((pt) => (pt.sst !== null && pt.sst !== undefined ? pt.sst : 0)),
      duration: realPoints.map((pt) => (pt.duration !== null && pt.duration !== undefined ? pt.duration : 0)),
    };
  }, [realPoints]);

  if (!cellId) {
    return (
      <Card
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          minHeight: 180,
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

  if (primaryConfig) {
    const dataArray = (timeSeries as any)[primaryId] || timeSeries.chlor_a;
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
    const dataArray = (timeSeries as any)[secondaryId] || timeSeries.vessels;
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
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Hex: {cellId}
          </Typography>
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
              ...(secondaryConfig
                ? {
                    [`& .MuiMarkElement-series-${secondaryId}`]: {
                      fill: `${secondaryConfig.color} !important`,
                      stroke: `${secondaryConfig.color} !important`,
                      strokeWidth: 1,
                      scale: '0.55',
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
