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
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimelineIcon from '@mui/icons-material/Timeline';
import MapIcon from '@mui/icons-material/Map';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { ViewModeTab } from '../components/ViewModeTab';
import { DownloadDataCard } from '../components/DownloadDataCard';
import {
  fetchIndicatorTimeline,
  fetchSpatialGrid,
  fetchSpatialSlice,
  fetchSpatialSeries,
} from '@/services/coastalService';
import { exportToCsv, exportToExcel, exportGraphAsPng, exportLeafletMapAsPng, buildIndicatorExportHeaders, buildIndicatorExportRows } from '@/src/utils/coastalExport';
import { getIndicatorMeta } from '../indicators';
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
import {
  buildSeriesInFlightKey,
  buildSpatialSliceCacheKey,
  shouldSkipSeriesFetch,
} from './spatial-cache';

export function generatePeriods(
  startDate: string,
  endDate: string,
  grain: string = 'monthly',
  timeline?: IndicatorTimelinePoint[]
): Array<{ label: string; start: string; end: string }> {
  if (timeline && timeline.length > 0) {
    return timeline.map((pt) => ({
      label: formatPeriodLabel(pt.period_start, grain),
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
    // Backend weekly grain weeks are Monday-anchored (e.g. 2020-01-06 to
    // 2020-01-12) and the slice endpoint only matches a stored week fully
    // inside the requested window. Anchor client windows on the same grid
    // so scrubber periods actually return data.
    const cur = new Date(start);
    const mondayOffset = (cur.getUTCDay() + 6) % 7;
    cur.setUTCDate(cur.getUTCDate() - mondayOffset);
    let weekNum = 1;
    while (cur <= end) {
      const periodStart = cur.toISOString().split('T')[0];
      const nextWeek = new Date(cur);
      nextWeek.setUTCDate(cur.getUTCDate() + 6);
      const periodEnd = nextWeek.toISOString().split('T')[0];
      const [ey, em, ed] = periodEnd.split('-');
      const label = `Week ${weekNum}: ${em}/${ed}/${ey}`;
      results.push({ label, start: periodStart, end: periodEnd });
      cur.setUTCDate(cur.getUTCDate() + 7);
      weekNum++;
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
      router.replace('/coastal?target=indicators');
    }
  }, [rawCountry, router]);

  // State
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>(initialView);
  const [data, setData] = useState<IndicatorTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['chlor_a', 'sst']);
  const [activeChoroplethIndicator, setActiveChoroplethIndicator] = useState<string>('chlor_a');
  const [aggFunc, setAggFunc] = useState<CoastalAggFunc>('average');
  const [clustersEnabled, setClustersEnabled] = useState<boolean>(true);
  const [grain, setGrain] = useState<CoastalGrain>(grainParam);
  const [selectedPoint, setSelectedPoint] = useState<IndicatorTimelinePoint | null>(null);
  const [selectedHexCells, setSelectedHexCells] = useState<string[]>([]);
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [spatialSlice, setSpatialSlice] = useState<Record<string, any> | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const sliceCacheRef = useRef<Map<string, Record<string, any>>>(new Map());

  // Handle escape key and body overflow for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Dispatch resize event when toggling fullscreen or selecting a hex cell
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, selectedHexCells]);

  // Reset fullscreen when switching view mode
  useEffect(() => {
    if (viewMode !== 'map') {
      setIsFullscreen(false);
    }
  }, [viewMode]);

  const mapHeight = useMemo(() => {
    if (!isFullscreen) return 630;
    return selectedHexCells.length > 0 ? 'calc(100vh - 460px)' : 'calc(100vh - 220px)';
  }, [isFullscreen, selectedHexCells]);

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
      setError('Unable to load coastal indicators data from the live API.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [country, aoi_id, start_date, end_date, grain, selectedIndicators, aggFunc]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleIndicator = (indicatorId: string) => {
    const isMapCapable = getIndicatorMeta(indicatorId)?.supports_map ?? true;
    if (selectedIndicators.includes(indicatorId)) {
      if (selectedIndicators.length > 1) {
        const next = selectedIndicators.filter((id) => id !== indicatorId);
        setSelectedIndicators(next);
        if (indicatorId === activeChoroplethIndicator) {
          const remainingMapCapable = next.find((id) => getIndicatorMeta(id)?.supports_map);
          if (remainingMapCapable) {
            setActiveChoroplethIndicator(remainingMapCapable);
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
        if (isMapCapable && indicatorId !== 'vessels') {
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
    params.set('target', 'indicators');
    router.push(`/coastal?${params.toString()}`);
  };

  const handleNewSearch = () => {
    router.push('/coastal?target=indicators');
  };

  const handleExportCsv = async () => {
    const filename = `coastal_indicators_${country}_${start_date}_${end_date}.csv`;
    const exportHeaders = await buildIndicatorExportHeaders(selectedIndicators);
    exportToCsv(filename, buildIndicatorExportRows(timelineData, selectedIndicators) as Record<string, any>[], exportHeaders);
  };

  const handleExportExcel = async () => {
    const filename = `coastal_indicators_${country}_${start_date}_${end_date}.xls`;
    const exportHeaders = await buildIndicatorExportHeaders(selectedIndicators);
    exportToExcel(filename, 'Indicators', buildIndicatorExportRows(timelineData, selectedIndicators) as Record<string, any>[], exportHeaders);
  };

  const handleExportGraph = () => {
    if (viewMode === 'map') {
      const filename = `coastal_map_${country}_${start_date}_${end_date}.png`;
      exportLeafletMapAsPng('coastal-map-container', filename);
      return;
    }
    const containerId = 'coastal-chart-container';
    const filename = `coastal_${viewMode}_${country}_${start_date}_${end_date}.png`;
    exportGraphAsPng(containerId, filename);
  };

  const timelineData = data?.timeline || data?.series || [];
  const showVesselOverlay = selectedIndicators.includes('vessels');

  const [weeklyYear, setWeeklyYear] = useState<number>(() => {
    const d = new Date(start_date);
    return isNaN(d.getTime()) ? 2024 : d.getFullYear();
  });

  const periodItems = useMemo(() => {
    if (grain === 'weekly') {
      // Prefer backend timeline weeks (the same Monday-anchored grid the
      // slice/series endpoints query) so the scrubber, the batch cache and
      // per-period slices all agree. Fall back to generated weeks only when
      // the timeline has not loaded yet.
      const tl = data?.timeline || data?.series;
      if (tl && tl.length > 0) {
        const yearStr = String(weeklyYear);
        let weekNum = 1;
        const items = tl
          .filter((pt) => {
            const s = (pt.period_start || '').slice(0, 10);
            const e = (pt.period_end || pt.period_start || '').slice(0, 10);
            return s.slice(0, 4) === yearStr || e.slice(0, 4) === yearStr;
          })
          .map((pt) => {
            const s = (pt.period_start || '').slice(0, 10);
            const e = (pt.period_end || pt.period_start || '').slice(0, 10);
            const [ey, em, ed] = e.split('-');
            return { label: `Week ${weekNum++}: ${em}/${ed}/${ey}`, start: s, end: e };
          });
        if (items.length > 0) return items;
      }
      return generatePeriods(`${weeklyYear}-01-01`, `${weeklyYear}-12-31`, 'weekly');
    }
    return generatePeriods(start_date, end_date, grain, data?.timeline || data?.series);
  }, [start_date, end_date, grain, weeklyYear, data?.timeline, data?.series]);

  const periods = useMemo(() => periodItems.map((p) => p.label), [periodItems]);
  const activeScrubberIndex = Math.min(Math.max(0, scrubberIndex), Math.max(0, periods.length - 1));

  // Mirror of the scrubber index for the series `.then` path: the series
  // effect no longer depends on the index (scrub ticks must not refetch),
  // so it reads the live position through this ref instead of a stale
  // closure value.
  const scrubberIndexRef = useRef(activeScrubberIndex);
  scrubberIndexRef.current = activeScrubberIndex;
  // In-flight key (see `buildSeriesInFlightKey`) of the running
  // `/spatial/series` prefetch, or null when idle. The slice fallback
  // effect checks this to avoid racing the batch request per scrub tick.
  const seriesInFlightRef = useRef<string | null>(null);

  const handlePrevYear = () => {
    setWeeklyYear((y) => y - 1);
    setScrubberIndex(0);
  };

  const handleNextYear = () => {
    setWeeklyYear((y) => y + 1);
    setScrubberIndex(0);
  };

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

  // Pre-fetch batch spatial series across all periods for instant 60 FPS playback.
  // NOTE: intentionally NOT dependent on the scrubber index. Scrub ticks are
  // served from `sliceCacheRef`; refetching per tick caused the 2026-09-25
  // incident (~57 series calls piling up). The live index is read via
  // `scrubberIndexRef` in `.then`, and the fetch is skipped entirely when
  // every period key for this scope is already cached (also guards refetch
  // on unrelated `periodItems` identity changes).
  useEffect(() => {
    if (viewMode !== 'map' || !country || periodItems.length === 0) {
      return;
    }

    const scope = {
      country,
      indicator: activeChoroplethIndicator,
      grain,
      aoiId: aoi_id,
    };

    if (shouldSkipSeriesFetch(periodItems, scope, sliceCacheRef.current)) {
      return;
    }

    let isMounted = true;
    const inFlightKey = buildSeriesInFlightKey(scope);
    seriesInFlightRef.current = inFlightKey;

    fetchSpatialSeries({
      country,
      start_date: periodItems[0].start,
      end_date: periodItems[periodItems.length - 1].end,
      grain,
      indicator: activeChoroplethIndicator,
      aoi_id: aoi_id || undefined,
    })
      .then((res) => {
        if (!isMounted || !res?.series) return;
        Object.entries(res.series).forEach(([periodStart, cellMap]) => {
          // Series keys carry timestamps ('YYYY-MM-DD HH:MM:SS'); the key
          // builder normalizes to the day so they hit the same cache keys
          // the scrubber uses.
          const key = buildSpatialSliceCacheKey({ ...scope, periodStart });
          sliceCacheRef.current.set(key, cellMap as Record<string, any>);
        });

        const cur = periodItems[scrubberIndexRef.current];
        if (cur) {
          const curKey = buildSpatialSliceCacheKey({ ...scope, periodStart: cur.start });
          const cached = sliceCacheRef.current.get(curKey);
          if (cached) {
            setSpatialSlice(cached);
          }
        }
      })
      .catch((err) => {
        console.warn('Batch spatial series pre-fetch failed, falling back to slice queries:', err);
      })
      .finally(() => {
        if (seriesInFlightRef.current === inFlightKey) {
          seriesInFlightRef.current = null;
        }
      });

    return () => {
      isMounted = false;
      if (seriesInFlightRef.current === inFlightKey) {
        seriesInFlightRef.current = null;
      }
    };
  }, [country, grain, activeChoroplethIndicator, aoi_id, viewMode, periodItems]);

  // Fetch or derive spatial slice when active period or indicator changes.
  // Skips while the series prefetch for this scope is in flight (its `.then`
  // serves the slider from cache on success) and debounces the fallback so
  // fast scrubbing does not fan out one `/spatial/slice` call per tick.
  useEffect(() => {
    if (viewMode !== 'map' || periodItems.length === 0) {
      return;
    }

    const curPeriod = periodItems[activeScrubberIndex];
    if (!curPeriod) return;

    const scope = {
      country,
      indicator: activeChoroplethIndicator,
      grain,
      aoiId: aoi_id,
    };

    const cacheKey = buildSpatialSliceCacheKey({ ...scope, periodStart: curPeriod.start });
    if (sliceCacheRef.current.has(cacheKey)) {
      setSpatialSlice(sliceCacheRef.current.get(cacheKey));
      return;
    }

    if (seriesInFlightRef.current === buildSeriesInFlightKey(scope)) {
      return;
    }

    let isCurrent = true;

    const timer = setTimeout(() => {
      fetchSpatialSlice({
        country,
        period_start: curPeriod.start,
        period_end: curPeriod.end,
        grain,
        indicator: activeChoroplethIndicator,
        aoi_id: aoi_id || undefined,
      })
        .then((res) => {
          if (!isCurrent) return;
          const sliceData = res?.values || res?.data;
          if (sliceData && Object.keys(sliceData).length > 0) {
            sliceCacheRef.current.set(cacheKey, sliceData);
            setSpatialSlice(sliceData);
          } else {
            setSpatialSlice({});
          }
        })
        .catch(() => {
          if (!isCurrent) return;
          setSpatialSlice({});
        });
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [country, aoi_id, activeScrubberIndex, periodItems, activeChoroplethIndicator, grain, viewMode]);

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
        <ViewModeTab
          active={viewMode === 'timeline'}
          title="Environment Timeline"
          subtitle="Line trends by variable"
          icon={<TimelineIcon />}
          vectorSrc="/images/coastal/bar-chart.png"
          gradient="blue"
          onClick={() => setViewMode('timeline')}
        />
        <ViewModeTab
          active={viewMode === 'map'}
          title="Choropleth Map"
          subtitle="Spatial visualization"
          icon={<MapIcon />}
          vectorSrc="/images/coastal/map-pin.png"
          gradient="teal"
          onClick={() => setViewMode('map')}
        />
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
                grain={grain}
                loading={loading}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <DetailsCard
                selectedPoint={selectedPoint}
                timeline={timelineData}
                activeIndicator={selectedIndicators[0]}
                locationName={locationLabel}
                grain={grain}
                loading={loading}
              />
            </Box>
          </Stack>

          {/* Middle Row: Indicator Timeline Chart and Sidebar Controls */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
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
            {/* On desktop the sidebar is pinned to the chart height and its list scrolls. */}
            <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0, position: 'relative' }}>
              <Box sx={{ position: { md: 'absolute' }, inset: { md: 0 } }}>
                <IndicatorSidebar
                  selectedIndicators={selectedIndicators}
                  onToggleIndicator={handleToggleIndicator}
                  aggFunc={aggFunc}
                  onChangeAggFunc={(agg) => setAggFunc(agg)}
                  mode="timeline"
                />
              </Box>
            </Box>
          </Stack>
        </>
      )}

      {/* VIEW MODE 2: CHOROPLETH MAP */}
      {viewMode === 'map' && (
        <Box
          sx={
            isFullscreen
              ? {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1300,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc',
                  pt: { xs: 0.75, md: 1 },
                  px: { xs: 1.5, md: 2.5 },
                  pb: { xs: 1.5, md: 2.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  overflowY: 'auto',
                }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%',
                }
          }
        >
          {/* Top Row: Hex Cell Detail Inspection Card */}
          {(!isFullscreen || selectedHexCells.length > 0) && (
            <Box sx={{ width: '100%' }}>
              <HexCellDetailModal
                cellIds={selectedHexCells}
                locationName={locationLabel}
                country={country}
                grain={grain}
                dateRange={{ start: start_date, end: end_date }}
                indicators={selectedIndicators}
                onClose={() => setSelectedHexCells([])}
              />
            </Box>
          )}

          {/* Middle Row: Choropleth Map + Scrubber and Sidebar */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems="flex-start"
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box
                    sx={{
                      mb: 2,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {(() => {
                          const grainLabel = grain ? grain.charAt(0).toUpperCase() + grain.slice(1) : 'Monthly';
                          const activeMeta = getIndicatorMeta(activeChoroplethIndicator);
                          const hasVessels = selectedIndicators.includes('vessels');
                          const envLabels = selectedIndicators
                            .filter((id) => id !== 'vessels')
                            .map((id) => getIndicatorMeta(id)?.shortLabel || id);
                          const parts: string[] = [];
                          if (hasVessels) parts.push('Vessel Count');
                          parts.push(...envLabels.map((label) => `Average ${label}`));
                          if (parts.length === 0 && activeMeta) {
                            parts.push(`Average ${activeMeta.shortLabel}`);
                          }
                          return `${parts.join(' & ')} (${grainLabel}) - ${locationLabel}`;
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

                    <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                      <IconButton
                        onClick={() => setIsFullscreen((prev) => !prev)}
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        size="small"
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          bgcolor: isFullscreen ? 'action.selected' : 'background.paper',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box
                    id="coastal-map-container"
                    sx={{
                      minHeight: isFullscreen ? (selectedHexCells.length > 0 ? 380 : 500) : 630,
                    }}
                  >
                    <CoastalChoroplethMap
                      key={`${country}_${aoi_id || ''}_${locationLabel}`}
                      country={country}
                      locationName={locationLabel}
                      aoiIds={aoi_id ? aoi_id.split(',').map((s) => s.trim()).filter(Boolean) : undefined}
                      activeIndicator={activeChoroplethIndicator}
                      overlayVessels={showVesselOverlay}
                      spatialSlice={spatialSlice}
                      selectedCellIds={selectedHexCells}
                      onSelectCell={(id) =>
                        setSelectedHexCells((prev) =>
                          prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                        )
                      }
                      onClearSelection={() => setSelectedHexCells([])}
                      periodLabel={periods[activeScrubberIndex]}
                      indicators={selectedIndicators}
                      height={mapHeight}
                      clustersEnabled={clustersEnabled}
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <TemporalScrubber
                      periods={periods}
                      currentIndex={activeScrubberIndex}
                      onChangeIndex={(idx) => setScrubberIndex(idx)}
                      grain={grain}
                      activeYear={grain === 'weekly' ? weeklyYear : undefined}
                      onPrevYear={grain === 'weekly' ? handlePrevYear : undefined}
                      onNextYear={grain === 'weekly' ? handleNextYear : undefined}
                      canPrevYear={grain === 'weekly' ? weeklyYear > 2018 : undefined}
                      canNextYear={grain === 'weekly' ? weeklyYear < 2026 : undefined}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box
              sx={{
                width: { xs: '100%', md: 260 },
                flexShrink: 0,
                ...(isFullscreen && {
                  maxHeight: 'calc(100vh - 48px)',
                  overflowY: 'auto',
                }),
              }}
            >
              <IndicatorSidebar
                selectedIndicators={selectedIndicators}
                onToggleIndicator={handleToggleIndicator}
                aggFunc={aggFunc}
                onChangeAggFunc={(agg) => setAggFunc(agg)}
                mode="map"
                activeChoroplethIndicator={activeChoroplethIndicator}
                onChangeChoroplethIndicator={(ind) => setActiveChoroplethIndicator(ind)}
                clustersEnabled={clustersEnabled}
                onChangeClustersEnabled={(enabled) => setClustersEnabled(enabled)}
              />
            </Box>
          </Stack>
        </Box>
      )}

      {/* Bottom Row: Download Data Card */}
      <DownloadDataCard
        onExportGraph={handleExportGraph}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
      />
    </Stack>
  );
}

export default PageContent;
