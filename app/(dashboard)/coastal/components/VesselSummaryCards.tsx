'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { VesselTimelinePoint, VesselTimelineResponse } from '@/types/coastal';

export interface VesselSummaryCardsProps {
  summary?: VesselTimelineResponse['summary'];
  metric?: string;
  locationName: string;
  dateRange: { start: string; end: string };
  timeline?: VesselTimelinePoint[];
  grain?: string;
  loading?: boolean;
  selectedPeriod?: string | null;
  onSelectPeriod?: (period: string | null) => void;
}

function MathFraction({
  numerator,
  denominator,
}: {
  numerator: React.ReactNode;
  denominator: React.ReactNode;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        verticalAlign: 'middle',
        mx: 0.5,
        lineHeight: 1.1,
      }}
    >
      <Box
        component="span"
        sx={{
          borderBottom: '1px solid currentColor',
          pb: '1px',
          px: 0.5,
          textAlign: 'center',
          display: 'block',
        }}
      >
        {numerator}
      </Box>
      <Box
        component="span"
        sx={{
          pt: '1px',
          px: 0.5,
          textAlign: 'center',
          display: 'block',
        }}
      >
        {denominator}
      </Box>
    </Box>
  );
}

function CumulativeMetricTooltip({
  unit,
  total,
  count,
  startDate,
  endDate,
}: {
  unit: string;
  total?: number;
  count: number;
  startDate: string;
  endDate: string;
}) {
  const avgPerPeriod = total !== undefined && count > 0 ? Math.round(total / count) : undefined;

  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          p: 0.75,
          borderRadius: 1,
          mb: 1,
        }}
      >
        <Box component="span" sx={{ mr: 0.5 }}>Total =</Box>
        <Box component="span" sx={{ fontSize: '13px', mr: 0.5 }}>∑</Box>
        <Box component="span">Vessels (Period 1 to N)</Box>
      </Box>

      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Time Range:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {startDate} to {endDate}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Observations (N):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {count > 0 ? `${count} periods` : 'N/A'}
          </Typography>
        </Stack>
        {avgPerPeriod !== undefined && (
          <Stack direction="row" justifyContent="space-between" spacing={1.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              Period Average:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
              ~{avgPerPeriod.toLocaleString()} {unit} / period
            </Typography>
          </Stack>
        )}
      </Stack>

      {total !== undefined && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'monospace',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            p: 0.75,
            borderRadius: 1,
          }}
        >
          <Box component="span">Cumulative Sum =</Box>
          <Box component="span" sx={{ fontWeight: 700, color: '#38bdf8', ml: 0.5 }}>
            {Math.round(total).toLocaleString()} {unit}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function AverageMetricTooltip({
  unit,
  average,
  count,
  startDate,
  endDate,
}: {
  unit: string;
  average?: number;
  count: number;
  startDate: string;
  endDate: string;
}) {
  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          p: 0.75,
          borderRadius: 1,
          mb: 1,
        }}
      >
        <Box component="span" sx={{ mr: 0.5 }}>Average =</Box>
        <MathFraction
          numerator="∑ Duration Hours"
          denominator="Count (N)"
        />
      </Box>

      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Time Range:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {startDate} to {endDate}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Observations (N):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {count > 0 ? `${count} periods` : 'N/A'}
          </Typography>
        </Stack>
      </Stack>

      {average !== undefined && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'monospace',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            p: 0.75,
            borderRadius: 1,
          }}
        >
          <Box component="span">Calculated Mean =</Box>
          <Box component="span" sx={{ fontWeight: 700, color: '#38bdf8', ml: 0.5 }}>
            {average.toFixed(2)} {unit}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function PeakMetricTooltip({
  unit,
  peakValue,
  peakDate,
  count,
  startDate,
  endDate,
}: {
  unit: string;
  peakValue?: number;
  peakDate?: string;
  count: number;
  startDate: string;
  endDate: string;
}) {
  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          p: 0.75,
          borderRadius: 1,
          mb: 1,
        }}
      >
        <Box component="span" sx={{ mr: 0.5 }}>Peak =</Box>
        <Box component="span">max( Value 1 ... N )</Box>
      </Box>

      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Time Range:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {startDate} to {endDate}
          </Typography>
        </Stack>
        {peakDate && (
          <Stack direction="row" justifyContent="space-between" spacing={1.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              Observed Period:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
              {peakDate}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Periods Scanned:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {count > 0 ? count : 'N/A'}
          </Typography>
        </Stack>
      </Stack>

      {peakValue !== undefined && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'monospace',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            p: 0.75,
            borderRadius: 1,
          }}
        >
          <Box component="span">Max Value =</Box>
          <Box component="span" sx={{ fontWeight: 700, color: '#38bdf8', ml: 0.5 }}>
            {Math.round(peakValue).toLocaleString()} {unit}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function PeriodDeltaTooltip({
  currentLabel,
  currentVal,
  baselineLabel,
  baselineVal,
  pct,
}: {
  currentLabel: string;
  currentVal: number;
  baselineLabel: string;
  baselineVal: number;
  pct: number | null;
}) {
  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          p: 0.75,
          borderRadius: 1,
          mb: 1,
        }}
      >
        <Box component="span" sx={{ mr: 0.5 }}>Change (%) =</Box>
        <MathFraction
          numerator="Current - Baseline"
          denominator="Baseline"
        />
        <Box component="span" sx={{ ml: 0.5 }}>× 100</Box>
      </Box>

      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Baseline ({baselineLabel}):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {baselineVal.toLocaleString()} vessels
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Current ({currentLabel}):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {currentVal.toLocaleString()} vessels
          </Typography>
        </Stack>
      </Stack>

      {pct !== null && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'monospace',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            p: 0.75,
            borderRadius: 1,
          }}
        >
          <Box component="span">Calculated Delta =</Box>
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              color: pct >= 0 ? '#4ade80' : '#f87171',
              ml: 0.5,
            }}
          >
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function VesselSummaryCards({
  summary,
  metric = 'Vessel Count',
  locationName,
  dateRange,
  timeline = [],
  grain = 'monthly',
  loading = false,
  selectedPeriod,
  onSelectPeriod,
}: VesselSummaryCardsProps) {
  const theme = useTheme();
  const [slide1, setSlide1] = useState<number>(0);
  const [slide2, setSlide2] = useState<number>(0);

  const isDuration = metric === 'Port Call Duration';
  const grainLabel =
    grain === 'weekly' ? 'Weekly' : grain === 'annually' ? 'Annual' : 'Monthly';
  const count = timeline.length;

  interface Card1Slide {
    title: string;
    value: string;
    count?: string;
    numericVal: number;
    color: string;
    unit: string;
  }

  // Build Card 1 Slides
  const card1Slides: Card1Slide[] = useMemo(() => {
    if (isDuration) {
      return [
        {
          title: 'Trade: Average Duration',
          value: `${summary?.category_durations?.['Trade']?.average_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Trade']?.average_duration_hours ?? 0,
          color: '#6366f1',
          unit: 'hrs',
        },
        {
          title: 'Harbor: Average Duration',
          value: `${summary?.category_durations?.['Harbor']?.average_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Harbor']?.average_duration_hours ?? 0,
          color: '#ef4444',
          unit: 'hrs',
        },
        {
          title: 'Recreation: Average Duration',
          value: `${summary?.category_durations?.['Recreation']?.average_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Recreation']?.average_duration_hours ?? 0,
          color: '#f59e0b',
          unit: 'hrs',
        },
        {
          title: 'Miscellaneous: Average Duration',
          value: `${summary?.category_durations?.['Miscellaneous']?.average_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Miscellaneous']?.average_duration_hours ?? 0,
          color: '#9ca3af',
          unit: 'hrs',
        },
      ];
    }

    return [
      {
        title: 'Top Vessel Type (Entire Time Range)',
        value: summary?.top_vessel_type || '-',
        count: summary?.top_vessel_type
          ? `${(summary?.top_vessel_type_count ?? 0).toLocaleString()} vessels`
          : undefined,
        numericVal: summary?.top_vessel_type_count ?? 0,
        color: '#6366f1',
        unit: 'vessels',
      },
      {
        title: 'Top Vessel Sub-type (Entire Time Range)',
        value: summary?.top_vessel_subtype || '-',
        count: summary?.top_vessel_subtype
          ? `${(summary?.top_vessel_subtype_count ?? 0).toLocaleString()} vessels`
          : undefined,
        numericVal: summary?.top_vessel_subtype_count ?? 0,
        color: '#6366f1',
        unit: 'vessels',
      },
      {
        title: 'Trade (Entire Time Range)',
        value: 'Trade',
        count: `${(summary?.category_totals?.['Trade'] ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_totals?.['Trade'] ?? 0,
        color: '#6366f1',
        unit: 'vessels',
      },
      {
        title: 'Harbor (Entire Time Range)',
        value: 'Harbor',
        count: `${(summary?.category_totals?.['Harbor'] ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_totals?.['Harbor'] ?? 0,
        color: '#ef4444',
        unit: 'vessels',
      },
      {
        title: 'Recreation (Entire Time Range)',
        value: 'Recreation',
        count: `${(summary?.category_totals?.['Recreation'] ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_totals?.['Recreation'] ?? 0,
        color: '#f59e0b',
        unit: 'vessels',
      },
      {
        title: 'Miscellaneous (Entire Time Range)',
        value: 'Miscellaneous',
        count: `${(summary?.category_totals?.['Miscellaneous'] ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_totals?.['Miscellaneous'] ?? 0,
        color: '#9ca3af',
        unit: 'vessels',
      },
    ];
  }, [summary, isDuration]);

  // Build Card 2 Slides
  const card2Slides = useMemo(() => {
    if (isDuration) {
      return [
        {
          title: `Trade: Peak Duration (${grainLabel})`,
          value: `${summary?.category_durations?.['Trade']?.peak_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Trade']?.peak_duration_hours ?? 0,
          observed: summary?.category_durations?.['Trade']?.peak_period || '-',
          color: '#6366f1',
          unit: 'hrs',
        },
        {
          title: `Harbor: Peak Duration (${grainLabel})`,
          value: `${summary?.category_durations?.['Harbor']?.peak_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Harbor']?.peak_duration_hours ?? 0,
          observed: summary?.category_durations?.['Harbor']?.peak_period || '-',
          color: '#ef4444',
          unit: 'hrs',
        },
        {
          title: `Recreation: Peak Duration (${grainLabel})`,
          value: `${summary?.category_durations?.['Recreation']?.peak_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Recreation']?.peak_duration_hours ?? 0,
          observed: summary?.category_durations?.['Recreation']?.peak_period || '-',
          color: '#f59e0b',
          unit: 'hrs',
        },
        {
          title: `Miscellaneous: Peak Duration (${grainLabel})`,
          value: `${summary?.category_durations?.['Miscellaneous']?.peak_duration_hours ?? 0} hrs`,
          numericVal: summary?.category_durations?.['Miscellaneous']?.peak_duration_hours ?? 0,
          observed: summary?.category_durations?.['Miscellaneous']?.peak_period || '-',
          color: '#9ca3af',
          unit: 'hrs',
        },
      ];
    }

    return [
      {
        title: `Trade: Peak Vessel Count (${grainLabel})`,
        value: `${(summary?.category_peaks?.['Trade']?.peak_count ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_peaks?.['Trade']?.peak_count ?? 0,
        observed: summary?.category_peaks?.['Trade']?.peak_period || '-',
        color: '#6366f1',
        unit: 'vessels',
      },
      {
        title: `Harbor: Peak Vessel Count (${grainLabel})`,
        value: `${(summary?.category_peaks?.['Harbor']?.peak_count ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_peaks?.['Harbor']?.peak_count ?? 0,
        observed: summary?.category_peaks?.['Harbor']?.peak_period || '-',
        color: '#ef4444',
        unit: 'vessels',
      },
      {
        title: `Recreation: Peak Vessel Count (${grainLabel})`,
        value: `${(summary?.category_peaks?.['Recreation']?.peak_count ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_peaks?.['Recreation']?.peak_count ?? 0,
        observed: summary?.category_peaks?.['Recreation']?.peak_period || '-',
        color: '#f59e0b',
        unit: 'vessels',
      },
      {
        title: `Miscellaneous: Peak Vessel Count (${grainLabel})`,
        value: `${(summary?.category_peaks?.['Miscellaneous']?.peak_count ?? 0).toLocaleString()} vessels`,
        numericVal: summary?.category_peaks?.['Miscellaneous']?.peak_count ?? 0,
        observed: summary?.category_peaks?.['Miscellaneous']?.peak_period || '-',
        color: '#9ca3af',
        unit: 'vessels',
      },
    ];
  }, [summary, isDuration, grainLabel]);

  // Card 3 Selected Details Computation
  const selectedDetails = useMemo(() => {
    if (!selectedPeriod || !timeline.length) return null;
    const curIdx = timeline.findIndex((p) => p.period_start === selectedPeriod);
    if (curIdx < 0) return null;

    const cur = timeline[curIdx];
    const prev = curIdx > 0 ? timeline[curIdx - 1] : null;

    const curDate = new Date(cur.period_start);
    const prevYear = timeline.find((p) => {
      const d = new Date(p.period_start);
      return (
        d.getFullYear() === curDate.getFullYear() - 1 &&
        d.getMonth() === curDate.getMonth()
      );
    });

    const formatP = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const prevPct =
      prev && prev.total_vessels > 0
        ? ((cur.total_vessels - prev.total_vessels) / prev.total_vessels) * 100
        : null;

    const prevYearPct =
      prevYear && prevYear.total_vessels > 0
        ? ((cur.total_vessels - prevYear.total_vessels) / prevYear.total_vessels) * 100
        : null;

    return {
      period: formatP(cur.period_start),
      totalVessels: cur.total_vessels,
      prevLabel: prev ? formatP(prev.period_start) : null,
      prevTotal: prev?.total_vessels ?? 0,
      prevPct,
      prevYearLabel: prevYear ? formatP(prevYear.period_start) : null,
      prevYearTotal: prevYear?.total_vessels ?? 0,
      prevYearPct,
    };
  }, [selectedPeriod, timeline]);

  const activeCard1 = card1Slides[slide1 % card1Slides.length];
  const activeCard2 = card2Slides[slide2 % card2Slides.length];

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
      {/* Card 1: Top Types & Category Totals */}
      <Card
        variant="outlined"
        sx={{
          flex: 1,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '&:hover .nav-arrow-left': { opacity: 1 },
          '&:hover .nav-arrow-right': { opacity: 1 },
        }}
      >
        {/* Hover Arrow Left */}
        <Box
          className="nav-arrow-left"
          onClick={() =>
            setSlide1((prev) => (prev - 1 + card1Slides.length) % card1Slides.length)
          }
          role="button"
          tabIndex={0}
          aria-label="Previous slide"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSlide1((prev) => (prev - 1 + card1Slides.length) % card1Slides.length);
            }
          }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.12)' },
            cursor: 'pointer',
            zIndex: 2,
            opacity: 0,
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </Box>

        {/* Hover Arrow Right */}
        <Box
          className="nav-arrow-right"
          onClick={() => setSlide1((prev) => (prev + 1) % card1Slides.length)}
          role="button"
          tabIndex={0}
          aria-label="Next slide"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSlide1((prev) => (prev + 1) % card1Slides.length);
            }
          }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.12)' },
            cursor: 'pointer',
            zIndex: 2,
            opacity: 0,
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </Box>

        <CardContent sx={{ px: 3, pt: 1.5, pb: 1, '&:last-child': { pb: 1 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '1.3rem', lineHeight: 1 }}>🚢</Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {activeCard1.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {locationName} · {dateRange.start} to {dateRange.end}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ minHeight: 70, display: 'flex', alignItems: 'center' }}>
            <Tooltip
              title={
                isDuration ? (
                  <AverageMetricTooltip
                    unit={activeCard1.unit}
                    average={activeCard1.numericVal}
                    count={count}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                ) : (
                  <CumulativeMetricTooltip
                    unit={activeCard1.unit}
                    total={activeCard1.numericVal}
                    count={count}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                )
              }
              arrow
              placement="top"
            >
              <Box sx={{ cursor: 'help', width: '100%' }}>
                {loading ? (
                  <Skeleton variant="text" width={140} height={48} />
                ) : (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                  >
                    <Typography
                      variant="h4"
                      sx={{ color: activeCard1.color, fontWeight: 800 }}
                    >
                      {activeCard1.value}
                    </Typography>
                    {activeCard1.count && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Total Count:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: activeCard1.color, fontWeight: 700 }}
                        >
                          {activeCard1.count}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </Tooltip>
          </Box>

          {/* Carousel Dots */}
          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
            {card1Slides.map((_, sIdx) => (
              <Box
                key={sIdx}
                component="button"
                type="button"
                onClick={() => setSlide1(sIdx)}
                aria-label={`Slide ${sIdx + 1}`}
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  border: 'none',
                  p: 0,
                  cursor: 'pointer',
                  bgcolor: sIdx === (slide1 % card1Slides.length) ? '#6366f1' : theme.palette.grey[300],
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Card 2: Peak Metrics */}
      <Card
        variant="outlined"
        sx={{
          flex: 1,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '&:hover .nav-arrow-left': { opacity: 1 },
          '&:hover .nav-arrow-right': { opacity: 1 },
        }}
      >
        {/* Hover Arrow Left */}
        <Box
          className="nav-arrow-left"
          onClick={() =>
            setSlide2((prev) => (prev - 1 + card2Slides.length) % card2Slides.length)
          }
          role="button"
          tabIndex={0}
          aria-label="Previous slide"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSlide2((prev) => (prev - 1 + card2Slides.length) % card2Slides.length);
            }
          }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.12)' },
            cursor: 'pointer',
            zIndex: 2,
            opacity: 0,
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </Box>

        {/* Hover Arrow Right */}
        <Box
          className="nav-arrow-right"
          onClick={() => setSlide2((prev) => (prev + 1) % card2Slides.length)}
          role="button"
          tabIndex={0}
          aria-label="Next slide"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSlide2((prev) => (prev + 1) % card2Slides.length);
            }
          }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.12)' },
            cursor: 'pointer',
            zIndex: 2,
            opacity: 0,
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </Box>

        <CardContent sx={{ px: 3, pt: 1.5, pb: 1, '&:last-child': { pb: 1 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '1.3rem', lineHeight: 1 }}>📈</Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {activeCard2.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {locationName} · {dateRange.start} to {dateRange.end}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ minHeight: 70, display: 'flex', alignItems: 'center' }}>
            <Tooltip
              title={
                <PeakMetricTooltip
                  unit={activeCard2.unit}
                  peakValue={activeCard2.numericVal}
                  peakDate={activeCard2.observed}
                  count={count}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                />
              }
              arrow
              placement="top"
            >
              <Box sx={{ cursor: 'help', width: '100%' }}>
                {loading ? (
                  <Skeleton variant="text" width={140} height={48} />
                ) : (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                  >
                    <Typography
                      variant="h4"
                      sx={{ color: activeCard2.color, fontWeight: 800 }}
                    >
                      {activeCard2.value}
                    </Typography>
                    {activeCard2.observed && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Observed on:
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 700 }}
                        >
                          {activeCard2.observed}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </Tooltip>
          </Box>

          {/* Carousel Dots */}
          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
            {card2Slides.map((_, sIdx) => (
              <Box
                key={sIdx}
                component="button"
                type="button"
                onClick={() => setSlide2(sIdx)}
                aria-label={`Slide ${sIdx + 1}`}
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  border: 'none',
                  p: 0,
                  cursor: 'pointer',
                  bgcolor: sIdx === (slide2 % card2Slides.length) ? '#6366f1' : theme.palette.grey[300],
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Card 3: Contextual Period Details Inspection Card */}
      {selectedDetails ? (
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Selected: {selectedDetails.period} ({selectedDetails.totalVessels.toLocaleString()} vessels)
              </Typography>
              <Button
                size="small"
                sx={{ fontSize: 11, py: 0, minWidth: 'auto', textTransform: 'none' }}
                onClick={() => onSelectPeriod?.(null)}
              >
                Clear
              </Button>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              {/* Prev Period Delta */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Change from Previous Period
                </Typography>
                {selectedDetails.prevPct !== null ? (
                  <Tooltip
                    title={
                      <PeriodDeltaTooltip
                        currentLabel={selectedDetails.period}
                        currentVal={selectedDetails.totalVessels}
                        baselineLabel={selectedDetails.prevLabel || 'Previous'}
                        baselineVal={selectedDetails.prevTotal}
                        pct={selectedDetails.prevPct}
                      />
                    }
                    arrow
                    placement="top"
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        cursor: 'help',
                        color: selectedDetails.prevPct >= 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {selectedDetails.prevPct >= 0 ? '↑ +' : '↓ '}
                      {selectedDetails.prevPct.toFixed(1)}%
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                )}
                {selectedDetails.prevLabel && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    vs {selectedDetails.prevLabel} ({selectedDetails.prevTotal.toLocaleString()})
                  </Typography>
                )}
              </Box>

              {/* Prev Year Delta */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Change from Previous Year
                </Typography>
                {selectedDetails.prevYearPct !== null ? (
                  <Tooltip
                    title={
                      <PeriodDeltaTooltip
                        currentLabel={selectedDetails.period}
                        currentVal={selectedDetails.totalVessels}
                        baselineLabel={selectedDetails.prevYearLabel || 'Previous Year'}
                        baselineVal={selectedDetails.prevYearTotal}
                        pct={selectedDetails.prevYearPct}
                      />
                    }
                    arrow
                    placement="top"
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        cursor: 'help',
                        color: selectedDetails.prevYearPct >= 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {selectedDetails.prevYearPct >= 0 ? '↑ +' : '↓ '}
                      {selectedDetails.prevYearPct.toFixed(1)}%
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                )}
                {selectedDetails.prevYearLabel && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    vs {selectedDetails.prevYearLabel} ({selectedDetails.prevYearTotal.toLocaleString()})
                  </Typography>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <CardContent sx={{ p: 0, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Select a period on the graph to view more details
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default VesselSummaryCards;
