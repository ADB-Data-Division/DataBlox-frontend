'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { IndicatorTimelinePoint } from '@/types/coastal';
import {
  COASTAL_INDICATORS,
  getIndicatorMeta,
  isZeroFillIndicator,
} from '../indicators';

export interface IndicatorTimelineChartProps {
  data: IndicatorTimelinePoint[];
  indicators: string[];
  grain: string;
  locationName: string;
  dateRange: { start: string; end: string };
  selectedPeriod?: string | null;
  onSelectPoint: (point: IndicatorTimelinePoint) => void;
  loading?: boolean;
}

/**
 * Backwards-compatible chart config derived from the static registry.
 * New code should import the registry from `../indicators` directly.
 */
export const INDICATORS_CONFIG: Record<string, { label: string; unit: string; color: string }> =
  Object.fromEntries(
    COASTAL_INDICATORS.map((e) => [e.id, { label: e.label, unit: e.unit, color: e.color }]),
  );

// Canonical value reader. The `values` dict (contract section 3) is read
// first; legacy fixed fields follow during migration. Null means "no data"
// and stays NaN so the chart renders a gap, never a fake 0. A real 0
// survives via `??` (never `||`). Only `zero_fill` registry indicators
// (vessels, presence_hours, stationary_vessels, duration) default missing
// readings to 0.
export function getPointValue(point: IndicatorTimelinePoint, indicatorKey: string): number {
  const zeroFill = isZeroFillIndicator(indicatorKey);
  const fallback = zeroFill ? 0 : NaN;

  if (point.values && point.values[indicatorKey] !== undefined) {
    return point.values[indicatorKey] ?? fallback;
  }
  if (indicatorKey === 'chlor_a') {
    return point.chlor_a ?? point.mean_chlor_a ?? NaN;
  }
  if (indicatorKey === 'vessels') {
    return (
      point.total_vessels ??
      point.unique_vessels ??
      point.n_unique_vessels ??
      0
    );
  }
  if (indicatorKey === 'presence_hours') {
    return point.total_presence_hours ?? 0;
  }
  if (indicatorKey === 'stationary_vessels') {
    return (point as unknown as Record<string, number | null | undefined>).n_unique_stationary_vessels ?? 0;
  }
  if (indicatorKey === 'duration') {
    return (
      point.port_call_duration_hours ??
      point.total_presence_hours ??
      point.total_stationary_hours ??
      0
    );
  }
  if (indicatorKey === 'sst') {
    return (
      point.sst_c ??
      point.sst_k ??
      point.mean_sea_surface_temperature ??
      NaN
    );
  }
  const direct = (point as unknown as Record<string, number | null | undefined>)[indicatorKey];
  if (direct !== undefined) {
    return direct ?? fallback;
  }
  return fallback;
}

/** Format a chart value with the registry decimals, or "No data" for gaps. */
export function formatIndicatorValue(indicatorKey: string, value: number): string {
  if (isNaN(value)) return 'No data';
  const meta = getIndicatorMeta(indicatorKey);
  if (!meta) return String(value);
  if (meta.integer) return Math.round(value).toLocaleString();
  return value.toFixed(meta.decimals);
}

export function formatPeriodLabel(isoString: string, grain?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  if (grain && grain.toLowerCase() === 'annually') {
    return String(date.getFullYear());
  }
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

const MARGINS = { top: 30, right: 75, bottom: 50, left: 60 };

const CHLOR_COVERAGE_CHANGE = {
  date: '2024-06-07',
  note:
    'From 7 June 2024 the satellite product starts seeing murky near-shore water it used to skip. A rise after this date is extra coverage, not dirtier water.',
};

export function IndicatorTimelineChart({
  data,
  indicators,
  grain,
  locationName,
  dateRange,
  selectedPeriod,
  onSelectPoint,
  loading = false,
}: IndicatorTimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [coverageAnnotationHover, setCoverageAnnotationHover] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: Math.max(380, Math.min(460, entry.contentRect.height || 420)),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, data]);

  const innerWidth = Math.max(0, dimensions.width - MARGINS.left - MARGINS.right);
  const innerHeight = Math.max(0, dimensions.height - MARGINS.top - MARGINS.bottom);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0 || indicators.length === 0) return;

    setCoverageAnnotationHover(false);

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();
    svg.attr('font-family', '"Inter", "Roboto", "Helvetica", "Arial", sans-serif');

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGINS.left},${MARGINS.top})`);

    const ind1 = indicators[0];
    const ind2 = indicators.length > 1 ? indicators[1] : null;

    const ind1Cfg = INDICATORS_CONFIG[ind1] || { label: ind1, unit: '', color: '#3B82F6' };
    const ind2Cfg = ind2 ? INDICATORS_CONFIG[ind2] || { label: ind2, unit: '', color: '#EF4444' } : null;

    // Axes are shared by unit: two indicators with the same unit share the
    // left axis instead of getting a redundant right axis.
    const shareAxis = Boolean(ind2Cfg && ind1Cfg.unit && ind2Cfg.unit && ind1Cfg.unit === ind2Cfg.unit);
    const ind2Axis: 'left' | 'right' = shareAxis ? 'left' : 'right';

    const finiteValues = (key: string): number[] =>
      data.map((d) => getPointValue(d, key)).filter((v) => !isNaN(v));

    // X Scale
    const x = d3
      .scalePoint<number>()
      .domain(data.map((_, i) => i))
      .range([0, innerWidth])
      .padding(0.2);

    // Chlor-a satellite coverage change marker (only relevant when chlor_a is plotted,
    // and only if the date actually falls inside the currently displayed range)
    let coverageAnnotationIdx = -1;
    if (indicators.includes('chlor_a')) {
      const target = new Date(CHLOR_COVERAGE_CHANGE.date).getTime();
      const firstT = new Date(data[0].period_start).getTime();
      const lastT = new Date(data[data.length - 1].period_start).getTime();
      if (target >= firstT && target <= lastT) {
        let minDiff = Infinity;
        data.forEach((d, i) => {
          const t = new Date(d.period_start).getTime();
          if (isNaN(t)) return;
          const diff = Math.abs(t - target);
          if (diff < minDiff) {
            minDiff = diff;
            coverageAnnotationIdx = i;
          }
        });
      }
    }

    // Y1 Scale (Left axis). Domains ignore nulls: only finite values count.
    const vals1 = finiteValues(ind1);
    const maxVal1 = vals1.length > 0 ? Math.max(...vals1) : 10;
    const minVal1 = vals1.length > 0 ? Math.min(...vals1) : 0;
    const y1 = d3
      .scaleLinear()
      .domain([Math.min(0, minVal1), maxVal1 * 1.15 || 10])
      .range([innerHeight, 0])
      .nice();

    // Y2 Scale (Right axis). When both indicators share one unit there is
    // no right axis: the second series is drawn against y1.
    let y2 = y1;
    if (ind2 && ind2Axis === 'right') {
      const vals2 = finiteValues(ind2);
      const maxVal2 = vals2.length > 0 ? Math.max(...vals2) : 10;
      const minVal2 = vals2.length > 0 ? Math.min(...vals2) : 0;
      y2 = d3
        .scaleLinear()
        .domain([Math.min(0, minVal2), maxVal2 * 1.15 || 10])
        .range([innerHeight, 0])
        .nice();
    }

    // Grid lines (vertical dashed)
    const stepCount = Math.min(10, Math.max(4, Math.floor(data.length / 4)));
    const stepSize = Math.ceil(data.length / stepCount);
    let tickIndices = data.map((_, i) => i).filter((i) => i % stepSize === 0);
    const lastIndex = data.length - 1;
    if (tickIndices.length > 0 && tickIndices[tickIndices.length - 1] !== lastIndex) {
      if (lastIndex - tickIndices[tickIndices.length - 1] < stepSize / 2) {
        tickIndices[tickIndices.length - 1] = lastIndex;
      } else {
        tickIndices.push(lastIndex);
      }
    }

    g.append('g')
      .selectAll('line.v-grid')
      .data(tickIndices)
      .enter()
      .append('line')
      .attr('class', 'v-grid')
      .attr('x1', (i) => x(i) || 0)
      .attr('x2', (i) => x(i) || 0)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '4 4');

    // Horizontal grid
    g.append('g')
      .call(
        d3
          .axisLeft(y1)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#f3f4f6');

    // X Axis
    const xAxis = d3
      .axisBottom(x)
      .tickValues(tickIndices)
      .tickFormat((i) => {
        const item = data[i as number];
        return item ? formatPeriodLabel(item.period_start, grain) : '';
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280');

    // Left Y Axis
    const yAxisLeft = d3.axisLeft(y1).ticks(6);
    const leftAxisG = g.append('g').call(yAxisLeft);
    leftAxisG.selectAll('text').attr('font-size', '11px').attr('fill', ind1Cfg.color).attr('font-weight', 600);
    leftAxisG.select('.domain').attr('stroke', ind1Cfg.color);
    leftAxisG.selectAll('.tick line').attr('stroke', ind1Cfg.color);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -MARGINS.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', ind1Cfg.color)
      .attr('font-weight', 700)
      .text(`${ind1Cfg.label} (${ind1Cfg.unit})`);

    // Right Y Axis (only when the second indicator has a different unit)
    if (ind2 && ind2Cfg && ind2Axis === 'right') {
      const yAxisRight = d3.axisRight(y2).ticks(6);
      const rightAxisG = g
        .append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yAxisRight);
      rightAxisG.selectAll('text').attr('font-size', '11px').attr('fill', ind2Cfg.color).attr('font-weight', 600);
      rightAxisG.select('.domain').attr('stroke', ind2Cfg.color);
      rightAxisG.selectAll('.tick line').attr('stroke', ind2Cfg.color);

      g.append('text')
        .attr('transform', `translate(${innerWidth + 52}, ${innerHeight / 2}) rotate(90)`)
        .attr('text-anchor', 'middle')
        .attr('y', 0)
        .attr('x', 0)
        .attr('font-size', '12px')
        .attr('fill', ind2Cfg.color)
        .attr('font-weight', 700)
        .text(`${ind2Cfg.label} (${ind2Cfg.unit})`);
    }

    // Series 1 Line
    const line1 = d3
      .line<{ item: IndicatorTimelinePoint; index: number }>()
      .defined((d) => !isNaN(getPointValue(d.item, ind1)))
      .x((d) => x(d.index) || 0)
      .y((d) => y1(getPointValue(d.item, ind1)))
      .curve(d3.curveMonotoneX);

    const line1Data = data.map((item, index) => ({ item, index }));

    g.append('path')
      .datum(line1Data)
      .attr('fill', 'none')
      .attr('stroke', ind1Cfg.color)
      .attr('stroke-width', 2.2)
      .attr('d', line1);

    // Series 1 Points (missing readings are gaps, not dots at 0)
    g.selectAll('circle.dot1')
      .data(line1Data.filter((d) => !isNaN(getPointValue(d.item, ind1))))
      .enter()
      .append('circle')
      .attr('class', 'dot1')
      .attr('cx', (d) => x(d.index) || 0)
      .attr('cy', (d) => y1(getPointValue(d.item, ind1)))
      .attr('r', 3.5)
      .attr('fill', ind1Cfg.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    // Series 2 Line
    if (ind2 && ind2Cfg) {
      const yForInd2 = ind2Axis === 'left' ? y1 : y2;
      const line2 = d3
        .line<{ item: IndicatorTimelinePoint; index: number }>()
        .defined((d) => !isNaN(getPointValue(d.item, ind2)))
        .x((d) => x(d.index) || 0)
        .y((d) => yForInd2(getPointValue(d.item, ind2)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(line1Data)
        .attr('fill', 'none')
        .attr('stroke', ind2Cfg.color)
        .attr('stroke-width', 2.2)
        .attr('d', line2);

      g.selectAll('circle.dot2')
        .data(line1Data.filter((d) => !isNaN(getPointValue(d.item, ind2))))
        .enter()
        .append('circle')
        .attr('class', 'dot2')
        .attr('cx', (d) => x(d.index) || 0)
        .attr('cy', (d) => yForInd2(getPointValue(d.item, ind2)))
        .attr('r', 3.5)
        .attr('fill', ind2Cfg.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);
    }

    // Selected period dashed marker line
    if (selectedPeriod) {
      const selIdx = data.findIndex(
        (d) => d.period_start === selectedPeriod || (d as any).period === selectedPeriod
      );
      if (selIdx >= 0) {
        const selX = x(selIdx) || 0;
        g.append('line')
          .attr('x1', selX)
          .attr('x2', selX)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#1e293b')
          .attr('stroke-dasharray', '5 3')
          .attr('stroke-width', 2);
      }
    }

    // Coverage change marker line (dashed, dim until hovered)
    let coverageAnnotationLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null;
    if (coverageAnnotationIdx >= 0) {
      const annoX = x(coverageAnnotationIdx) || 0;
      coverageAnnotationLine = g
        .append('line')
        .attr('x1', annoX)
        .attr('x2', annoX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 3')
        .attr('opacity', 0.3)
        .attr('pointer-events', 'none');
    }

    // Overlay for hover and click interaction
    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    overlay.on('mousemove', (event) => {
      const [mx] = d3.pointer(event);
      let closestIdx = 0;
      let minDiff = Infinity;
      data.forEach((_, i) => {
        const px = x(i) || 0;
        const diff = Math.abs(px - mx);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      setHoverIndex(closestIdx);

      if (coverageAnnotationIdx >= 0) {
        const annoX = x(coverageAnnotationIdx) || 0;
        const nearAnnotation = Math.abs(annoX - mx) <= 8;
        coverageAnnotationLine?.attr('opacity', nearAnnotation ? 1 : 0.3);
        overlay.style('cursor', nearAnnotation ? 'help' : 'default');
        setCoverageAnnotationHover(nearAnnotation);
      }
    });

    overlay.on('mouseleave', () => {
      setHoverIndex(null);
      if (coverageAnnotationIdx >= 0) {
        coverageAnnotationLine?.attr('opacity', 0.3);
        overlay.style('cursor', 'default');
        setCoverageAnnotationHover(false);
      }
    });

    overlay.on('click', (event) => {
      const [mx] = d3.pointer(event);
      let closestIdx = 0;
      let minDiff = Infinity;
      data.forEach((_, i) => {
        const px = x(i) || 0;
        const diff = Math.abs(px - mx);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      if (data[closestIdx]) {
        onSelectPoint(data[closestIdx]);
      }
    });
  }, [data, indicators, dimensions, selectedPeriod, onSelectPoint, innerWidth, innerHeight]);

  const ind1Label = indicators[0] ? INDICATORS_CONFIG[indicators[0]]?.label || indicators[0] : '';
  const ind2Label = indicators[1] ? INDICATORS_CONFIG[indicators[1]]?.label || indicators[1] : '';

  const chartTitle = indicators.length === 2
    ? `${ind1Label} & ${ind2Label} (${grain}) : ${locationName}`
    : indicators.length === 1
    ? `${ind1Label} (${grain}) : ${locationName}`
    : `Indicator Timeline (${grain}) : ${locationName}`;

  const hoverPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {chartTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dateRange.start} to {dateRange.end}
            </Typography>

            {coverageAnnotationHover && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  mt: 0.5,
                  width: 260,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 2,
                  p: 1.25,
                  borderRadius: 1,
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {CHLOR_COVERAGE_CHANGE.note}
                </Typography>
              </Box>
            )}
          </Box>
          {indicators.length > 2 && (
            <Typography variant="caption" sx={{ color: '#ea580c', fontWeight: 600 }}>
              Note: Only up to two lines can be displayed at a time.
            </Typography>
          )}
        </Stack>

        {loading ? (
          <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
        ) : !data || data.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
            <Typography variant="body2" color="text.secondary">
              No timeline observations available for this location and date range.
            </Typography>
          </Box>
        ) : (
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: 380,
              position: 'relative',
            }}
          >
            <svg ref={chartRef} style={{ width: '100%', height: '100%', overflow: 'visible' }} />

            {hoverPoint && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 2,
                  p: 1.5,
                  borderRadius: 1,
                  pointerEvents: 'none',
                  zIndex: 10,
                  minWidth: 160,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {locationName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Period: {formatPeriodLabel(hoverPoint.period_start, grain)}
                </Typography>
                {indicators.map((indKey) => {
                  const cfg = INDICATORS_CONFIG[indKey] || { label: indKey, unit: '', color: '#3B82F6' };
                  const val = getPointValue(hoverPoint, indKey);
                  const formattedVal = formatIndicatorValue(indKey, val);
                  return (
                    <Stack
                      key={indKey}
                      direction="row"
                      justifyContent="space-between"
                      spacing={2}
                      sx={{ mb: 0.5 }}
                    >
                      <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
                        {cfg.label}:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: cfg.color }}>
                        {formattedVal === 'No data' ? formattedVal : `${formattedVal} ${cfg.unit}`}
                      </Typography>
                    </Stack>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default IndicatorTimelineChart;
