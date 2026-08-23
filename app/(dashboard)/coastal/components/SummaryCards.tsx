'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { IndicatorSummaryCard, IndicatorTimelinePoint, IndicatorTimelineSummary } from '@/types/coastal';

export interface SummaryCardsProps {
  summary?: IndicatorTimelineSummary;
  indicators: string[];
  locationName: string;
  dateRange: { start: string; end: string };
  timeline?: IndicatorTimelinePoint[];
}

interface IndicatorConfig {
  icon: string;
  label: string;
  unit: string;
  defaultTotal: string;
  defaultPeak: string;
  peakDate: string;
  totalLabel: string;
  peakLabel: string;
}

const CONFIG_MAP: Record<string, IndicatorConfig> = {
  vessels: {
    icon: '🚢',
    label: 'Vessel Count',
    unit: 'vessels',
    defaultTotal: '2,529',
    defaultPeak: '69',
    peakDate: 'Jun 2025',
    totalLabel: 'Total Vessels (Entire Time Range)',
    peakLabel: 'Peak Vessel Count (Monthly):',
  },
  duration: {
    icon: '⏱️',
    label: 'Port Call Duration',
    unit: 'hours',
    defaultTotal: '72.2',
    defaultPeak: '542.2',
    peakDate: 'Jan 2019',
    totalLabel: 'Average Duration (Entire Time Range)',
    peakLabel: 'Peak Duration (Monthly):',
  },
  chlor_a: {
    icon: '🟢',
    label: 'Chlorophyll-a Levels',
    unit: 'mg/m³',
    defaultTotal: '2.64',
    defaultPeak: '6.84',
    peakDate: 'Jul 2019',
    totalLabel: 'Average Concentration (Entire Time Range)',
    peakLabel: 'Peak Concentration (Monthly):',
  },
  sst: {
    icon: '🌡️',
    label: 'Sea Surface Temperature Levels',
    unit: '°C',
    defaultTotal: '28.6',
    defaultPeak: '31.2',
    peakDate: 'May 2023',
    totalLabel: 'Average Temperature (Time Range)',
    peakLabel: 'Peak Temperature (Monthly):',
  },
};

function SingleSummaryCard({
  indicatorKey,
  summaryCard,
  locationName,
  dateRange,
}: {
  indicatorKey: string;
  summaryCard?: IndicatorSummaryCard;
  locationName: string;
  dateRange: { start: string; end: string };
}) {
  const theme = useTheme();
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const cfg = CONFIG_MAP[indicatorKey] || {
    icon: '📊',
    label: indicatorKey,
    unit: '',
    defaultTotal: '0',
    defaultPeak: '0',
    peakDate: 'N/A',
    totalLabel: 'Average (Entire Time Range)',
    peakLabel: 'Peak Value:',
  };

  const isVessel = indicatorKey === 'vessels';
  const totalVal = summaryCard?.cumulative !== undefined
    ? summaryCard.cumulative.toLocaleString()
    : summaryCard?.average !== undefined
    ? summaryCard.average.toFixed(2)
    : cfg.defaultTotal;

  const peakVal = summaryCard?.peak !== undefined
    ? summaryCard.peak.toLocaleString()
    : cfg.defaultPeak;

  const tooltipFormula = isVessel
    ? `The sum of maritime vessels between the time range: ${dateRange.start} to ${dateRange.end}`
    : `The average is the sum of ${cfg.label.toLowerCase()} values divided by the number of observations between the time range: ${dateRange.start} to ${dateRange.end}`;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 2,
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 0.5,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{cfg.icon}</Typography>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {cfg.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {locationName} · {dateRange.start} to {dateRange.end}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ minHeight: 90 }}>
          {activeSlide === 0 ? (
            <Tooltip title={tooltipFormula} arrow placement="top">
              <Box sx={{ cursor: 'help' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {cfg.totalLabel}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {totalVal} {cfg.unit}
                </Typography>
              </Box>
            </Tooltip>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {cfg.peakLabel}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {peakVal} {cfg.unit}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Observed on: {cfg.peakDate}
              </Typography>
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setActiveSlide(0)}
            aria-label="Slide 1 Total or Average"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              backgroundColor: activeSlide === 0 ? theme.palette.primary.main : theme.palette.grey[300],
              transition: 'background-color 0.2s',
            }}
          />
          <Box
            component="button"
            type="button"
            onClick={() => setActiveSlide(1)}
            aria-label="Slide 2 Peak"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              backgroundColor: activeSlide === 1 ? theme.palette.primary.main : theme.palette.grey[300],
              transition: 'background-color 0.2s',
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  summary,
  indicators,
  locationName,
  dateRange,
}: SummaryCardsProps) {
  if (!indicators || indicators.length === 0) {
    return null;
  }

  const activeIndicators = indicators.slice(0, 2);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', height: '100%' }}>
      {activeIndicators.map((indKey) => {
        let summaryCard: IndicatorSummaryCard | undefined;
        if (summary) {
          if (indKey === 'chlor_a') summaryCard = summary.chlor_a;
          else if (indKey === 'sst') summaryCard = summary.sea_surface_temperature;
          else if (indKey === 'duration') summaryCard = summary.port_call_duration;
          else if (indKey === 'vessels') summaryCard = summary.vessels;
        }

        return (
          <Box key={indKey} sx={{ flex: 1, minWidth: 0 }}>
            <SingleSummaryCard
              indicatorKey={indKey}
              summaryCard={summaryCard}
              locationName={locationName}
              dateRange={dateRange}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export default SummaryCards;
