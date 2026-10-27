'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Alert,
  Typography,
  Chip,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import MapIcon from '@mui/icons-material/Map';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SettingsIcon from '@mui/icons-material/Settings';
import { ViewModeTab } from '../components/ViewModeTab';
import { DownloadDataCard } from '../components/DownloadDataCard';
import VesselTimelineChart from '../components/VesselTimelineChart';
import VesselDistributionCharts from '../components/VesselDistributionCharts';
import VesselSummaryCards from '../components/VesselSummaryCards';
import { exportToCsv, exportToExcel, exportGraphAsPng, exportChartWithContextAsPng, exportLeafletMapAsPng } from '@/src/utils/coastalExport';
import { VesselSpatialMap } from '../components/VesselSpatialMap';
import {
  getVesselTimelineTypeGroups,
  subtypeVisibilityKey,
  vesselCategoryColor,
} from '../components/vessel-timeline-model';
import HexCellDetailModal from '../components/HexCellDetailModal';
import TemporalScrubber from '../components/TemporalScrubber';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { showNationLoadNote, NATION_LOAD_NOTE } from '../view-defaults';
import { AggLevelSelect, type CoastalGrain } from '../components/AggLevelSelect';
import { formatDisplayName } from '../data/provinces';
import { generatePeriods } from '../indicators/page-content';
import {
  fetchVesselDistribution,
  fetchVesselTimeline,
  fetchSpatialSlice,
  fetchSpatialSeries,
} from '@/services/coastalService';
import type { VesselTimelineResponse } from '@/types/coastal';
import type { CoastalVesselAggregation, CoastalVesselMetric } from '@/types/coastal';
import {
  buildVesselTimelineExportData,
  getVesselTypeTimelineAggregation,
  mergeVesselTimelineTypeData,
  shouldShowVesselTypeSeries,
} from '../components/vessel-timeline-model';
import {
  buildSeriesInFlightKey,
  buildSpatialSliceCacheKey,
  shouldSkipSeriesFetch,
} from './spatial-cache';
import {
  resolveSpatialStatus,
  shouldWaitForSeries,
  sliceDelayMs,
  type SpatialStatus,
} from '../spatial-status';

const VESSEL_METRICS: Array<{ value: CoastalVesselMetric; label: string }> = [
  { value: 'vessel_count', label: 'Vessel Count' },
  { value: 'duration', label: 'Port Call Duration' },
  { value: 'presence_hours', label: 'Presence Hours' },
  { value: 'stationary_hours', label: 'Stationary Hours' },
];

function aggregatedMetricLabel(metric: CoastalVesselMetric, aggregation: CoastalVesselAggregation): string {
  if (metric === 'vessel_count') {
    return aggregation === 'average' ? 'Average vessels per H3 cell' : 'Vessel counts by type';
  }
  if (metric === 'duration') {
    return aggregation === 'average'
      ? 'Average duration per occupied H3 cell'
      : 'Total vessel presence hours';
  }
  if (metric === 'presence_hours') {
    return aggregation === 'average' ? 'Average presence hours per H3 cell' : 'Total presence hours';
  }
  return aggregation === 'average'
    ? 'Average stationary hours per H3 cell'
    : 'Total stationary hours';
}

const VESSEL_MAP_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 260px' },
  gridTemplateAreas: { xs: '"map" "legend" "hex"', md: '"map legend" "hex ."' },
  gap: 2,
  alignContent: 'start',
};

export function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCountry = searchParams.get('country');
  const country = rawCountry || '';
  const aoi_id = searchParams.get('aois') || undefined;
  const rawNames = searchParams.get('names');
  const start_date = searchParams.get('start_date') || '2019-01-01';
  const end_date = searchParams.get('end_date') || '2025-12-31';
  const grainParam = (searchParams.get('grain') as any) || 'monthly';
  const metricParam = searchParams.get('metric') as CoastalVesselMetric | null;
  const metric = VESSEL_METRICS.find((item) => item.value === metricParam)?.label || 'Vessel Count';
  const metricValue = VESSEL_METRICS.find((item) => item.label === metric)?.value || 'vessel_count';
  const aggFunc: CoastalVesselAggregation = searchParams.get('agg_func') === 'sum' ? 'sum' : 'average';

  const updateVesselQuery = (key: 'metric' | 'agg_func', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    if (!rawCountry) {
      router.replace('/coastal?target=vessels');
    }
  }, [rawCountry, router]);

  const [grain, setGrain] = useState<'weekly' | 'monthly' | 'annually'>(grainParam);
  // 2 = Choropleth Map, the landing tab (same as the indicators page).
  const [activeTab, setActiveTab] = useState<number>(2);
  const [expanded, setExpanded] = useState<string | false>('Trade');
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [selectedHexCells, setSelectedHexCells] = useState<string[]>([]);
  const [hexExpanded, setHexExpanded] = useState<boolean>(false);
  const [hexChartLoading, setHexChartLoading] = useState<boolean>(false);
  const hexGraphReady = selectedHexCells.length > 0 && hexExpanded && !hexChartLoading;
  const [distributionData, setDistributionData] = useState<any>(null);
  const [distributionLoading, setDistributionLoading] = useState<boolean>(false);

  // Vessel Timeline State
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [timelineResponse, setTimelineResponse] = useState<VesselTimelineResponse | null>(null);
  const [typeTimelineResponse, setTypeTimelineResponse] = useState<VesselTimelineResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Visible Categories State
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  const [visibleSubtypes, setVisibleSubtypes] = useState<Record<string, boolean>>({});

  // Spatial Choropleth Map State
  const sliceCacheRef = React.useRef<Map<string, Record<string, any>>>(new Map());
  const [spatialSlice, setSpatialSlice] = useState<Record<string, any> | undefined>(undefined);
  const [spatialStatus, setSpatialStatus] = useState<SpatialStatus>('loading');
  const [spatialRetry, setSpatialRetry] = useState<number>(0);
  // Bumped when a series prefetch ends without the live period cached, so the
  // slice effect re-runs and falls back to /spatial/slice.
  const [seriesSettled, setSeriesSettled] = useState<number>(0);
  const sliceScopeRef = useRef<string | null>(null);
  const paintedScopeRef = useRef<string | null>(null);
  const currentSliceKeyRef = useRef<string | null>(null);
  const sliceInFlightRef = useRef<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [clustersEnabled, setClustersEnabled] = useState<boolean>(false);

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

  // Reset fullscreen when switching tab
  useEffect(() => {
    if (activeTab !== 2) {
      setIsFullscreen(false);
    }
  }, [activeTab]);

  const mapHeight = useMemo(() => {
    if (!isFullscreen) return 378;
    return selectedHexCells.length > 0 ? 'calc(100vh - 460px)' : 'calc(100vh - 220px)';
  }, [isFullscreen, selectedHexCells]);

  const [weeklyYear, setWeeklyYear] = useState<number>(() => {
    const d = new Date(start_date);
    return isNaN(d.getTime()) ? 2024 : d.getFullYear();
  });

  const timelineData = useMemo(() => {
    return timelineResponse?.timeline || timelineResponse?.series || [];
  }, [timelineResponse]);
  const typeTimelineData = useMemo(() => {
    return typeTimelineResponse?.timeline || typeTimelineResponse?.series || [];
  }, [typeTimelineResponse]);
  const chartTimelineData = useMemo(
    () => metricValue === 'vessel_count'
      ? mergeVesselTimelineTypeData(timelineData, typeTimelineData, aggFunc === 'average')
      : timelineData,
    [aggFunc, metricValue, timelineData, typeTimelineData],
  );
  const vesselTypeGroups = useMemo(
    () => getVesselTimelineTypeGroups(chartTimelineData),
    [chartTimelineData],
  );
  const showVesselTypeSeries = shouldShowVesselTypeSeries(metric, vesselTypeGroups);

  const summary = timelineResponse?.summary;

  const periodItems = useMemo(() => {
    if (grain === 'weekly') {
      // Prefer backend timeline weeks (the same Monday-anchored grid the
      // slice/series endpoints query) so the scrubber, the batch cache and
      // per-period slices all agree. Fall back to generated weeks only when
      // the timeline has not loaded yet.
      if (timelineData && timelineData.length > 0) {
        const yearStr = String(weeklyYear);
        let weekNum = 1;
        const items = timelineData
          .filter((pt: any) => {
            const s = (pt.period_start || '').slice(0, 10);
            const e = (pt.period_end || pt.period_start || '').slice(0, 10);
            return s.slice(0, 4) === yearStr || e.slice(0, 4) === yearStr;
          })
          .map((pt: any) => {
            const s = (pt.period_start || '').slice(0, 10);
            const e = (pt.period_end || pt.period_start || '').slice(0, 10);
            const [ey, em, ed] = e.split('-');
            return { label: `Week ${weekNum++}: ${em}/${ed}/${ey}`, start: s, end: e };
          });
        if (items.length > 0) return items;
      }
      return generatePeriods(`${weeklyYear}-01-01`, `${weeklyYear}-12-31`, 'weekly');
    }
    // Prefer backend timeline periods so scrubber positions match available data.
    return generatePeriods(start_date, end_date, grain, timelineData as any);
  }, [start_date, end_date, grain, weeklyYear, timelineData]);

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

  useEffect(() => {
    if (periods.length > 0) {
      setScrubberIndex(periods.length - 1);
    }
  }, [periods]);

  const locationLabel = rawNames
    ? rawNames
    : aoi_id
    ? aoi_id.split(',').map((id) => formatDisplayName(id)).join(', ')
    : country || 'Select Location';

  const aoiCount = aoi_id ? aoi_id.split(',').filter(Boolean).length : 0;
  const analysisScope = aoiCount > 1 ? 'Multi-province' : aoiCount === 1 ? 'Province' : 'National';
  const provinceCountText =
    aoiCount > 1 ? `${aoiCount} provinces` : aoiCount === 1 ? '1 province' : 'National';

  useEffect(() => {
    if (activeTab !== 1 || !country) return;
    let isCurrent = true;
    setDistributionLoading(true);
    fetchVesselDistribution({
      country,
      start_date,
      end_date,
    })
      .then((res) => {
        if (!isCurrent) return;
        const total = res.total_records || res.total_vessels || 0;
        const parentCategories = (res.pie_chart || []).map((item: any) => ({
          id: (item.category || item.name || '').toLowerCase(),
          label: item.category || item.name,
          value: item.count || item.value || 0,
          color: vesselCategoryColor(item.category || item.name || ''),
        }));
        const subCategories: Array<{ id: string; parentId: string; label: string; value: number }> = [];
        if (res.drilldown) {
          Object.entries(res.drilldown).forEach(([parent, subs]: [string, any]) => {
            if (Array.isArray(subs)) {
              subs.forEach((sub: any) => {
                subCategories.push({
                  id: (sub.sub_type || sub.granular_type || '').toLowerCase().replace(/\s+/g, '_'),
                  parentId: parent.toLowerCase(),
                  label: sub.sub_type || sub.granular_type,
                  value: sub.count || 0,
                });
              });
            }
          });
        }
        setDistributionData({ total, parentCategories, subCategories });
      })
      .catch((err) => {
        console.error('Failed to load vessel distribution:', err);
        if (isCurrent) setDistributionData(null);
      })
      .finally(() => {
        if (isCurrent) setDistributionLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTab, country, start_date, end_date]);

  // Fetch Vessel Timeline Data
  useEffect(() => {
    if (!country) return;
    let isCurrent = true;
    setTimelineLoading(true);
    setTypeTimelineResponse(null);

    const requestTimeline = (aggregation: CoastalVesselAggregation) => fetchVesselTimeline({
      country,
      aoi_id,
      start_date,
      end_date,
      grain,
      metric: metricValue,
      agg_func: aggregation,
    });
    const typeAggregation = getVesselTypeTimelineAggregation(metricValue, aggFunc);
    const typeTimelineRequest = typeAggregation
      ? requestTimeline(typeAggregation).catch((err) => {
        console.error('Failed to load vessel type totals:', err);
        return null;
      })
      : Promise.resolve(null);

    Promise.all([requestTimeline(aggFunc), typeTimelineRequest])
      .then(([res, typeRes]) => {
        if (!isCurrent) return;
        setTimelineResponse(res);
        setTypeTimelineResponse(
          typeRes ?? (metricValue === 'vessel_count' ? res : null),
        );
      })
      .catch((err) => {
        console.error('Failed to load vessel timeline:', err);
        if (isCurrent) {
          setTimelineResponse(null);
          setTypeTimelineResponse(null);
        }
      })
      .finally(() => {
        if (isCurrent) setTimelineLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [country, aoi_id, start_date, end_date, grain, metricValue, aggFunc]);

  // Pre-fetch batch spatial series across all periods for instant scrubbing.
  // NOTE: intentionally NOT dependent on the scrubber index. Scrub ticks are
  // served from `sliceCacheRef`; refetching per tick caused the 2026-09-25
  // incident (a full `/spatial/series` prefetch per tick plus per-tick
  // `/spatial/slice` fallbacks). The live index is read via
  // `scrubberIndexRef` in `.then`, and the fetch is skipped entirely when
  // every period key for this (country, grain, vessels, aoi) scope is
  // already cached (also guards refetch on unrelated `periodItems`
  // identity changes).
  useEffect(() => {
    if (activeTab !== 2 || !country || periodItems.length === 0) {
      return;
    }

    const scope = {
      country,
      indicator: 'vessels',
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
      indicator: 'vessels',
      aoi_id: aoi_id || undefined,
    })
      .then((res) => {
        if (!isMounted || !res?.series) return;
        Object.entries(res.series).forEach(([periodStart, cellMap]) => {
          // Series keys carry timestamps ('YYYY-MM-DD HH:MM:SS'); the key
          // builder normalizes to the day so they hit the same cache keys
          // the scrubber uses. The key includes the AOI segment so one
          // AOI never serves another AOI's cached slices.
          const key = buildSpatialSliceCacheKey({ ...scope, periodStart });
          sliceCacheRef.current.set(key, cellMap as Record<string, any>);
        });

        const cur = periodItems[scrubberIndexRef.current];
        if (cur) {
          const curKey = buildSpatialSliceCacheKey({ ...scope, periodStart: cur.start });
          const cached = sliceCacheRef.current.get(curKey);
          if (cached) {
            paintedScopeRef.current = inFlightKey;
            setSpatialSlice(cached);
            setSpatialStatus('ready');
          }
        }
      })
      .catch((err) => {
        console.warn('Batch vessel spatial series pre-fetch failed, falling back to slice queries:', err);
      })
      .finally(() => {
        if (seriesInFlightRef.current === inFlightKey) {
          seriesInFlightRef.current = null;
        }
        const cur = periodItems[scrubberIndexRef.current];
        if (
          isMounted &&
          cur &&
          !sliceCacheRef.current.has(buildSpatialSliceCacheKey({ ...scope, periodStart: cur.start }))
        ) {
          setSeriesSettled((n) => n + 1);
        }
      });

    return () => {
      isMounted = false;
      if (seriesInFlightRef.current === inFlightKey) {
        seriesInFlightRef.current = null;
      }
    };
  }, [country, grain, aoi_id, activeTab, periodItems, spatialRetry]);

  // Fetch Spatial Slice for Tab 2. Slice-first: the current period renders
  // from the small /spatial/slice request while /spatial/series loads in the
  // background for the slider cache. Before a scope has painted, the slice
  // fires immediately and does not wait for the series. After that, scrub
  // ticks debounce and wait for a running series.
  useEffect(() => {
    if (activeTab !== 2 || !country) return;
    const curPeriod = periodItems[activeScrubberIndex];
    if (!curPeriod) return;

    const scope = {
      country,
      indicator: 'vessels',
      grain,
      aoiId: aoi_id,
    };
    const scopeKey = buildSeriesInFlightKey(scope);
    const cacheKey = buildSpatialSliceCacheKey({ ...scope, periodStart: curPeriod.start });
    currentSliceKeyRef.current = cacheKey;

    // A new scope must not show the previous scope's values.
    if (sliceScopeRef.current !== scopeKey) {
      sliceScopeRef.current = scopeKey;
      setSpatialSlice(undefined);
    }

    const cachedSlice = sliceCacheRef.current.get(cacheKey);
    if (cachedSlice) {
      paintedScopeRef.current = scopeKey;
      setSpatialSlice(cachedSlice);
      setSpatialStatus(resolveSpatialStatus({ phase: 'request', cached: true }));
      return;
    }
    setSpatialStatus(resolveSpatialStatus({ phase: 'request', cached: false }));

    const painted = paintedScopeRef.current === scopeKey;
    if (shouldWaitForSeries(painted, seriesInFlightRef.current === scopeKey)) {
      return;
    }
    if (sliceInFlightRef.current.has(cacheKey)) {
      return;
    }

    const timer = setTimeout(() => {
      sliceInFlightRef.current.add(cacheKey);
      fetchSpatialSlice({
        country,
        period_start: curPeriod.start,
        period_end: curPeriod.end,
        grain,
        indicator: 'vessels',
        aoi_id: aoi_id || undefined,
      })
        .then((res) => {
          const sliceData = res?.values || res?.data;
          const count = sliceData ? Object.keys(sliceData).length : 0;
          if (sliceData && count > 0) {
            sliceCacheRef.current.set(cacheKey, sliceData);
          }
          if (currentSliceKeyRef.current !== cacheKey) return;
          paintedScopeRef.current = scopeKey;
          setSpatialSlice(sliceData && count > 0 ? sliceData : {});
          setSpatialStatus(resolveSpatialStatus({ phase: 'loaded', cellCount: count }));
        })
        .catch(() => {
          if (currentSliceKeyRef.current !== cacheKey) return;
          setSpatialSlice(undefined);
          setSpatialStatus(resolveSpatialStatus({ phase: 'failed' }));
        })
        .finally(() => {
          sliceInFlightRef.current.delete(cacheKey);
        });
    }, sliceDelayMs(painted));

    return () => {
      clearTimeout(timer);
    };
  }, [country, activeScrubberIndex, periodItems, grain, activeTab, aoi_id, spatialRetry, seriesSettled]);

  const handleAccordionChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleGrainChange = (newGrain: CoastalGrain) => {
    setGrain(newGrain);
    const params = new URLSearchParams(searchParams.toString());
    params.set('grain', newGrain);
    router.replace(`?${params.toString()}`);
  };

  const handleEditSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('target', 'vessels');
    router.push(`/coastal?${params.toString()}`);
  };

  const handleNewSearch = () => {
    router.push('/coastal?target=vessels');
  };

  const handleExportCsv = () => {
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.csv`;
    const { headers, rows } = buildVesselTimelineExportData(
      chartTimelineData,
      vesselTypeGroups,
      aggregatedMetricLabel(metricValue, aggFunc),
      showVesselTypeSeries,
      aggFunc === 'average' && showVesselTypeSeries ? ' (avg per H3 cell)' : '',
    );
    exportToCsv(filename, rows, headers);
  };

  const handleExportExcel = () => {
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.xls`;
    const { headers, rows } = buildVesselTimelineExportData(
      chartTimelineData,
      vesselTypeGroups,
      aggregatedMetricLabel(metricValue, aggFunc),
      showVesselTypeSeries,
      aggFunc === 'average' && showVesselTypeSeries ? ' (avg per H3 cell)' : '',
    );
    exportToExcel(filename, 'Vessels', rows, headers);
  };

  const handleExportMap = () => {
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.png`;
    exportLeafletMapAsPng('coastal-vessels-map-container', filename);
  };

  const timelineTitle = `${showVesselTypeSeries
    ? aggFunc === 'average' ? 'Average vessels per H3 cell by type' : 'Vessel counts by type'
    : aggregatedMetricLabel(metricValue, aggFunc)} (${grain.charAt(0).toUpperCase() + grain.slice(1)}) : ${locationLabel}`;

  const handleExportGraph = () => {
    if (activeTab === 2) {
      if (hexGraphReady) {
        exportGraphAsPng('coastal-hex-graph-container', `coastal_vessels_hex_graph_${country}_${start_date}_${end_date}.png`);
      }
      return;
    }
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.png`;
    if (activeTab === 1) {
      exportChartWithContextAsPng('coastal-vessels-distribution-container', filename, {
        title: `Vessel Types in ${locationLabel}`,
        subtitle: `${start_date} to ${end_date}`,
        legend: [],
      });
      return;
    }
    exportChartWithContextAsPng('coastal-vessels-chart-container', filename, {
      title: timelineTitle,
      subtitle: `${start_date} to ${end_date}`,
      legend: showVesselTypeSeries
        ? vesselTypeGroups.map(({ category }) => ({ label: category, color: vesselCategoryColor(category) }))
        : [{ label: aggregatedMetricLabel(metricValue, aggFunc), color: '#0f766e' }],
    });
  };

  if (!rawCountry) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {/* Top Header & Time Range Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        {/* Left: Title & Location Card */}
        <Card
          variant="outlined"
          sx={{
            flex: { xs: '1 1 auto', md: '0 0 34%' },
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                {analysisScope} Maritime Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                Timeline of Maritime Vessels
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Chip
                  icon={<LocationOnIcon sx={{ fontSize: 16 }} />}
                  label={locationLabel}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {provinceCountText}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ ml: 'auto !important' }}>
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
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Right: Time Range Selector Card */}
        <Card
          variant="outlined"
          sx={{
            flex: { xs: '1 1 auto', md: '1 1 0%' },
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
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
              onGrainChange={handleGrainChange}
              mapView={activeTab === 2}
            />
          </CardContent>
        </Card>
      </Stack>

      {/* Segmented Pill Switcher */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <ViewModeTab
          active={activeTab === 2}
          title="Choropleth Map"
          subtitle="Spatial visualization"
          icon={<MapIcon />}
          vectorSrc="/images/coastal/map-pin.png"
          gradient="teal"
          onClick={() => setActiveTab(2)}
        />
        <ViewModeTab
          active={activeTab === 0}
          title="Vessel Timeline"
          subtitle="Line trends by type"
          icon={<TimelineIcon />}
          vectorSrc="/images/coastal/bar-chart.png"
          gradient="blue"
          onClick={() => setActiveTab(0)}
        />
        <ViewModeTab
          active={activeTab === 1}
          title="Type Distribution"
          subtitle="Pie charts by type"
          icon={<PieChartIcon />}
          vectorSrc="/images/coastal/pie-chart.png"
          gradient="teal"
          onClick={() => setActiveTab(1)}
        />
      </Stack>

      {/* Tab 0: Vessel Timeline */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Quick Summary Cards & Details Card */}
          <VesselSummaryCards
            summary={summary}
            metric={metric}
            locationName={locationLabel}
            dateRange={{ start: start_date, end: end_date }}
            timeline={timelineData}
            grain={grain}
            aggregation={aggFunc}
            loading={timelineLoading}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={(p) => setSelectedPeriod(p)}
          />

          {/* Main Chart Area and Sidebar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <Card variant="outlined" sx={{ flex: 1, minWidth: 0, width: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {timelineTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {start_date} to {end_date}
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Across H3 cells:
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${VESSEL_METRICS.find((item) => item.value === metricValue)?.label ?? 'Vessels'} · ${aggFunc === 'average' ? 'Average' : 'Total'}`}
                  />
                </Stack>
                <Box id="coastal-vessels-chart-container" sx={{ height: 400, mt: 2 }}>
                  <VesselTimelineChart
                    data={chartTimelineData}
                    loading={timelineLoading}
                    locationName={locationLabel}
                    selectedPeriod={selectedPeriod}
                    onSelectPeriod={(p) => setSelectedPeriod(p)}
                    visibleSeries={visibleSeries}
                    visibleSubtypes={visibleSubtypes}
                    metric={metric}
                    aggregation={aggFunc}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Right Sidebar */}
            <Stack spacing={2} sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Legend
                  </Typography>
                  <Stack spacing={1}>
                    {showVesselTypeSeries
                      ? vesselTypeGroups.map(({ category }) => (
                          <Stack key={category} direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: vesselCategoryColor(category) }} />
                            <Typography variant="body2">{category}</Typography>
                          </Stack>
                        ))
                      : <Typography variant="body2">{aggregatedMetricLabel(metricValue, aggFunc)}</Typography>}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Vessel Types
                  </Typography>

                  {showVesselTypeSeries ? (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {aggFunc === 'average' ? 'Split by province-wide type share' : 'Estimated from province-wide type share'}
                      </Typography>
                      {vesselTypeGroups.map(({ category, subtypes }) => {
                    const color = vesselCategoryColor(category);
                    return (
                      <Accordion
                        key={category}
                        expanded={expanded === category}
                        onChange={handleAccordionChange(category)}
                        disableGutters
                        elevation={0}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={visibleSeries[category] !== false}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setVisibleSeries((current) => ({ ...current, [category]: event.target.checked }));
                                }}
                                size="small"
                                sx={{ '&.Mui-checked': { color } }}
                              />
                            }
                            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{category}</Typography>}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </AccordionSummary>
                        {subtypes.length > 0 && (
                          <AccordionDetails sx={{ pt: 0, pb: 1, pl: 3 }}>
                            <FormGroup>
                              {subtypes.map((subtype) => {
                                const key = subtypeVisibilityKey(category, subtype);
                                return (
                                  <FormControlLabel
                                    key={key}
                                    control={
                                      <Checkbox
                                        checked={visibleSubtypes[key] !== false}
                                        onChange={(event) => setVisibleSubtypes((current) => ({ ...current, [key]: event.target.checked }))}
                                        size="small"
                                        sx={{ '&.Mui-checked': { color } }}
                                      />
                                    }
                                    label={<Typography variant="caption">{subtype}</Typography>}
                                  />
                                );
                              })}
                            </FormGroup>
                          </AccordionDetails>
                        )}
                      </Accordion>
                    );
                      })}
                    </>
                  ) : (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      {metricValue === 'vessel_count'
                        ? 'No period totals by vessel type are available for this selection.'
                        : 'Vessel type and subtype breakdowns are available for vessel counts only.'}
                    </Alert>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Metric
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <Select
                      value={metricValue}
                      onChange={(event) => updateVesselQuery('metric', event.target.value)}
                      aria-label="Vessel metric"
                    >
                      {VESSEL_METRICS.map((item) => (
                        <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 1.5 }}>
                    Aggregation
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={aggFunc}
                      onChange={(event) => updateVesselQuery('agg_func', event.target.value)}
                      aria-label="Vessel aggregation"
                    >
                      <MenuItem value="average">Average</MenuItem>
                      <MenuItem value="sum">Sum</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Stack>
      )}

      {/* Tab 1: Type Distribution */}
      {activeTab === 1 && (
        <Box id="coastal-vessels-distribution-container">
          <VesselDistributionCharts
            country={country}
            locationName={locationLabel}
            dateRange={{ start: start_date, end: end_date }}
            data={distributionData || undefined}
            loading={distributionLoading}
          />
        </Box>
      )}

      {/* Tab 2: Choropleth Map */}
      {activeTab === 2 && (
        <Box
          id="coastal-vessels-map-container"
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
                  overflowY: 'auto',
                  ...VESSEL_MAP_GRID_SX,
                }
              : {
                  ...VESSEL_MAP_GRID_SX,
                  width: '100%',
                }
          }
        >
          <Card variant="outlined" sx={{ gridArea: 'map', borderRadius: 2 }}>
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
                    {`${metric} Map (${grain.charAt(0).toUpperCase() + grain.slice(1)}) : ${locationLabel}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {`${start_date} to ${end_date}`}
                  </Typography>
                  {showNationLoadNote(aoi_id, spatialStatus) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {NATION_LOAD_NOTE}
                    </Typography>
                  )}
                </Box>

                <AggLevelSelect grain={grain} onGrainChange={handleGrainChange} />

                <Tooltip title="Settings">
                  <IconButton
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Settings"
                    size="small"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

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

              <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 700 }}>Settings</DialogTitle>
                <DialogContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={clustersEnabled}
                        onChange={(e) => setClustersEnabled(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Enable clusters
                      </Typography>
                    }
                  />
                </DialogContent>
              </Dialog>

              <VesselSpatialMap
                key={`${country}_${locationLabel}`}
                clustersEnabled={clustersEnabled}
                country={country}
                locationName={locationLabel}
                aoiIds={aoi_id ? aoi_id.split(',').map((s) => s.trim()).filter(Boolean) : undefined}
                spatialSlice={spatialSlice}
                selectedCellIds={selectedHexCells}
                onSelectCell={(id) =>
                  setSelectedHexCells((prev) =>
                    prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                  )
                }
                onClearSelection={() => setSelectedHexCells([])}
                spatialStatus={spatialStatus}
                onRetrySpatial={() => setSpatialRetry((n) => n + 1)}
                periodLabel={periods[activeScrubberIndex]}
                height={mapHeight}
              />
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

          <Card variant="outlined" sx={{ gridArea: 'legend', borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                Legend
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                Vessel Count
              </Typography>

              <Box
                sx={{
                  height: 12,
                  width: '100%',
                  background: 'linear-gradient(to right, rgb(254, 226, 226), rgb(153, 27, 27))',
                  borderRadius: 1,
                  mb: 1,
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  0
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  50+
                </Typography>
              </Box>

              <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Resolution: 7
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Cell Area: 4.5 km²
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Hex Cell Detail Card. Below the map. */}
          <Box sx={{ gridArea: 'hex', minWidth: 0 }}>
            <HexCellDetailModal
              cellIds={selectedHexCells}
              locationName={locationLabel}
              country={country}
              grain={grain}
              dateRange={{ start: start_date, end: end_date }}
              indicators={['vessels']}
              onClose={() => setSelectedHexCells([])}
              expanded={hexExpanded}
              onExpandedChange={setHexExpanded}
              onLoadingChange={setHexChartLoading}
            />
          </Box>
        </Box>
      )}

      {/* Download Data Footer */}
      <DownloadDataCard
        onExportMap={activeTab === 2 ? handleExportMap : undefined}
        onExportGraph={handleExportGraph}
        graphDisabled={activeTab === 2 && !hexGraphReady}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
      />
    </Stack>
  );
}

export default PageContent;
