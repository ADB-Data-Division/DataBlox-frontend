'use client';

import React, { useState, useEffect } from 'react';

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
import VesselTimelineChart from '../components/VesselTimelineChart';
import VesselDistributionCharts from '../components/VesselDistributionCharts';
import { VesselSpatialMap } from '../components/VesselSpatialMap';
import TemporalScrubber from '../components/TemporalScrubber';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { formatDisplayName } from '../data/provinces';


const MOCK_DISTRIBUTION_DATA = {
  total: 200,
  parentCategories: [
    { id: 'trade', label: 'Trade', value: 92, color: '#6366f1' },
    { id: 'recreation', label: 'Recreation', value: 52, color: '#f59e0b' },
    { id: 'harbor', label: 'Harbor', value: 28, color: '#ef4444' },
    { id: 'miscellaneous', label: 'Miscellaneous', value: 28, color: '#9ca3af' },
  ],
  subCategories: [
    { id: 'cargo', parentId: 'trade', label: 'Cargo', value: 69 },
    { id: 'tanker', parentId: 'trade', label: 'Tanker', value: 23 },
    { id: 'tug_tow', parentId: 'harbor', label: 'Tug & Tow', value: 18 },
    { id: 'dredger', parentId: 'harbor', label: 'Dredger', value: 10 },
    { id: 'passenger', parentId: 'recreation', label: 'Passenger', value: 30 },
    { id: 'pleasure_craft', parentId: 'recreation', label: 'Pleasure Craft', value: 15 },
    { id: 'high_speed_craft', parentId: 'recreation', label: 'High-Speed Craft', value: 7 },
    { id: 'fishing', parentId: 'miscellaneous', label: 'Fishing', value: 16 },
    { id: 'sailing', parentId: 'miscellaneous', label: 'Sailing', value: 8 },
    { id: 'others', parentId: 'miscellaneous', label: 'Others', value: 4 },
  ],
};

const PERIOD_LIST = [
  'Jan 2024',
  'Feb 2024',
  'Mar 2024',
  'Apr 2024',
  'May 2024',
  'Jun 2024',
  'Jul 2024',
  'Aug 2024',
  'Sep 2024',
  'Oct 2024',
  'Nov 2024',
  'Dec 2024',
  'Jan 2025',
];

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
  const [scrubberIndex, setScrubberIndex] = useState<number>(6);
  const [selectedHexCell, setSelectedHexCell] = useState<string | null>(null);

  const locationLabel = rawNames
    ? rawNames
    : aoi_id
    ? aoi_id.split(',').map((id) => formatDisplayName(id)).join(', ')
    : country || 'Select Location';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {/* Top Header Card */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Multi-province Maritime Analysis
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

            <Box sx={{ width: { xs: '100%', md: '520px' }, opacity: activeTab === 2 ? 0.5 : 1 }}>
              <TimeRangeSelector
                startDate={start_date}
                endDate={end_date}
                grain={grain}
                onRangeChange={(newStart, newEnd) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('start_date', newStart);
                  params.set('end_date', newEnd);
                  router.push(`?${params.toString()}`);
                }}
                onGrainChange={(newGrain) => {
                  setGrain(newGrain);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('grain', newGrain);
                  router.push(`?${params.toString()}`);
                }}
                disabled={activeTab === 2}
              />
              {activeTab === 2 && (
                <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mt: 0.5 }}>
                  Note: Time range is disabled for choropleth map. Use the time slider below the interactive map.
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

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
                <Box sx={{ height: 400, mt: 2 }}>
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
        <VesselDistributionCharts
          country={country}
          locationName={locationLabel}
          dateRange={{ start: start_date, end: end_date }}
          data={MOCK_DISTRIBUTION_DATA}
        />
      )}

      {/* Tab 2: Choropleth Map */}
      {activeTab === 2 && (
        <Stack spacing={2}>
          <VesselSpatialMap
            country={country}
            locationName={locationLabel}
            selectedCellId={selectedHexCell}
            onSelectCell={(id) => setSelectedHexCell(id)}
          />
          <TemporalScrubber
            periods={PERIOD_LIST}
            currentIndex={scrubberIndex}
            onChangeIndex={(idx) => setScrubberIndex(idx)}
            grain="monthly"
          />
        </Stack>
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
