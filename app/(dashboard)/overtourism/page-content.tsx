'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Paper, Typography, useTheme, CircularProgress, LinearProgress, Button, Chip, ToggleButton, ToggleButtonGroup, Card, CardContent, Grid, Divider, Alert, AlertTitle } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import * as d3 from 'd3';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Components
import { MigrationAnalysisDuration } from '@/components/migration-analysis-duration/MigrationAnalysisDuration';
import { ApiDisconnectedPage } from '../components/ApiDisconnectedPage';
import { useConnectivity } from '@/app/contexts/ConnectivityContext';
import { Header } from '../components/Header';
import { LocationChips } from '../components/LocationChips';
import { SearchBar } from '../components/SearchBar';
import { RecentSearches } from '../components/RecentSearches';
import { LocationList } from '../components/LocationList';
import { SearchPagination } from '../components/SearchPagination';
import { SearchResultsSummary } from '../components/SearchResultsSummary';
import { NoResultsState } from '../components/NoResultsState';

// Services
import { overtourismAPIService } from '@/app/services/overtourism-api-service';
import { metadataService } from '@/app/services/api';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts, useUrlParams } from '../hooks';
import { Location } from '../helper';
import { saveRecentSearch, loadRecentSearches, removeRecentSearch, clearRecentSearches, RecentSearch, validateStoredLocations } from '../../../src/utils/recentSearches';

// Custom constraints
const OVERTOURISM_ANALYSIS_CONSTRAINTS = {
  MAX_TOTAL_LOCATIONS: 5
};

// Types for Overtourism Data
interface OvertourismStats {
  visitors: number | null;
  population: number | null;
  avg_duration: number | null;
  area_km2: number | null;
  irritation_index: number | null;
  environmental_stress: number | null;
}

interface LocationOvertourismEntry {
  locationId: string;
  locationName: string;
  stats: OvertourismStats;
}

interface OvertourismChartDataEntry {
  period: string;
  locations: LocationOvertourismEntry[];
  sortKey: number;
}

interface OvertourismChartData {
  data: OvertourismChartDataEntry[];
  locations: Location[];
  period: { id: string; startDate: string; endDate: string };
  warnings: string[];
}

// Attribute Display Component
const AttributeDisplay: React.FC<{
  data: OvertourismChartDataEntry[];
  locations: Location[];
  getLocationColor: (id: string) => string;
}> = ({ data, locations, getLocationColor }) => {
  const theme = useTheme();
  
  // Calculate averages for the selected period
  const averages = useMemo(() => {
    if (!data.length) return {};
    
    const sums: Record<string, { visitors: number, population: number, duration: number, area: number, count: number }> = {};
    
    data.forEach(entry => {
      entry.locations.forEach(loc => {
        if (!sums[loc.locationId]) {
          sums[loc.locationId] = { visitors: 0, population: 0, duration: 0, area: 0, count: 0 };
        }
        
        if (loc.stats.visitors) sums[loc.locationId].visitors += loc.stats.visitors;
        if (loc.stats.population) sums[loc.locationId].population += loc.stats.population;
        if (loc.stats.avg_duration) sums[loc.locationId].duration += loc.stats.avg_duration;
        if (loc.stats.area_km2) sums[loc.locationId].area = loc.stats.area_km2; // Constant
        sums[loc.locationId].count++;
      });
    });
    
    return Object.fromEntries(
      Object.entries(sums).map(([id, sum]) => [id, {
        visitors: Math.round(sum.visitors / sum.count),
        population: Math.round(sum.population / sum.count),
        duration: parseFloat((sum.duration / sum.count).toFixed(1)),
        area: sum.area
      }])
    );
  }, [data]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Average Contributing Metics (Selected Period)
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
        {locations.map(loc => {
          const stats = averages[loc.uniqueId];
          if (!stats) return null;
          
          return (
            <Card key={loc.uniqueId} variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: getLocationColor(loc.uniqueId) }} />
                    <Typography variant="subtitle1" fontWeight={600}>{loc.name}</Typography>
                  </Box>
                  
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Avg. Monthly Visitors</Typography>
                      <Typography variant="body1" fontWeight={500}>{stats.visitors.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Avg. Population</Typography>
                      <Typography variant="body1" fontWeight={500}>{stats.population ? stats.population.toLocaleString() : 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Avg. Stay Duration</Typography>
                      <Typography variant="body1" fontWeight={500}>{stats.duration} days</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Area Size</Typography>
                      <Typography variant="body1" fontWeight={500}>{stats.area.toLocaleString()} km²</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
          );
        })}
      </Box>
    </Box>
  );
};

// D3 Overtourism Line Chart
const OvertourismLineChart: React.FC<{
  data: OvertourismChartDataEntry[];
  locations: Location[];
  width: number;
  height: number;
  activeSeries: 'both' | 'irritation' | 'environmental';
  getLocationColor: (id: string) => string;
}> = ({ data, locations, width, height, activeSeries, getLocationColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Tooltip
    const tooltip = d3.select("body").selectAll(".overtourism-tooltip").data([null]).join("div")
      .attr("class", "overtourism-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.85)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    const margin = { top: 40, right: 60, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    // Calculate max values for Y axes
    const maxIrritation = d3.max(data.flatMap(d => d.locations.map(l => l.stats.irritation_index || 0))) || 0;
    const maxStress = d3.max(data.flatMap(d => d.locations.map(l => l.stats.environmental_stress || 0))) || 0;

    const yIrritation = d3.scaleLinear()
      .domain([0, maxIrritation * 1.1]) // Add 10% padding
      .range([innerHeight, 0]);

    const yStress = d3.scaleLinear()
      .domain([0, maxStress * 1.1])
      .range([innerHeight, 0]);

    // Helper: Line definition with breaks for nulls
    const createLine = (
      valueAccessor: (d: OvertourismChartDataEntry, locId: string) => number | null,
      yScale: d3.ScaleLinear<number, number>
    ) => d3.line<OvertourismChartDataEntry>()
        .defined(d => valueAccessor(d, '') !== null)
        .x((d, i) => xScale(i))
        .y((d) => yScale(valueAccessor(d, '') || 0)) // Value guaranteed not null by .defined()
        .curve(d3.curveMonotoneX);

    // Draw Axes
    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((i: any) => {
        const period = data[i]?.period;
        return period ? period.split(' ')[0] : '';
      });

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-weight", "bold");

    // Y Axis Left (Irritation) - Only if active
    if (activeSeries === 'both' || activeSeries === 'irritation') {
      g.append("g")
        .call(d3.axisLeft(yIrritation))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -innerHeight / 2)
        .attr("fill", "currentColor")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Irritation Index");
    }

    // Y Axis Right (Stress) - Only if active
    if (activeSeries === 'both' || activeSeries === 'environmental') {
      g.append("g")
        .attr("transform", `translate(${innerWidth},0)`)
        .call(d3.axisRight(yStress))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 45)
        .attr("x", -innerHeight / 2)
        .attr("fill", "currentColor")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Environmental Stress");
    }

    // Draw Lines
    locations.forEach(loc => {
      const locColor = getLocationColor(loc.uniqueId);

      // Irritation Line (Solid)
      if (activeSeries === 'both' || activeSeries === 'irritation') {
        const irritationLine = d3.line<OvertourismChartDataEntry>()
          .defined(d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return entry?.stats.irritation_index !== null && entry !== undefined;
          })
          .x((d, i) => xScale(i))
          .y(d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return yIrritation(entry?.stats.irritation_index || 0);
          })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", locColor)
          .attr("stroke-width", 2)
          .attr("d", irritationLine);
          
        // Add dots
        g.selectAll(`.dot-irritation-${loc.uniqueId}`)
          .data(data.filter(d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return entry?.stats.irritation_index !== null;
          }))
          .enter().append("circle")
          .attr("cx", (d, i) => xScale(data.indexOf(d)))
          .attr("cy", d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return yIrritation(entry?.stats.irritation_index || 0);
          })
          .attr("r", 4)
          .attr("fill", locColor)
          .on("mouseover", (event, d) => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            tooltip.style("opacity", 1)
              .html(`
                <strong>${loc.name}</strong><br/>
                Period: ${d.period}<br/>
                Irritation Index: ${entry?.stats.irritation_index?.toFixed(2)}
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0));
      }

      // Stress Line (Dashed)
      if (activeSeries === 'both' || activeSeries === 'environmental') {
        const stressLine = d3.line<OvertourismChartDataEntry>()
          .defined(d => {
             const entry = d.locations.find(l => l.locationId === loc.uniqueId);
             return entry?.stats.environmental_stress !== null && entry !== undefined;
          })
          .x((d, i) => xScale(i))
          .y(d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return yStress(entry?.stats.environmental_stress || 0);
          })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", locColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5") // Dashed for stress
          .attr("d", stressLine);

        // Add dots (squares for stress to differentiate)
         g.selectAll(`.dot-stress-${loc.uniqueId}`)
          .data(data.filter(d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return entry?.stats.environmental_stress !== null;
          }))
          .enter().append("rect")
          .attr("x", (d, i) => xScale(data.indexOf(d)) - 3)
          .attr("y", d => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            return yStress(entry?.stats.environmental_stress || 0) - 3;
          })
          .attr("width", 6)
          .attr("height", 6)
          .attr("fill", locColor)
          .on("mouseover", (event, d) => {
            const entry = d.locations.find(l => l.locationId === loc.uniqueId);
            tooltip.style("opacity", 1)
              .html(`
                <strong>${loc.name}</strong><br/>
                Period: ${d.period}<br/>
                Env. Stress: ${entry?.stats.environmental_stress?.toFixed(2)}
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0));
      }
    });

  }, [data, locations, width, height, activeSeries, getLocationColor]);

  return <svg ref={svgRef} width={width} height={height} />;
};

export default function OvertourismPageContent() {
  const theme = useTheme();
  const { isConnected } = useConnectivity();
  const inputRef = useRef<HTMLInputElement>(null);

  // Constants
  const chartWidth = 1000;
  const chartHeight = 500;

  // Shared color logic
  const locationColors = useMemo(() => d3.scaleOrdinal([
    '#EF5350', '#42A5F5', '#D4AF37', '#FF9933', '#26A69A', 
    '#00BCD4', '#AB47BC', '#FF6B6B', '#4ECDC4'
  ]), []);
  
  const getTourismColor = useCallback((id: string) => locationColors(id), [locationColors]);

  // State
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSeries, setActiveSeries] = useState<'both' | 'irritation' | 'environmental'>('both');
  const [chartData, setChartData] = useState<OvertourismChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [highlightedForDeletion, setHighlightedForDeletion] = useState<number | null>(null);

  const searchResults = useLocationSearch(selectedLocations, searchQuery, { restrictToTypes: ['province'] as const });

  // Load defaults
  useEffect(() => {
    const init = async () => {
       try {
         const meta = await metadataService.getDefaultDateRange();
         setDateRange(meta);
       } catch (e) {
         console.error(e);
       }
    };
    init();
    setRecentSearches(loadRecentSearches());
  }, []);

  const showSearchResults = searchQuery.trim() !== '' || selectedLocations.length === 0 || !chartData;

  // Handlers
  const handleLocationSelect = (loc: Location) => {
    if (selectedLocations.length < OVERTOURISM_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS) {
      setSelectedLocations([...selectedLocations, loc]);
      setSearchQuery('');
    }
  };

  // Load overtourism data
  const loadOvertourismData = useCallback(async (
    locations: Location[],
    startDate?: string,
    endDate?: string
  ) => {
    setIsLoading(true);
    setError(null);

    // Use provided dates or fallback to state
    const queryStartDate = startDate || dateRange.startDate;
    const queryEndDate = endDate || dateRange.endDate;

    try {
      const res = await overtourismAPIService.executeQuery(locations, queryStartDate, queryEndDate);
      if (res.success && res.data) {
        const apiData = res.data;
        const timePeriods = new Set<string>();
        apiData.data.forEach(loc => Object.keys(loc.time_series).forEach(tp => timePeriods.add(tp)));
        
        const chartEntries: OvertourismChartDataEntry[] = apiData.time_periods.map(tp => {
          return {
            period: tp.id, 
            sortKey: new Date(tp.start_date).getTime(),
            locations: locations.map(sl => {
              const locData = apiData.data.find(d => d.location.name === sl.name || d.location.id === sl.name);
              const stats = locData?.time_series[tp.id] || { 
                visitors: null, population: null, avg_duration: null, 
                area_km2: null, irritation_index: null, environmental_stress: null 
              };
              return { locationId: sl.uniqueId, locationName: sl.name, stats };
            })
          };
        });

        const formattedEntries = chartEntries.map(e => ({
           ...e,
           period: formatDate(e.period)
        })).sort((a,b) => a.sortKey - b.sortKey);

        setChartData({
          data: formattedEntries,
          locations: locations,
          period: { id: 'custom', startDate: queryStartDate!, endDate: queryEndDate! },
          warnings: apiData.warnings || []
        });
        
        setDateRange({ startDate: queryStartDate, endDate: queryEndDate });
        saveRecentSearch(locations);
      } else {
        setError(res.error || 'Failed to load data');
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
    // Only reload if we already have a search active
    if (selectedLocations.length > 0 && chartData) {
      loadOvertourismData(selectedLocations, startDate, endDate);
    }
  }, [selectedLocations, chartData, loadOvertourismData]);

  const handleExecuteQuery = useCallback(async (startDateOverride?: string | unknown, endDateOverride?: string) => {
    if (!selectedLocations.length) return;
    setChartData(null); // Clear previous data only on manual "Search" button click
    
    const sDate = (typeof startDateOverride === 'string' ? startDateOverride : undefined);
    const eDate = (typeof endDateOverride === 'string' ? endDateOverride : undefined);
    
    await loadOvertourismData(selectedLocations, sDate, eDate);
  }, [selectedLocations, loadOvertourismData]);
  
  // Helper for date formatting (simplified)
  const formatDate = (id: string) => {
      // Basic formatting just to show label
      return id; 
  };
  
  // Render
  if (!isConnected) return <ApiDisconnectedPage />;

  return (
    <Box sx={{ width: '100%' }}>
      <Header />
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, minHeight: '70vh' }}>
        {!chartData && (
          <>
            <LocationChips 
              selectedLocations={selectedLocations} 
              onLocationRemove={(id) => setSelectedLocations(prev => prev.filter(l => l.id !== id))}
              highlightedForDeletion={highlightedForDeletion}
            />
            <SearchBar 
               inputRef={inputRef}
               searchQuery={searchQuery}
               onSearchChange={(e) => setSearchQuery(e.target.value)}
               selectedLocations={selectedLocations}
               onExecuteQuery={handleExecuteQuery}
               isLoading={isLoading}
               onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteQuery(); 
               }}
               allowedType="province"
               restrictToTypes={['province'] as const}
               highlightedForDeletion={highlightedForDeletion}
            />
            
            <RecentSearches
              recentSearches={recentSearches}
              onLoadRecentSearch={(locs) => setSelectedLocations(locs)} 
              onRemoveRecentSearch={(id) => removeRecentSearch(id)}
              onClearAllRecentSearches={clearRecentSearches}
              currentSelectedCount={selectedLocations.length}
              maxLocations={5}
            />
            
            {showSearchResults && !isLoading && !chartData && (
              <>
                <SearchResultsSummary
                  totalResults={searchResults.totalFilteredResults}
                  startIndex={searchResults.startIndex}
                  endIndex={searchResults.endIndex}
                  searchQuery={searchQuery}
                  allowedType={searchResults.allowedType}
                  selectedProvinceName={searchResults.selectedProvinceName}
                />

                <LocationList
                  filteredProvinces={searchResults.filteredProvinces}
                  filteredDistricts={searchResults.filteredDistricts}
                  filteredSubDistricts={searchResults.filteredSubDistricts}
                  selectedLocationsCount={selectedLocations.length}
                  onLocationSelect={handleLocationSelect}
                />

                <NoResultsState 
                  searchQuery={searchQuery} 
                  totalResults={searchResults.totalFilteredResults}
                />

                <SearchPagination
                  totalResults={searchResults.totalFilteredResults}
                  currentPage={searchResults.searchPagination.currentPage}
                  pageSize={searchResults.searchPagination.pageSize}
                  onPageChange={searchResults.handlePageChange}
                  onPageSizeChange={searchResults.handlePageSizeChange}
                />
              </>
            )}
          </>
        )}

        {isLoading && <LinearProgress sx={{ mt: 2 }} />} {/* Use simple loading for now */}

        {chartData && (
          <Box sx={{ mt: 3 }}>
            <Box display="flex" gap={3} mb={3}>
               <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #ddd' }}>
                 <Typography variant="h6">Overtourism Analysis</Typography>
                 <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                   {selectedLocations.map(l => (
                     <Chip key={l.id} label={l.name} size="small" sx={{ bgcolor: getTourismColor(l.uniqueId), color: '#fff' }} />
                   ))}
                 </Box>
                 <Button onClick={() => setChartData(null)} sx={{ mt: 2 }} size="small" variant="outlined">New Search</Button>
               </Paper>
               <Paper elevation={0} sx={{ flex: 1.5, p: 2, border: '1px solid #ddd' }}>
                 <MigrationAnalysisDuration 
                   selectedStartDate={dateRange.startDate}
                   selectedEndDate={dateRange.endDate}
                   onDateRangeChange={handleDateRangeChange}
                   title="Overtourism Analysis Duration"
                 />
               </Paper>
            </Box>

            <Paper elevation={0} sx={{ p: 2, border: '1px solid #ddd', mb: 3 }}>
              <ToggleButtonGroup 
                value={activeSeries}
                exclusive
                onChange={(_, v) => v && setActiveSeries(v)}
                fullWidth
              >
                <ToggleButton value="both">Both Indexes</ToggleButton>
                <ToggleButton value="irritation">Irritation Index Only</ToggleButton>
                <ToggleButton value="environmental">Environmental Stress Only</ToggleButton>
              </ToggleButtonGroup>
            </Paper>

            {/* Warnings */}
            {chartData.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Data Availability Warning</AlertTitle>
                    {chartData.warnings.map(w => <div key={w}>{w}</div>)}
                </Alert>
            )}

            <OvertourismLineChart 
              data={chartData.data}
              locations={selectedLocations}
              width={chartWidth}
              height={chartHeight}
              activeSeries={activeSeries}
              getLocationColor={getTourismColor}
            />

            <Divider sx={{ my: 4 }} />
            
            <AttributeDisplay data={chartData.data} locations={selectedLocations} getLocationColor={getTourismColor} />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
