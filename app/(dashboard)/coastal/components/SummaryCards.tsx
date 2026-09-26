'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { IndicatorSummaryCard, IndicatorTimelinePoint, IndicatorTimelineSummary } from '@/types/coastal';
import { getPointValue, formatPeriodLabel } from './IndicatorTimelineChart';
import {
  NO_DATA_LABEL,
  getIndicatorMeta,
} from '../indicators';

export interface SummaryCardsProps {
  summary?: IndicatorTimelineSummary;
  indicators: string[];
  locationName: string;
  dateRange: { start: string; end: string };
  timeline?: IndicatorTimelinePoint[];
  grain?: string;
  loading?: boolean;
}

interface IndicatorConfig {
  icon: string;
  label: string;
  unit: string;
  totalLabel: string;
  peakLabel: string;
  zeroPeakReason: string;
}

function configFor(indicatorKey: string): IndicatorConfig {
  const meta = getIndicatorMeta(indicatorKey);
  if (!meta) {
    return {
      icon: '📊',
      label: indicatorKey,
      unit: '',
      totalLabel: 'Average (Entire Time Range)',
      peakLabel: 'Peak Value:',
      zeroPeakReason: 'No data was recorded in this time range',
    };
  }
  const isCount = meta.agg === 'sum';
  return {
    icon: meta.icon,
    label: meta.group === 'Vessels' && indicatorKey === 'vessels' ? 'Vessel Count' : `${meta.label} Levels`.replace(' Levels Levels', ' Levels'),
    unit: meta.unit,
    totalLabel:
      indicatorKey === 'vessels'
        ? 'Total Vessels (Entire Time Range)'
        : isCount
        ? `Total ${meta.shortLabel} (Entire Time Range)`
        : `Average ${meta.shortLabel} (Entire Time Range)`,
    peakLabel: `Peak ${meta.shortLabel} (Monthly):`,
    zeroPeakReason: `No ${meta.shortLabel.toLowerCase()} data was recorded in this time range`,
  };
}

/** Finite (non-null) values for an indicator across the timeline. Nulls are skipped, never zeroed. */
export function finiteTimelineValues(
  timeline: IndicatorTimelinePoint[] | undefined,
  indicatorKey: string,
): number[] {
  if (!timeline) return [];
  return timeline
    .map((pt) => getPointValue(pt, indicatorKey))
    .filter((v) => !isNaN(v));
}

export interface IndicatorStats {
  average?: number;
  total?: number;
  count: number;
  peak?: { value: number; period: string };
  /** Month-over-month delta of the last two periods. Null when either is null. Never 0%. */
  momDeltaPct: number | null;
  allNull: boolean;
}

/** Data-driven stats for any registry indicator. Exported for tests. */
export function computeIndicatorStats(
  timeline: IndicatorTimelinePoint[] | undefined,
  indicatorKey: string,
): IndicatorStats {
  const values = finiteTimelineValues(timeline, indicatorKey);
  const count = timeline ? timeline.length : 0;
  const allNull = values.length === 0;

  let peak: { value: number; period: string } | undefined;
  if (timeline) {
    let best = -Infinity;
    for (const point of timeline) {
      const val = getPointValue(point, indicatorKey);
      if (!isNaN(val) && val > best) {
        best = val;
        peak = { value: best, period: point.period_start };
      }
    }
  }

  let momDeltaPct: number | null = null;
  if (timeline && timeline.length >= 2) {
    const curr = getPointValue(timeline[timeline.length - 1], indicatorKey);
    const prev = getPointValue(timeline[timeline.length - 2], indicatorKey);
    if (!isNaN(curr) && !isNaN(prev) && prev !== 0) {
      momDeltaPct = ((curr - prev) / prev) * 100;
    }
  }

  return {
    average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined,
    total: values.length > 0 ? values.reduce((a, b) => a + b, 0) : undefined,
    count,
    peak,
    momDeltaPct,
    allNull,
  };
}

/** Delta badge styling from the registry rule. Red is only for rising chlorophyll-a. */
export function deltaStyle(
  pct: number | null,
  indicatorKey: string,
): { text: string; color: string } {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return { text: NO_DATA_LABEL, color: 'text.secondary' };
  }
  if (Math.abs(pct) < 0.5) {
    return { text: '~ 0%', color: 'text.secondary' };
  }
  const meta = getIndicatorMeta(indicatorKey);
  if (pct > 0) {
    return { text: `↑ +${Math.round(pct)}%`, color: meta?.deltaUpColor || '#2563eb' };
  }
  return { text: `↓ -${Math.abs(Math.round(pct))}%`, color: meta?.deltaDownColor || '#16a34a' };
}

// Peak value/date aren't provided by the summary API, so derive them from the timeline itself.
function findPeakPoint(
  timeline: IndicatorTimelinePoint[] | undefined,
  indicatorKey: string
): { value: number; period: string } | undefined {
  if (!timeline || timeline.length === 0) return undefined;
  let best: IndicatorTimelinePoint | undefined;
  let bestVal = -Infinity;
  for (const point of timeline) {
    const val = getPointValue(point, indicatorKey);
    if (!isNaN(val) && val > bestVal) {
      bestVal = val;
      best = point;
    }
  }
  return best ? { value: bestVal, period: best.period_start } : undefined;
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

function AverageMetricTooltip({
  unit,
  sum,
  count,
  average,
  startDate,
  endDate,
}: {
  unit: string;
  sum?: number;
  count: number;
  average?: number;
  startDate: string;
  endDate: string;
}) {
  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      {/* 1. Formula */}
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
          numerator="∑ Observations"
          denominator="Count (N)"
        />
      </Box>

      {/* 2. Values */}
      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Time Range:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {startDate} to {endDate}
          </Typography>
        </Stack>
        {sum !== undefined && (
          <Stack direction="row" justifyContent="space-between" spacing={1.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              Total Sum:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
              {sum.toFixed(2)} {unit}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Observations (N):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {count > 0 ? `${count} periods` : NO_DATA_LABEL}
          </Typography>
        </Stack>
      </Stack>

      {/* 3. Substituted Calculation */}
      {sum !== undefined && count > 0 && average !== undefined && (
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
          <MathFraction
            numerator={sum.toFixed(2)}
            denominator={count.toString()}
          />
          <Box component="span" sx={{ ml: 0.5 }}>
            = <Box component="span" sx={{ fontWeight: 700, color: '#38bdf8', ml: 0.5 }}>
              {average.toFixed(2)} {unit}
            </Box>
          </Box>
        </Box>
      )}
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
      {/* 1. Formula */}
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

      {/* 2. Values */}
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
            {count > 0 ? `${count} periods` : NO_DATA_LABEL}
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

      {/* 3. Substituted Result */}
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
  const isVessel = unit === 'vessels';
  const formattedPeak =
    peakValue !== undefined
      ? isVessel
        ? Math.round(peakValue).toLocaleString()
        : peakValue.toFixed(2)
      : NO_DATA_LABEL;

  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      {/* 1. Formula */}
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

      {/* 2. Values */}
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
            Total Periods Scanned:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {count > 0 ? count : NO_DATA_LABEL}
          </Typography>
        </Stack>
      </Stack>

      {/* 3. Substituted Result */}
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
            {formattedPeak} {unit}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SingleSummaryCard({
  indicatorKey,
  summaryCard,
  locationName,
  dateRange,
  timeline,
  grain,
  loading,
}: {
  indicatorKey: string;
  summaryCard?: IndicatorSummaryCard;
  locationName: string;
  dateRange: { start: string; end: string };
  timeline?: IndicatorTimelinePoint[];
  grain?: string;
  loading?: boolean;
}) {
  const theme = useTheme();
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const cfg = configFor(indicatorKey);
  const meta = getIndicatorMeta(indicatorKey);

  const grainLabel = grain === 'weekly' ? 'Weekly' : grain === 'annually' ? 'Annual' : 'Monthly';
  const dynamicPeakLabel = cfg.peakLabel.replace('Monthly', grainLabel);

  const isVessel = indicatorKey === 'vessels';
  const stats = computeIndicatorStats(timeline, indicatorKey);
  const count = stats.count;

  const formatNum = (v: number): string => {
    if (meta?.integer || isVessel) return Math.round(v).toLocaleString();
    return v.toFixed(meta?.decimals ?? 2);
  };

  const rawSummaryAverage =
    summaryCard?.average ??
    summaryCard?.average_c ??
    summaryCard?.average_hours ??
    summaryCard?.average_k;

  // Summary API average is a fallback only; the timeline is canonical and
  // null-aware (nulls are skipped, never zeroed).
  const numericAverage = stats.average ?? rawSummaryAverage;

  const numericCumulative = summaryCard?.cumulative !== undefined
    ? summaryCard.cumulative
    : isVessel || meta?.agg === 'sum'
    ? stats.total
    : undefined;

  const totalVal = stats.allNull && numericCumulative === undefined && numericAverage === undefined
    ? undefined
    : isVessel
    ? numericCumulative !== undefined
      ? Math.round(numericCumulative).toLocaleString()
      : undefined
    : meta?.agg === 'sum'
    ? stats.total !== undefined
      ? formatNum(stats.total)
      : undefined
    : numericAverage !== undefined
    ? formatNum(numericAverage)
    : undefined;

  const totalSum = stats.total;

  // Prefer the timeline point since it's the only source that carries a date; fall back
  // to the API's aggregate peak (undated) when the timeline has no data to derive one from.
  const rawSummaryPeak =
    summaryCard?.peak ??
    summaryCard?.peak_c ??
    summaryCard?.peak_hours ??
    summaryCard?.peak_k;

  const peakPoint = stats.peak ? { value: stats.peak.value, period: stats.peak.period } : findPeakPoint(timeline, indicatorKey);
  const peakValueNumber = peakPoint !== undefined ? peakPoint.value : rawSummaryPeak;
  const peakVal =
    peakValueNumber !== undefined
      ? formatNum(peakValueNumber)
      : undefined;
  const peakDateLabel =
    peakPoint !== undefined && peakPoint.value > 0 ? formatPeriodLabel(peakPoint.period) : undefined;
  const peakZeroReason = peakValueNumber === 0 ? cfg.zeroPeakReason : undefined;
  const delta = deltaStyle(stats.momDeltaPct, indicatorKey);

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        borderRadius: 2,
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 0.5,
        '&:hover .nav-arrow-left': { opacity: 1 },
        '&:hover .nav-arrow-right': { opacity: 1 },
      }}
    >
      <Box
        className="nav-arrow-left"
        onClick={() => setActiveSlide((prev) => (prev === 0 ? 1 : 0))}
        role="button"
        tabIndex={0}
        aria-label="Previous slide"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveSlide((prev) => (prev === 0 ? 1 : 0));
          }
        }}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
          cursor: 'pointer',
          zIndex: 2,
          opacity: 0,
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
        }}
      >
        <ChevronLeftIcon fontSize="small" />
      </Box>

      <Box
        className="nav-arrow-right"
        onClick={() => setActiveSlide((prev) => (prev === 0 ? 1 : 0))}
        role="button"
        tabIndex={0}
        aria-label="Next slide"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveSlide((prev) => (prev === 0 ? 1 : 0));
          }
        }}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
          cursor: 'pointer',
          zIndex: 2,
          opacity: 0,
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
        }}
      >
        <ChevronRightIcon fontSize="small" />
      </Box>

      <CardContent sx={{ px: 3.5, pt: 1, pb: 1, '&:last-child': { pb: 1 } }}>
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
            <Tooltip
              title={
                isVessel ? (
                  <CumulativeMetricTooltip
                    unit={cfg.unit}
                    total={numericCumulative}
                    count={count}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                ) : (
                  <AverageMetricTooltip
                    unit={cfg.unit}
                    sum={totalSum}
                    count={count}
                    average={numericAverage}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                )
              }
              arrow
              placement="top"
            >
              <Box sx={{ cursor: 'help' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {cfg.totalLabel}
                </Typography>
                {loading ? (
                  <Skeleton variant="text" width={140} height={48} />
                ) : (
                  <>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {totalVal !== undefined ? `${totalVal} ${cfg.unit}` : NO_DATA_LABEL}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: delta.color, display: 'block', mt: 0.5 }}>
                      {delta.text === NO_DATA_LABEL ? `vs prev. month: ${NO_DATA_LABEL}` : `vs prev. month: ${delta.text}`}
                    </Typography>
                  </>
                )}
              </Box>
            </Tooltip>
          ) : (
            <Tooltip
              title={
                <PeakMetricTooltip
                  unit={cfg.unit}
                  peakValue={peakValueNumber}
                  peakDate={peakDateLabel}
                  count={count}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                />
              }
              arrow
              placement="top"
            >
              <Box sx={{ cursor: 'help' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {dynamicPeakLabel}
                </Typography>
                {loading ? (
                  <Skeleton variant="text" width={140} height={48} />
                ) : (
                  <>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {peakVal !== undefined ? `${peakVal} ${cfg.unit}` : NO_DATA_LABEL}
                    </Typography>
                    {peakDateLabel && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Observed on: {peakDateLabel}
                      </Typography>
                    )}
                    {peakZeroReason && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {peakZeroReason}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Tooltip>
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
  timeline,
  grain,
  loading,
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
          if (indKey === 'chlor_a') summaryCard = summary.chlor_a || (summary as any).chlorophyll_a;
          else if (indKey === 'sst') summaryCard = summary.sea_surface_temperature || (summary as any).sst;
          else if (indKey === 'duration') summaryCard = summary.port_call_duration || (summary as any).duration;
          else if (indKey === 'vessels') summaryCard = summary.vessels || (summary as any).vessel_count;
        }

        return (
          <Box key={indKey} sx={{ flex: 1, minWidth: 0 }}>
            <SingleSummaryCard
              indicatorKey={indKey}
              summaryCard={summaryCard}
              locationName={locationName}
              dateRange={dateRange}
              timeline={timeline}
              grain={grain}
              loading={loading}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export default SummaryCards;
