'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { IndicatorTimelinePoint } from '@/types/coastal';
import { getPointValue, formatPeriodLabel } from './IndicatorTimelineChart';

export interface DetailsCardProps {
  selectedPoint?: IndicatorTimelinePoint | null;
  timeline?: IndicatorTimelinePoint[];
  activeIndicator?: string;
  locationName: string;
  grain: string;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function findSameMonthPoint(
  timeline: IndicatorTimelinePoint[] | undefined,
  targetYear: number,
  targetMonth: number
): IndicatorTimelinePoint | undefined {
  if (!timeline) return undefined;
  return timeline.find((p) => {
    const d = new Date(p.period_start);
    return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });
}

function formatDelta(pct: number | null): { text: string; color: string } {
  if (pct === null || isNaN(pct)) {
    return { text: 'N/A', color: 'text.secondary' };
  }
  if (Math.abs(pct) < 0.5) {
    return { text: '~ 0%', color: 'text.secondary' };
  }
  if (pct > 0) {
    return { text: `↑ +${Math.round(pct)}%`, color: '#ef4444' };
  }
  return { text: `↓ -${Math.abs(Math.round(pct))}%`, color: '#16a34a' };
}

function formatVal(val: number | undefined, unit: string): string {
  if (val === undefined || isNaN(val)) return 'N/A';
  if (unit === 'vessels') {
    return `${Math.round(val).toLocaleString()} vessels`;
  }
  return `${val.toFixed(2)} ${unit}`;
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

function MetricTooltip({
  isYoY,
  afterLabel,
  afterVal,
  beforeLabel,
  beforeVal,
  unit,
}: {
  isYoY: boolean;
  afterLabel: string;
  afterVal?: number;
  beforeLabel: string;
  beforeVal?: number;
  unit: string;
}) {
  const hasValues =
    afterVal !== undefined &&
    beforeVal !== undefined &&
    !isNaN(afterVal) &&
    !isNaN(beforeVal);
  const isVessel = unit === 'vessels';
  const formatNum = (v?: number) => {
    if (v === undefined || isNaN(v)) return 'N/A';
    return isVessel ? Math.round(v).toLocaleString() : v.toFixed(2);
  };

  let pct: number | null = null;
  if (hasValues && beforeVal! !== 0) {
    pct = ((afterVal! - beforeVal!) / beforeVal!) * 100;
  }

  const resultColor =
    pct === null || Math.abs(pct) < 0.5
      ? '#cbd5e1'
      : pct > 0
      ? '#f87171'
      : '#4ade80';

  const resultText =
    pct === null
      ? 'N/A'
      : Math.abs(pct) < 0.5
      ? '~ 0%'
      : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;

  return (
    <Box sx={{ p: 0.75, maxWidth: 300, color: '#f8fafc' }}>
      {/* 1. Formula Definition */}
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
        <Box component="span" sx={{ fontSize: '15px' }}>(</Box>
        <MathFraction numerator="After - Before" denominator="Before" />
        <Box component="span" sx={{ fontSize: '15px' }}>)</Box>
        <Box component="span" sx={{ ml: 0.5 }}>× 100%</Box>
      </Box>

      {/* 2. Values with period labels */}
      <Stack spacing={0.35} sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            After ({afterLabel}):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {formatVal(afterVal, unit)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            Before ({beforeLabel}):
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#ffffff' }}>
            {formatVal(beforeVal, unit)}
          </Typography>
        </Stack>
      </Stack>

      {/* 3. Substituted Mathematical Calculation */}
      {hasValues && beforeVal! !== 0 && (
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
          <Box component="span" sx={{ fontSize: '15px' }}>(</Box>
          <MathFraction
            numerator={`${formatNum(afterVal)} - ${formatNum(beforeVal)}`}
            denominator={formatNum(beforeVal)}
          />
          <Box component="span" sx={{ fontSize: '15px' }}>)</Box>
          <Box component="span" sx={{ ml: 0.5 }}>
            × 100% ={' '}
            <Box component="span" sx={{ fontWeight: 700, color: resultColor, ml: 0.5 }}>
              {resultText}
            </Box>
          </Box>
        </Box>
      )}
      {hasValues && beforeVal === 0 && (
        <Typography variant="caption" sx={{ color: '#f87171', display: 'block', textAlign: 'center', fontSize: '10px' }}>
          Cannot divide by zero (Before value is 0)
        </Typography>
      )}
    </Box>
  );
}

function formatMoMLabel(pA?: IndicatorTimelinePoint, pB?: IndicatorTimelinePoint): string {
  if (!pA || !pB) return 'N/A:';
  const dA = new Date(pA.period_start);
  const dB = new Date(pB.period_start);
  if (isNaN(dA.getTime()) || isNaN(dB.getTime())) {
    return `${formatPeriodLabel(pA.period_start)} vs ${formatPeriodLabel(pB.period_start)}:`;
  }
  const mA = dA.toLocaleString('en-US', { month: 'short' });
  const mB = dB.toLocaleString('en-US', { month: 'short' });
  if (dA.getFullYear() === dB.getFullYear()) {
    return `${mA} vs ${mB} ${dA.getFullYear()}:`;
  }
  return `${mA} ${dA.getFullYear()} vs ${mB} ${dB.getFullYear()}:`;
}

export function DetailsCard({
  selectedPoint,
  timeline,
  activeIndicator = 'chlor_a',
  locationName,
  grain,
}: DetailsCardProps) {
  const theme = useTheme();
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const activePoint =
    selectedPoint || (timeline && timeline.length > 0 ? timeline[timeline.length - 1] : null);

  const indicatorTitle = useMemo(() => {
    switch (activeIndicator) {
      case 'vessels':
        return 'Vessel Count';
      case 'duration':
        return 'Port Call Duration';
      case 'sst':
        return 'Sea Surface Temperature Levels';
      default:
        return 'Chlorophyll-a Levels';
    }
  }, [activeIndicator]);

  const unit = useMemo(() => {
    switch (activeIndicator) {
      case 'vessels':
        return 'vessels';
      case 'duration':
        return 'hours';
      case 'sst':
        return 'K';
      default:
        return 'mg/m³';
    }
  }, [activeIndicator]);

  const slideData = useMemo(() => {
    if (!activePoint) return null;

    const currDate = new Date(activePoint.period_start);
    const validDate = !isNaN(currDate.getTime());
    const currYear = validDate ? currDate.getFullYear() : 0;
    const currMonth = validDate ? currDate.getMonth() : 0;
    const monthShort = validDate ? currDate.toLocaleString('en-US', { month: 'short' }) : 'Month';

    // Slide 1: Year over Year points
    const yoyP0 = activePoint;
    const yoyP1 = findSameMonthPoint(timeline, currYear - 1, currMonth);
    const yoyP2 = findSameMonthPoint(timeline, currYear - 2, currMonth);
    const yoyP3 = findSameMonthPoint(timeline, currYear - 3, currMonth);

    const yoyV0 = getPointValue(yoyP0, activeIndicator);
    const yoyV1 = yoyP1 ? getPointValue(yoyP1, activeIndicator) : undefined;
    const yoyV2 = yoyP2 ? getPointValue(yoyP2, activeIndicator) : undefined;
    const yoyV3 = yoyP3 ? getPointValue(yoyP3, activeIndicator) : undefined;

    const yoyPct0 = yoyV1 !== undefined ? pctChange(yoyV0, yoyV1) : null;
    const yoyPct1 = yoyV1 !== undefined && yoyV2 !== undefined ? pctChange(yoyV1, yoyV2) : null;
    const yoyPct2 = yoyV2 !== undefined && yoyV3 !== undefined ? pctChange(yoyV2, yoyV3) : null;

    const yoyData = {
      title: 'Current vs Same Month of Previous Year (%)',
      primary: {
        delta: formatDelta(yoyPct0),
        afterLabel: `${monthShort} ${currYear}`,
        afterVal: yoyV0,
        beforeLabel: `${monthShort} ${currYear - 1}`,
        beforeVal: yoyV1,
      },
      comp1: {
        label: `${monthShort} ${currYear - 1} vs ${currYear - 2}:`,
        delta: formatDelta(yoyPct1),
        afterLabel: `${monthShort} ${currYear - 1}`,
        afterVal: yoyV1,
        beforeLabel: `${monthShort} ${currYear - 2}`,
        beforeVal: yoyV2,
      },
      comp2: {
        label: `${monthShort} ${currYear - 2} vs ${currYear - 3}:`,
        delta: formatDelta(yoyPct2),
        afterLabel: `${monthShort} ${currYear - 2}`,
        afterVal: yoyV2,
        beforeLabel: `${monthShort} ${currYear - 3}`,
        beforeVal: yoyV3,
      },
    };

    // Slide 0: Month over Month points
    const selIndex = timeline?.findIndex((p) => p.period_start === activePoint.period_start) ?? -1;
    const momP0 = activePoint;
    const momP1 = selIndex > 0 ? timeline![selIndex - 1] : undefined;
    const momP2 = selIndex > 1 ? timeline![selIndex - 2] : undefined;
    const momP3 = selIndex > 2 ? timeline![selIndex - 3] : undefined;

    const momV0 = getPointValue(momP0, activeIndicator);
    const momV1 = momP1 ? getPointValue(momP1, activeIndicator) : undefined;
    const momV2 = momP2 ? getPointValue(momP2, activeIndicator) : undefined;
    const momV3 = momP3 ? getPointValue(momP3, activeIndicator) : undefined;

    const momPct0 = momV1 !== undefined ? pctChange(momV0, momV1) : null;
    const momPct1 = momV1 !== undefined && momV2 !== undefined ? pctChange(momV1, momV2) : null;
    const momPct2 = momV2 !== undefined && momV3 !== undefined ? pctChange(momV2, momV3) : null;

    const momData = {
      title: 'Current vs Previous Month (%)',
      primary: {
        delta: formatDelta(momPct0),
        afterLabel: formatPeriodLabel(momP0.period_start),
        afterVal: momV0,
        beforeLabel: momP1 ? formatPeriodLabel(momP1.period_start) : 'Previous Period',
        beforeVal: momV1,
      },
      comp1: {
        label: formatMoMLabel(momP1, momP2),
        delta: formatDelta(momPct1),
        afterLabel: momP1 ? formatPeriodLabel(momP1.period_start) : 'Period A',
        afterVal: momV1,
        beforeLabel: momP2 ? formatPeriodLabel(momP2.period_start) : 'Period B',
        beforeVal: momV2,
      },
      comp2: {
        label: formatMoMLabel(momP2, momP3),
        delta: formatDelta(momPct2),
        afterLabel: momP2 ? formatPeriodLabel(momP2.period_start) : 'Period B',
        afterVal: momV2,
        beforeLabel: momP3 ? formatPeriodLabel(momP3.period_start) : 'Period C',
        beforeVal: momV3,
      },
    };

    return { momData, yoyData };
  }, [activePoint, timeline, activeIndicator]);

  if (!activePoint || !slideData) {
    return (
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          minHeight: 180,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Select a period on the graph to view more details
        </Typography>
      </Card>
    );
  }

  const currentSlide = activeSlide === 0 ? slideData.momData : slideData.yoyData;
  const isYoY = activeSlide === 1;

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        minHeight: 180,
        borderRadius: 2,
        borderColor: 'primary.main',
        borderWidth: 2,
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

      <CardContent sx={{ px: 3, pt: 1, pb: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {indicatorTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {locationName} · {formatPeriodLabel(activePoint.period_start)}
          </Typography>
        </Box>

        {/* Comparison content */}
        <Box sx={{ minHeight: 90 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
          >
            {currentSlide.title}
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            {/* Primary Delta (Left) */}
            <Box sx={{ minWidth: 95, flexShrink: 0 }}>
              <Tooltip
                arrow
                placement="top"
                title={
                  <MetricTooltip
                    isYoY={isYoY}
                    afterLabel={currentSlide.primary.afterLabel}
                    afterVal={currentSlide.primary.afterVal}
                    beforeLabel={currentSlide.primary.beforeLabel}
                    beforeVal={currentSlide.primary.beforeVal}
                    unit={unit}
                  />
                }
              >
                <Box sx={{ cursor: 'help', display: 'inline-block' }}>
                  <Typography
                    sx={{
                      fontSize: '28px',
                      fontWeight: 800,
                      lineHeight: 1,
                      color: currentSlide.primary.delta.color,
                    }}
                  >
                    {currentSlide.primary.delta.text}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>

            {/* Historical Comparisons (Right) */}
            <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
              {/* Comparison Row 1 */}
              <Tooltip
                arrow
                placement="top"
                title={
                  currentSlide.comp1.afterVal !== undefined && currentSlide.comp1.beforeVal !== undefined ? (
                    <MetricTooltip
                      isYoY={isYoY}
                      afterLabel={currentSlide.comp1.afterLabel}
                      afterVal={currentSlide.comp1.afterVal}
                      beforeLabel={currentSlide.comp1.beforeLabel}
                      beforeVal={currentSlide.comp1.beforeVal}
                      unit={unit}
                    />
                  ) : ''
                }
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ cursor: 'help' }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}
                  >
                    {currentSlide.comp1.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '11px',
                      color: currentSlide.comp1.delta.color,
                      whiteSpace: 'nowrap',
                      ml: 1,
                    }}
                  >
                    {currentSlide.comp1.delta.text}
                  </Typography>
                </Stack>
              </Tooltip>

              {/* Comparison Row 2 */}
              <Tooltip
                arrow
                placement="top"
                title={
                  currentSlide.comp2.afterVal !== undefined && currentSlide.comp2.beforeVal !== undefined ? (
                    <MetricTooltip
                      isYoY={isYoY}
                      afterLabel={currentSlide.comp2.afterLabel}
                      afterVal={currentSlide.comp2.afterVal}
                      beforeLabel={currentSlide.comp2.beforeLabel}
                      beforeVal={currentSlide.comp2.beforeVal}
                      unit={unit}
                    />
                  ) : ''
                }
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ cursor: 'help' }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}
                  >
                    {currentSlide.comp2.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '11px',
                      color: currentSlide.comp2.delta.color,
                      whiteSpace: 'nowrap',
                      ml: 1,
                    }}
                  >
                    {currentSlide.comp2.delta.text}
                  </Typography>
                </Stack>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setActiveSlide(0)}
            aria-label="Slide 1 Month over Month"
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
            aria-label="Slide 2 Year over Year"
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

export default DetailsCard;
