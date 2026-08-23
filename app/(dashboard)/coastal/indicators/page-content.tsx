'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchIndicatorTimeline } from '@/services/coastalService';
import type {
  CoastalAggFunc,
  CoastalGrain,
  IndicatorTimelinePoint,
  IndicatorTimelineResponse,
} from '@/types/coastal';
import { SummaryCards } from '../components/SummaryCards';
import { DetailsCard } from '../components/DetailsCard';
import { IndicatorTimelineChart } from '../components/IndicatorTimelineChart';
import { IndicatorSidebar } from '../components/IndicatorSidebar';

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

export function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL Parameters
  const country = searchParams.get('country') || 'IDN';
  const aoi_id = searchParams.get('aois') || undefined;
  const start_date = searchParams.get('start_date') || '2019-01-01';
  const end_date = searchParams.get('end_date') || '2025-12-31';
  const grainParam = (searchParams.get('grain') as CoastalGrain) || 'monthly';

  // State
  const [data, setData] = useState<IndicatorTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['chlor_a', 'vessels']);
  const [aggFunc, setAggFunc] = useState<CoastalAggFunc>('average');
  const [grain, setGrain] = useState<CoastalGrain>(grainParam);
  const [selectedPoint, setSelectedPoint] = useState<IndicatorTimelinePoint | null>(null);

  const locationLabel = aoi_id ? `${aoi_id} (${country})` : country === 'IDN' ? 'Bali' : country;

  const loadData = useCallback(async () => {
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
        setSelectedIndicators(selectedIndicators.filter((id) => id !== indicatorId));
      }
    } else {
      if (selectedIndicators.length < 2) {
        setSelectedIndicators([...selectedIndicators, indicatorId]);
      } else {
        setSelectedIndicators([selectedIndicators[0], indicatorId]);
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

  const timelineData = data?.timeline || data?.series || SAMPLE_TIMELINE_DATA;

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {/* Top Banner Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            {/* Left side location and actions */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Multi-province Indicator Analysis
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
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={handleEditSearch}>
                  Edit Search
                </Button>
                <Button variant="outlined" size="small" onClick={handleNewSearch}>
                  New Search
                </Button>
              </Stack>
            </Box>

            {/* Right side Time Range & Aggregation */}
            <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Time Range
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {start_date} to {end_date}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Agg. Level
                </Typography>
                <FormControl size="small">
                  <Select
                    value={grain}
                    onChange={(e) => setGrain(e.target.value as CoastalGrain)}
                    sx={{ minWidth: 120, height: 36 }}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="annually">Annually</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Segmented Pill Switcher */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
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
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            router.push(`/coastal/map?${params.toString()}`);
          }}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <MapIcon color="action" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
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
          />
        </Box>
      </Stack>

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
              <Button variant="contained" size="small" startIcon={<DownloadIcon />}>
                Graph
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                CSV
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
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
