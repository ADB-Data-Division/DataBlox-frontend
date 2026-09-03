'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  Tabs,
  Tab,
  Stack,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import MapIcon from '@mui/icons-material/Map';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VesselTimelineChart, { chartData } from '../components/VesselTimelineChart';
import VesselDistributionCharts from '../components/VesselDistributionCharts';
import { exportToCsv, exportToExcel, exportGraphAsPng } from '@/src/utils/coastalExport';
import { VesselSpatialMap } from '../components/VesselSpatialMap';
import TemporalScrubber from '../components/TemporalScrubber';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { formatDisplayName } from '../data/provinces';
import { generatePeriods } from '../indicators/page-content';
import { fetchVesselDistribution } from '@/services/coastalService';

export function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCountry = searchParams.get('country');
  const country = rawCountry || '';
  const aoi_id = searchParams.get('aois') || undefined;
  const rawNames = searchParams.get('names');
  const start_date = searchParams.get('start_date') || '2019-01-01';
  const end_date = searchParams.get('end_date') || '2024-12-31';
  const grainParam = (searchParams.get('grain') as any) || 'monthly';

  useEffect(() => {
    if (!rawCountry) {
      router.replace('/coastal');
    }
  }, [rawCountry, router]);

  const [grain, setGrain] = useState<'weekly' | 'monthly' | 'annually'>(grainParam);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [metric, setMetric] = useState<string>('Vessel Count');
  const [expanded, setExpanded] = useState<string | false>('trade');
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const [selectedHexCell, setSelectedHexCell] = useState<string | null>(null);
  const [distributionData, setDistributionData] = useState<any>(null);
  const [distributionLoading, setDistributionLoading] = useState<boolean>(false);

  const [weeklyYear, setWeeklyYear] = useState<number>(() => {
    const d = new Date(start_date);
    return isNaN(d.getTime()) ? 2024 : d.getFullYear();
  });

  const periodItems = useMemo(() => {
    if (grain === 'weekly') {
      return generatePeriods(`${weeklyYear}-01-01`, `${weeklyYear}-12-31`, 'weekly');
    }
    return generatePeriods(start_date, end_date, grain);
  }, [start_date, end_date, grain, weeklyYear]);

  const periods = useMemo(() => periodItems.map((p) => p.label), [periodItems]);
  const activeScrubberIndex = Math.min(Math.max(0, scrubberIndex), Math.max(0, periods.length - 1));

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
      const jul2024Idx = periods.findIndex((p) => p === 'Jul 2024');
      if (jul2024Idx >= 0) {
        setScrubberIndex(jul2024Idx);
      } else {
        setScrubberIndex(periods.length - 1);
      }
    }
  }, [periods]);

  const locationLabel = rawNames
    ? rawNames
    : aoi_id
    ? aoi_id.split(',').map((id) => formatDisplayName(id)).join(', ')
    : country || 'Select Location';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
        const colors: Record<string, string> = {
          Trade: '#6366f1',
          Recreation: '#f59e0b',
          Harbor: '#ef4444',
          Miscellaneous: '#9ca3af',
        };
        const total = res.total_records || res.total_vessels || 0;
        const parentCategories = (res.pie_chart || []).map((item: any) => ({
          id: (item.category || item.name || '').toLowerCase(),
          label: item.category || item.name,
          value: item.count || item.value || 0,
          color: colors[item.category || item.name] || '#3b82f6',
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

  const handleAccordionChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleEditSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/coastal?${params.toString()}`);
  };

  const handleNewSearch = () => {
    router.push('/coastal');
  };

  const handleExportCsv = () => {
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.csv`;
    const exportHeaders = [
      { key: 'label', label: 'Period' },
      { key: 'trade', label: 'Trade Vessels' },
      { key: 'harbor', label: 'Harbor Vessels' },
      { key: 'recreation', label: 'Recreation Vessels' },
      { key: 'miscellaneous', label: 'Miscellaneous Vessels' },
    ];
    exportToCsv(filename, chartData as Record<string, any>[], exportHeaders);
  };

  const handleExportExcel = () => {
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.xls`;
    const exportHeaders = [
      { key: 'label', label: 'Period' },
      { key: 'trade', label: 'Trade Vessels' },
      { key: 'harbor', label: 'Harbor Vessels' },
      { key: 'recreation', label: 'Recreation Vessels' },
      { key: 'miscellaneous', label: 'Miscellaneous Vessels' },
    ];
    exportToExcel(filename, 'Vessels', chartData as Record<string, any>[], exportHeaders);
  };

  const handleExportGraph = () => {
    const containerId =
      activeTab === 2
        ? 'coastal-vessels-map-container'
        : activeTab === 1
        ? 'coastal-vessels-distribution-container'
        : 'coastal-vessels-chart-container';
    const filename = `coastal_vessels_${country}_${start_date}_${end_date}.png`;
    exportGraphAsPng(containerId, filename);
  };

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
                Multi-province Maritime Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Timeline of Maritime Vessels
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
            opacity: activeTab === 2 ? 0.5 : 1,
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
              disabled={activeTab === 2}
            />
            {activeTab === 2 && (
              <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', px: 1, mt: 0.5 }}>
                Note: Time range is disabled for choropleth map. Use the time slider below the interactive map.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* 3-Pill Switcher */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable">
          <Tab icon={<TimelineIcon />} iconPosition="start" label="Vessel Timeline" />
          <Tab icon={<PieChartIcon />} iconPosition="start" label="Type Distribution" />
          <Tab icon={<MapIcon />} iconPosition="start" label="Choropleth Map" />
        </Tabs>
      </Box>

      {/* Tab 0: Vessel Timeline */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Quick Summary Cards */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Top Vessel Type (Entire Time Range)
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 1 }}>
                  <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 800 }}>
                    Trade
                  </Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Total Count:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6366f1', fontWeight: 700 }}>
                      16,865 vessels
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Trade: Peak Vessel Count (Monthly)
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 1 }}>
                  <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 800 }}>
                    285 vessels
                  </Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Observed on:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Dec 2025
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" align="center">
                  Select a period on the graph to view more details
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Main Chart Area and Sidebar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <Card variant="outlined" sx={{ flex: 1, minWidth: 0, width: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Vessel Count By Type (Monthly) : {locationLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {start_date} to {end_date}
                </Typography>
                <Box id="coastal-vessels-chart-container" sx={{ height: 400, mt: 2 }}>
                  <VesselTimelineChart />
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
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: '#6366f1' }} />
                      <Typography variant="body2">Trade</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: '#ef4444' }} />
                      <Typography variant="body2">Harbor</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: '#f59e0b' }} />
                      <Typography variant="body2">Recreation</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 14, height: 3, borderRadius: 1, bgcolor: '#9ca3af' }} />
                      <Typography variant="body2">Miscellaneous</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Vessel Types
                  </Typography>

                  <Accordion expanded={expanded === 'trade'} onChange={handleAccordionChange('trade')} disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                      <FormControlLabel
                        control={<Checkbox defaultChecked size="small" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Trade</Typography>}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1, pl: 3 }}>
                      <FormGroup>
                        <FormControlLabel control={<Checkbox defaultChecked size="small" />} label={<Typography variant="caption">Cargo</Typography>} />
                        <FormControlLabel control={<Checkbox defaultChecked size="small" />} label={<Typography variant="caption">Tanker</Typography>} />
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion expanded={expanded === 'harbor'} onChange={handleAccordionChange('harbor')} disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                      <FormControlLabel
                        control={<Checkbox size="small" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Harbor</Typography>}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1, pl: 3 }}>
                      <FormGroup>
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Tug & Tow</Typography>} />
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Dredger</Typography>} />
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion expanded={expanded === 'recreation'} onChange={handleAccordionChange('recreation')} disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                      <FormControlLabel
                        control={<Checkbox size="small" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Recreation</Typography>}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1, pl: 3 }}>
                      <FormGroup>
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Passenger</Typography>} />
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Pleasure Craft</Typography>} />
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">High-Speed Craft</Typography>} />
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion expanded={expanded === 'miscellaneous'} onChange={handleAccordionChange('miscellaneous')} disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                      <FormControlLabel
                        control={<Checkbox size="small" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Miscellaneous</Typography>}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1, pl: 3 }}>
                      <FormGroup>
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Fishing</Typography>} />
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Sailing</Typography>} />
                        <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="caption">Others</Typography>} />
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>

                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
                      <MenuItem value="Vessel Count">Vessel Count</MenuItem>
                      <MenuItem value="Port Call Duration">Port Call Duration</MenuItem>
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
        <Box id="coastal-vessels-map-container">
          <Stack spacing={2}>
            <VesselSpatialMap
              key={`${country}_${locationLabel}`}
              country={country}
              locationName={locationLabel}
              selectedCellId={selectedHexCell}
              onSelectCell={(id) => setSelectedHexCell(id)}
            />
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
          </Stack>
        </Box>
      )}

      {/* Download Data Footer */}
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
