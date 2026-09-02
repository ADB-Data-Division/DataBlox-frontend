'use client';

import React, { useMemo } from 'react';
import { Box, Typography, IconButton, Card } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart } from '@mui/x-charts/LineChart';

export interface HexCellDetailModalProps {
  cellId?: string | null;
  locationName: string;
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

// Generate multi-year monthly series (2019 to 2026) for the selected hex cell
function generateCellTimeSeries(cellId: string) {
  const months: string[] = [];
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const chlorData: number[] = [];
  const vesselData: number[] = [];
  const sstData: number[] = [];
  const durationData: number[] = [];

  // Seed based on cellId to give consistent values
  let seed = 0;
  for (let i = 0; i < cellId.length; i++) {
    seed = (seed + cellId.charCodeAt(i)) % 100;
  }

  let index = 0;
  for (const year of years) {
    for (let m = 1; m <= 12; m++) {
      if (year === 2026 && m > 3) break;
      const monthStr = `${year}-${m.toString().padStart(2, '0')}`;
      months.push(monthStr);

      const seasonal = Math.sin((m / 12) * Math.PI * 2);
      const trend = (index / 80) * 0.4;
      const noise = Math.sin((index + seed) * 1.7) * 0.2;

      // Chlorophyll-a: 0.6 to 3.2 mg/m3 with peak in 2020
      let chlor = 1.1 + seasonal * 0.8 + noise + trend;
      if (year === 2020 && m >= 6 && m <= 8) {
        chlor += 2.1; // Peak in 2020 matching wireframe
      }
      chlorData.push(Math.round(Math.max(0.4, chlor) * 100) / 100);

      // Vessel Count: 80 to 150 with gradual upward trend
      const vessel = 85 + seasonal * 22 + trend * 40 + Math.sin(index * 2.3) * 12;
      vesselData.push(Math.round(Math.max(30, vessel)));

      // SST (Kelvin): 297 to 304 K
      const sst = 299.5 + seasonal * 2.5 + noise;
      sstData.push(Math.round(sst * 10) / 10);

      // Duration: 40 to 90 hours
      const dur = 55 + seasonal * 15 + noise * 10;
      durationData.push(Math.round(Math.max(15, dur) * 10) / 10);

      index++;
    }
  }

  return {
    months,
    chlor_a: chlorData,
    vessels: vesselData,
    sst: sstData,
    duration: durationData,
  };
}

export default function HexCellDetailModal({
  cellId,
  locationName,
  dateRange,
  indicators,
  onClose,
}: HexCellDetailModalProps) {
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

  const timeSeries = useMemo(() => generateCellTimeSeries(cellId), [cellId]);

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
      data: dataArray,
      yAxisId: 'leftAxis',
      color: primaryConfig.color,
      label: primaryConfig.label,
      showMark: false,
    });
    yAxisConfig.push({
      id: 'leftAxis',
      label: `${primaryConfig.label} (${primaryConfig.unit})`,
    });
  }

  if (secondaryConfig) {
    const dataArray = (timeSeries as any)[secondaryId] || timeSeries.vessels;
    series.push({
      data: dataArray,
      yAxisId: 'rightAxis',
      color: secondaryConfig.color,
      label: secondaryConfig.label,
      showMark: false,
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
          <Typography variant="body2" sx={{ color: '#ea580c', fontWeight: 600 }}>
            Note: Only up to two lines can be displayed at a time.
          </Typography>
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
        />
      </Box>
    </Card>
  );
}
