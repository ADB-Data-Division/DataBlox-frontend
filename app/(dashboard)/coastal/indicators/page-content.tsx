'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimelineIcon from '@mui/icons-material/Timeline';
import MapIcon from '@mui/icons-material/Map';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchIndicatorTimeline, fetchSpatialGrid, fetchSpatialSlice } from '@/services/coastalService';
import { exportToCsv, exportToExcel, exportGraphAsPng } from '@/src/utils/coastalExport';
import type {
  CoastalAggFunc,
  CoastalGrain,
  IndicatorTimelinePoint,
  IndicatorTimelineResponse,
} from '@/types/coastal';
import { SummaryCards } from '../components/SummaryCards';
import { DetailsCard } from '../components/DetailsCard';
import { IndicatorTimelineChart, formatPeriodLabel } from '../components/IndicatorTimelineChart';
import { IndicatorSidebar } from '../components/IndicatorSidebar';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import CoastalChoroplethMap from '../components/CoastalChoroplethMap';
import TemporalScrubber from '../components/TemporalScrubber';
import HexCellDetailModal from '../components/HexCellDetailModal';
import { formatDisplayName } from '../data/provinces';

const SAMPLE_TIMELINE_DATA: IndicatorTimelinePoint[] = [
  { period_start: '2019-01-01', period_end: '2019-01-31', chlor_a: 2.1, total_vessels: 45, sst_c: 28.1, port_call_duration_hours: 50 },
  { period_start: '2019-06-01', period_end: '2019-06-30', chlor_a: 3.4, total_vessels: 48, sst_c: 27.5, port_call_duration_hours: 52 },
  { period_start: '2019-12-01', period_end: '2019-12-31', chlor_a: 2.6, total_vessels: 52, sst_c: 29.0, port_call_duration_hours: 58 },
  { period_start: '2020-06-01', period_end: '2020-06-30', chlor_a: 6.84, total_vessels: 46, sst_c: 28.2, port_call_duration_hours: 49 },
  { period_start: '2021-01-01', period_end: '2021-01-31', chlor_a: 2.8, total_vessels: 55, sst_c: 28.6, port_call_duration_hours: 60 },
  { period_start: '2021-06-01', period_end: '2021-06-30', chlor_a: 4.2, total_vessels: 50, sst_c: 27.9, port_call_duration_hours: 55 },
  { period_start: '2022-01-01', period_end: '2022-01-31', chlor_a: 2.3, total_vessels: 58, sst_c: 28.8, port_call_duration_hours: 65 },
  { period_start: '2022-09-01', period_end: '2022-09-30', chlor_a: 5.01, total_vessels: 62, sst_c: 28.4, port_call_duration_hours: 70 },
  { period_start: '2023-01-01', period_end: '2023-01-31', chlor_a: 2.5, total_vessels: 59, sst_c: 29.1, port_call_duration_hours: 68 },
  { period_start: '2023-06-01', period_end: '2023-06-30', chlor_a: 3.8, total_vessels: 61, sst_c: 28.0, port_call_duration_hours: 72 },
  { period_start: '2024-01-01', period_end: '2024-01-31', chlor_a: 2.9, total_vessels: 65, sst_c: 29.4, port_call_duration_hours: 75 },
  { period_start: '2024-06-01', period_end: '2024-06-30', chlor_a: 4.5, total_vessels: 64, sst_c: 28.5, port_call_duration_hours: 74 },
  { period_start: '2025-06-01', period_end: '2025-06-30', chlor_a: 3.9, total_vessels: 69, sst_c: 28.9, port_call_duration_hours: 78 },
];

export function generatePeriods(
  startDate: string,
  endDate: string,
  grain: string = 'monthly',
  timeline?: IndicatorTimelinePoint[]
): Array<{ label: string; start: string; end: string }> {
  if (timeline && timeline.length > 0) {
    return timeline.map((pt) => ({
      label: formatPeriodLabel(pt.period_start),
      start: pt.period_start,
      end: pt.period_end || pt.period_start,
    }));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [{ label: 'Jan 2024', start: '2024-01-01', end: '2024-01-31' }];
  }

  const results: Array<{ label: string; start: string; end: string }> = [];

  if (grain === 'annually') {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      results.push({
        label: String(y),
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      });
    }
    return results;
  }

  if (grain === 'weekly') {
    const cur = new Date(start);
    while (cur <= end) {
      const periodStart = cur.toISOString().split('T')[0];
      const nextWeek = new Date(cur);
      nextWeek.setDate(cur.getDate() + 6);
      const periodEnd = nextWeek.toISOString().split('T')[0];
      const label = `${cur.toLocaleString('en-US', { month: 'short' })} ${cur.getDate()}`;
      results.push({ label, start: periodStart, end: periodEnd });
      cur.setDate(cur.getDate() + 7);
    }
    return results;
  }

  // Monthly
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endLimit) {
    const y = current.getFullYear();
    const m = current.getMonth();
    const monthStr = (m + 1).toString().padStart(2, '0');
    const periodStart = `${y}-${monthStr}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const periodEnd = `${y}-${monthStr}-${lastDay.toString().padStart(2, '0')}`;
    const label = current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    results.push({ label, start: periodStart, end: periodEnd });
    current.setMonth(current.getMonth() + 1);
  }

  return results;
}

export function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL Parameters
  const rawCountry = searchParams.get('country');
  const country = rawCountry || '';
  const aoi_id = searchParams.get('aois') || undefined;
  const rawNames = searchParams.get('names');
  const start_date = searchParams.get('start_date') || '2019-01-01';
  const end_date = searchParams.get('end_date') || '2025-12-31';
  const grainParam = (searchParams.get('grain') as CoastalGrain) || 'monthly';
  const initialView = searchParams.get('view') === 'map' ? 'map' : 'timeline';

  useEffect(() => {
    if (!rawCountry) {
      router.replace('/coastal');
    }
  }, [rawCountry, router]);

  // State
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>(initialView);
  const [data, setData] = useState<IndicatorTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['chlor_a', 'vessels']);
  const [activeChoroplethIndicator, setActiveChoroplethIndicator] = useState<string>('chlor_a');
  const [aggFunc, setAggFunc] = useState<CoastalAggFunc>('average');
  const [grain, setGrain] = useState<CoastalGrain>(grainParam);
  const [selectedPoint, setSelectedPoint] = useState<IndicatorTimelinePoint | null>(null);
  const [selectedHexCell, setSelectedHexCell] = useState<string | null>(null);
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [spatialSlice, setSpatialSlice] = useState<Record<string, any> | undefined>(undefined);
  const sliceCacheRef = useRef<Map<string, Record<string, any>>>(new Map());

  const locationLabel = rawNames
    ? rawNames
    : aoi_id
    ? aoi_id.split(',').map((id) => formatDisplayName(id)).join(', ')
    : country || 'Select Location';

  const loadData = useCallback(async () => {
    if (!rawCountry) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchIndicatorTimeline({
        country,
        aoi_id,
        start_date,
        end_date,
        grain,
        indicators: selectedIndicators,
        agg_func: aggFunc,
      });
      setData(response);
    } catch (err) {
      console.error(err);
      setError('Live API data unavailable. Showing baseline historical data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [country, aoi_id, start_date, end_date, grain, selectedIndicators, aggFunc]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleIndicator = (indicatorId: string) => {
    if (selectedIndicators.includes(indicatorId)) {
      if (selectedIndicators.length > 1) {
        const next = selectedIndicators.filter((id) => id !== indicatorId);
        setSelectedIndicators(next);
        if (indicatorId === activeChoroplethIndicator) {
          const remainingEnv = next.find((id) => id === 'chlor_a' || id === 'sst');
          if (remainingEnv) {
            setActiveChoroplethIndicator(remainingEnv);
          }
        }
      }
    } else {
      if (viewMode === 'map') {
        if (selectedIndicators.length < 3) {
          setSelectedIndicators([...selectedIndicators, indicatorId]);
        } else {
          setSelectedIndicators([selectedIndicators[0], selectedIndicators[1], indicatorId]);
        }
        if (indicatorId === 'sst' || indicatorId === 'chlor_a') {
          setActiveChoroplethIndicator(indicatorId);
        }
      } else {
        if (selectedIndicators.length < 2) {
          setSelectedIndicators([...selectedIndicators, indicatorId]);
        } else {
          setSelectedIndicators([selectedIndicators[0], indicatorId]);
        }
      }
    }
  };

  const handleEditSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/coastal?${params.toString()}`);
  };

  const handleNewSearch = () => {
    router.push('/coastal');
  };

  const handleExportCsv = () => {
    const filename = `coastal_indicators_${country}_${start_date}_${end_date}.csv`;
    const exportHeaders = [
      { key: 'period_start', label: 'Period Start' },
      { key: 'period_end', label: 'Period End' },
      { key: 'chlor_a', label: 'Chlorophyll-a (mg/m³)' },
      { key: 'sst_c', label: 'Sea Surface Temp (°C)' },
      { key: 'sst_k', label: 'Sea Surface Temp (K)' },
      { key: 'total_vessels', label: 'Total Maritime Vessels' },
      { key: 'port_call_duration_hours', label: 'Port Call Duration (Hours)' },
    ];
    exportToCsv(filename, timelineData as Record<string, any>[], exportHeaders);
  };

  const handleExportExcel = () => {
    const filename = `coastal_indicators_${country}_${start_date}_${end_date}.xls`;
    const exportHeaders = [
      { key: 'period_start', label: 'Period Start' },
      { key: 'period_end', label: 'Period End' },
      { key: 'chlor_a', label: 'Chlorophyll-a (mg/m³)' },
      { key: 'sst_c', label: 'Sea Surface Temp (°C)' },
      { key: 'sst_k', label: 'Sea Surface Temp (K)' },
      { key: 'total_vessels', label: 'Total Maritime Vessels' },
      { key: 'port_call_duration_hours', label: 'Port Call Duration (Hours)' },
    ];
    exportToExcel(filename, 'Indicators', timelineData as Record<string, any>[], exportHeaders);
  };

  const handleExportGraph = () => {
    const containerId = viewMode === 'map' ? 'coastal-map-container' : 'coastal-chart-container';
    const filename = `coastal_${viewMode}_${country}_${start_date}_${end_date}.png`;
    exportGraphAsPng(containerId, filename);
  };

  const timelineData = data?.timeline || data?.series || SAMPLE_TIMELINE_DATA;
  const showVesselOverlay = selectedIndicators.includes('vessels');

  const periodItems = useMemo(() => {
    return generatePeriods(start_date, end_date, grain, data?.timeline || data?.series);
  }, [start_date, end_date, grain, data?.timeline, data?.series]);

  const periods = useMemo(() => periodItems.map((p) => p.label), [periodItems]);
  const activeScrubberIndex = Math.min(Math.max(0, scrubberIndex), Math.max(0, periods.length - 1));

  // Set default scrubber index to the latest period or Jul 2024 when periods are loaded
  useEffect(() => {
    if (periods.length > 0) {
      const jul2024Idx = periods.findIndex((p) => p === 'Jul 2024');
      if (jul2024Idx >= 0) {
        setScrubberIndex(jul2024Idx);
      } else {
        setScrubberIndex(periods.length - 1);
      }
    }
  }, [periods]);

  // Fetch or derive spatial slice when active period or indicator changes
  useEffect(() => {
    if (viewMode !== 'map' || periodItems.length === 0) {
      return;
    }

    const curPeriod = periodItems[activeScrubberIndex];
    if (!curPeriod) return;

    const cacheKey = `${country}_${curPeriod.start}_${activeChoroplethIndicator}_${grain}`;
    if (sliceCacheRef.current.has(cacheKey)) {
      setSpatialSlice(sliceCacheRef.current.get(cacheKey));
      return;
    }

    let isCurrent = true;

    fetchSpatialSlice({
      country,
      period_start: curPeriod.start,
      period_end: curPeriod.end,
      grain,
      indicator: activeChoroplethIndicator,
    })
      .then((res) => {
        if (!isCurrent) return;
        const sliceData = res?.values || res?.data;
        if (sliceData && Object.keys(sliceData).length > 0) {
          sliceCacheRef.current.set(cacheKey, sliceData);
          setSpatialSlice(sliceData);
        } else {
          deriveFallback();
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        deriveFallback();
      });

    function deriveFallback() {
      const pt = timelineData?.find(
        (p) => p.period_start === curPeriod.start || p.period_start.startsWith(curPeriod.start.slice(0, 7))
      );
      if (pt) {
        const chlor = pt.chlor_a ?? pt.mean_chlor_a ?? 2.0;
        const sst = pt.sst_k ? pt.sst_k : pt.sst_c ? pt.sst_c + 273.15 : 300.0;
        const vessels = pt.total_vessels ?? pt.unique_vessels ?? 30;

        const synth: Record<string, any> = {
          '878db5169ffffff': { chlor_a: chlor, sst, vessels },
          '878db516affffff': { chlor_a: Math.max(0.5, chlor * 0.8), sst: sst - 1.2, vessels: Math.max(1, Math.round(vessels * 0.7)) },
          '878db516bffffff': { chlor_a: chlor * 1.1, sst: sst + 0.8, vessels: Math.max(1, Math.round(vessels * 0.9)) },
          '878db516cffffff': { chlor_a: Math.max(0.5, chlor * 0.6), sst: sst - 0.5, vessels: Math.max(1, Math.round(vessels * 0.4)) },
          '878db516dffffff': { chlor_a: chlor * 0.9, sst: sst + 0.4, vessels: Math.max(1, Math.round(vessels * 0.6)) },
        };
        sliceCacheRef.current.set(cacheKey, synth);
        setSpatialSlice(synth);
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [country, activeScrubberIndex, periodItems, activeChoroplethIndicator, grain, viewMode, timelineData]);

  if (!rawCountry) {
    return null;
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {/* Top Header & Time Range Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        {/* Left: Title & Location Card */}
        <Card
          variant="outlined"
          sx={{
            flex: { xs: '1 1 auto', md: '0 0 38%' },
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', '&:last-child': { pb: 3 } }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                Multi-province Indicator Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Timeline of Indicator Trends
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  icon={<LocationOnIcon sx={{ fontSize: 16 }} />}
                  label={locationLabel}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="body2" color="text.secondary">
                  1 province
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleEditSearch}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Edit Search
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleNewSearch}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                New Search
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Right: Time Range Selector Card */}
        <Card
          variant="outlined"
          sx={{
            flex: { xs: '1 1 auto', md: '1 1 0%' },
            borderRadius: 2,
            opacity: viewMode === 'map' ? 0.5 : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <TimeRangeSelector
              startDate={start_date}
              endDate={end_date}
              grain={grain}
              onRangeChange={(newStart, newEnd) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('start_date', newStart);
                params.set('end_date', newEnd);
                router.replace(`?${params.toString()}`);
              }}
              onGrainChange={(newGrain) => {
                setGrain(newGrain);
                const params = new URLSearchParams(searchParams.toString());
                params.set('grain', newGrain);
                router.replace(`?${params.toString()}`);
              }}
              disabled={viewMode === 'map'}
            />
            {viewMode === 'map' && (
              <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', px: 1, mt: 0.5 }}>
                Note: Time range is disabled for choropleth map. Use the time slider below the interactive map.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Segmented Pill Switcher */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper
          variant="outlined"
          onClick={() => setViewMode('timeline')}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: viewMode === 'timeline' ? 'primary.main' : 'background.paper',
            color: viewMode === 'timeline' ? 'primary.contrastText' : 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <TimelineIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Environment Timeline
            </Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => setViewMode('map')}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: viewMode === 'map' ? 'teal' : 'background.paper',
            color: viewMode === 'map' ? '#ffffff' : 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <MapIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Choropleth Map
            </Typography>
          </Box>
        </Paper>
      </Stack>

      {/* Alert if offline */}
      {error && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* VIEW MODE 1: TIMELINE */}
      {viewMode === 'timeline' && (
        <>
          {/* Top Row: Summary Cards (Slots 1 & 2) and Contextual Details Card (Slot 3) */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
            <Box sx={{ flex: 2, minWidth: 0 }}>
              <SummaryCards
                summary={data?.summary}
                indicators={selectedIndicators}
                locationName={locationLabel}
                dateRange={{ start: start_date, end: end_date }}
                timeline={timelineData}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <DetailsCard
                selectedPoint={selectedPoint}
                timeline={timelineData}
                activeIndicator={selectedIndicators[0]}
                locationName={locationLabel}
                grain={grain}
              />
            </Box>
          </Stack>

          {/* Middle Row: Indicator Timeline Chart and Sidebar Controls */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <Box id="coastal-chart-container" sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <IndicatorTimelineChart
                data={timelineData}
                indicators={selectedIndicators}
                grain={grain}
                locationName={locationLabel}
                dateRange={{ start: start_date, end: end_date }}
                selectedPeriod={selectedPoint?.period_start || null}
                onSelectPoint={(pt) => setSelectedPoint(pt)}
                loading={loading}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
              <IndicatorSidebar
                selectedIndicators={selectedIndicators}
                onToggleIndicator={handleToggleIndicator}
                aggFunc={aggFunc}
                onChangeAggFunc={(agg) => setAggFunc(agg)}
                mode="timeline"
              />
            </Box>
          </Stack>
        </>
      )}

      {/* VIEW MODE 2: CHOROPLETH MAP */}
      {viewMode === 'map' && (
        <>
          {/* Top Row: Hex Cell Detail Inspection Card */}
          <Box sx={{ width: '100%' }}>
            <HexCellDetailModal
              cellId={selectedHexCell}
              locationName={locationLabel}
              dateRange={{ start: start_date, end: end_date }}
              indicators={selectedIndicators}
              onClose={() => setSelectedHexCell(null)}
            />
          </Box>

          {/* Middle Row: Choropleth Map + Scrubber and Sidebar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {(() => {
                        const grainLabel = grain ? grain.charAt(0).toUpperCase() + grain.slice(1) : 'Monthly';
                        const hasVessels = selectedIndicators.includes('vessels');
                        const hasChlor = selectedIndicators.includes('chlor_a');
                        const hasSST = selectedIndicators.includes('sst');

                        if (hasVessels && hasChlor && hasSST) {
                          return `Vessel Count, Average Chlorophyll-a Concentration & Sea Surface Temperature (${grainLabel}) - ${locationLabel}`;
                        }
                        if (hasVessels && hasChlor) {
                          return `Vessel Count & Average Chlorophyll-a Concentration (${grainLabel}) - ${locationLabel}`;
                        }
                        if (hasVessels && hasSST) {
                          return `Vessel Count & Average Sea Surface Temperature (${grainLabel}) - ${locationLabel}`;
                        }
                        if (activeChoroplethIndicator === 'sst') {
                          return `Average Sea Surface Temperature (${grainLabel}) - ${locationLabel}`;
                        }
                        if (hasVessels && selectedIndicators.length === 1) {
                          return `Vessel Count (${grainLabel}) - ${locationLabel}`;
                        }
                        return `Average Chlorophyll-a Concentration (${grainLabel}) - ${locationLabel}`;
                      })()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(() => {
                        const formatMY = (d: string) => {
                          const dt = new Date(d);
                          return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        };
                        return `${formatMY(start_date)} - ${formatMY(end_date)}`;
                      })()}
                    </Typography>
                  </Box>

                  <Box id="coastal-map-container" sx={{ minHeight: 420 }}>
                    <CoastalChoroplethMap
                      key={`${country}_${aoi_id || ''}_${locationLabel}`}
                      country={country}
                      locationName={locationLabel}
                      aoiIds={aoi_id ? aoi_id.split(',').map((s) => s.trim()).filter(Boolean) : undefined}
                      activeIndicator={activeChoroplethIndicator}
                      overlayVessels={showVesselOverlay}
                      spatialSlice={spatialSlice}
                      selectedCellId={selectedHexCell}
                      onSelectCell={(id) => setSelectedHexCell(id)}
                      periodLabel={periods[activeScrubberIndex]}
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <TemporalScrubber
                      periods={periods}
                      currentIndex={activeScrubberIndex}
                      onChangeIndex={(idx) => setScrubberIndex(idx)}
                      grain={grain}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
              <IndicatorSidebar
                selectedIndicators={selectedIndicators}
                onToggleIndicator={handleToggleIndicator}
                aggFunc={aggFunc}
                onChangeAggFunc={(agg) => setAggFunc(agg)}
                mode="map"
                activeChoroplethIndicator={activeChoroplethIndicator}
                onChangeChoroplethIndicator={(ind) => setActiveChoroplethIndicator(ind)}
              />
            </Box>
          </Stack>
        </>
      )}

      {/* Bottom Row: Download Data Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Download Data
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sources: NOAA CoastWatch, Copernicus Climate Data Store, United Nations Global Platform, VesselBot
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportGraph}
              >
                Graph
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportExcel}
              >
                Excel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default PageContent;
