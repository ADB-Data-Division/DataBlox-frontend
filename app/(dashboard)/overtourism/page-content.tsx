'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Paper, Typography, useTheme, CircularProgress, Button, Chip, ToggleButton, ToggleButtonGroup, Card, CardContent, Grid, Divider, Alert, AlertTitle } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import * as d3 from 'd3';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CitationFooter from '@/components/citation-footer/citation-footer';

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
import { Location, getLocationColor } from '../helper';
import { saveRecentSearch, loadRecentSearches, removeRecentSearch, clearRecentSearches, RecentSearch, validateStoredLocations } from '../../../src/utils/recentSearches';
import { canAddMoreLocations } from '../constraints';
import { formatDateRange } from '@/src/utils/date-formatter';

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
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
        Average Contributing Metrics (Selected Period)
      </Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
        Averaged values for the factors used to compute the Irritation Index and Environmental Stress.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {locations.map(loc => {
          const stats = averages[loc.uniqueId];
          if (!stats) return null;
          
          return (
            <Card 
              key={loc.uniqueId} 
              variant="outlined" 
              sx={{ 
                height: '100%',
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
              }}
            >
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

// Legend Component for Overtourism
interface OvertourismLegendProps {
  locations: Location[];
  getLocationColor: (locationId: string) => string;
}

const OvertourismLegend: React.FC<OvertourismLegendProps> = ({ locations, getLocationColor }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
        Legend
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {locations.map((location) => (
          <Box key={location.uniqueId} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 1
              }}
            >
              {location.name}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: getLocationColor(location.uniqueId),
                    borderRadius: 0.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  Irritation Index
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 3,
                    backgroundColor: getLocationColor(location.uniqueId),
                    borderRadius: 0.5,
                  }}
                />
                <Box
                  sx={{
                    width: 24,
                    height: 3,
                    background: 'repeating-linear-gradient(90deg, #666 0px, #666 4px, transparent 4px, transparent 8px)',
                    borderRadius: 0.5,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  Environmental Stress
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
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

    // Calculate year span to determine if month labels should be hidden
    const uniqueYears = new Set<number>();
    data.forEach(d => {
      const parts = d.period.split(' ');
      if (parts.length >= 2) {
        uniqueYears.add(parseInt(parts[1]));
      }
    });
    const yearSpan = uniqueYears.size;
    const hideMonthLabels = yearSpan > 3;

    // Draw Axes
    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickValues(hideMonthLabels ? [] : d3.range(data.length))
      .tickFormat((i: any) => {
        if (hideMonthLabels) return '';
        const period = data[i]?.period;
        if (period) {
          const parts = period.split(' ');
          return parts.length >= 1 ? parts[0] : period;
        }
        return '';
      });

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .attr("dy", ".35em");

    // Add year boundary lines
    const yearBoundaries: { year: number; x: number; label: string }[] = [];
    data.forEach((d, i) => {
      const parts = d.period.split(' ');
      if (parts.length >= 2) {
        const year = parseInt(parts[1]);
        const isFirstOfYear = i === 0 || !data.slice(0, i).some(prev => prev.period.includes(` ${year}`));
        if (isFirstOfYear && !isNaN(year)) {
          yearBoundaries.push({ year, x: xScale(i), label: year.toString() });
        }
      }
    });

    yearBoundaries.forEach(boundary => {
      g.append("line")
        .attr("x1", boundary.x)
        .attr("x2", boundary.x)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#666")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .style("opacity", 0.7);

      g.append("text")
        .attr("x", boundary.x)
        .attr("y", innerHeight + 25)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text(boundary.label);
    });

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

  // URL params hook for shareable URLs
  const { updateUrlWithLocations, clearUrlParams, getLocationsParam } = useUrlParams();

  // Ref to prevent duplicate URL loading
  const isResettingRef = useRef(false);

  // Helper for date formatting - converts API time period IDs to display format
  const formatDate = (id: string): string => {
    // Handle the actual API format like "oct19", "nov19", "dec19"
    if (id.match(/^[a-z]{3}\d{2}$/)) {
      const monthMap: Record<string, string> = {
        'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Jun',
        'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
      };
      
      const monthPart = id.substring(0, 3).toLowerCase();
      const yearPart = id.substring(3);
      const fullYear = 2000 + parseInt(yearPart);
      
      const monthName = monthMap[monthPart];
      if (monthName && !isNaN(fullYear)) {
        return `${monthName} ${fullYear}`;
      }
    }
    
    // Handle YYYY-MM format
    if (id.includes('-')) {
      const parts = id.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1];
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(month) - 1;
        
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${monthNames[monthIndex]} ${year}`;
        }
      }
    }
    
    // Fallback to original ID if parsing fails
    return id;
  };

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

  // Load locations from URL on mount
  useEffect(() => {
    const loadFromUrl = async () => {
      if (isResettingRef.current || searchResults.isLoading || searchResults.allLocations.length === 0) return;

      const locationsParam = getLocationsParam();

      if (locationsParam) {
        try {
          const decodedParam = decodeURIComponent(locationsParam);
          const uniqueIds = decodedParam.split(',').filter(id => id.trim() !== '');

          console.log('Overtourism: Loading locations from URL...', uniqueIds);
          // Filter to only include provinces (overtourism only supports province-level data)
          const locations = uniqueIds
            .map(uniqueId => searchResults.allLocations.find(loc => loc.uniqueId === uniqueId))
            .filter((location): location is Location => location !== undefined && location.type === 'province');

          const currentUniqueIds = selectedLocations.map(loc => loc.uniqueId).sort();
          const urlUniqueIds = uniqueIds.sort();
          const locationsMatch = currentUniqueIds.length === urlUniqueIds.length &&
                                currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);

          if (locations.length > 0 && !locationsMatch) {
            // Wait for dateRange to be available, or use defaults
            const currentDateRange = dateRange.startDate && dateRange.endDate ? dateRange : { startDate: '2024-01-01', endDate: '2024-12-31' };

            isResettingRef.current = true;

            setSelectedLocations(locations);
            setSearchQuery('');

            // Auto-execute query with loaded locations
            setIsLoading(true);
            setError(null);

            try {
              const res = await overtourismAPIService.executeQuery(locations, currentDateRange.startDate, currentDateRange.endDate);

              if (res.success && res.data) {
                const apiData = res.data;

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
                })).sort((a, b) => a.sortKey - b.sortKey);

                setChartData({
                  data: formattedEntries,
                  locations: locations,
                  period: { id: 'custom', startDate: currentDateRange.startDate!, endDate: currentDateRange.endDate! },
                  warnings: apiData.warnings || []
                });

                setDateRange({ startDate: currentDateRange.startDate, endDate: currentDateRange.endDate });
              }
              updateUrlWithLocations(locations);
            } catch (error) {
              console.error('Overtourism query failed after URL load:', error);
              setError(error instanceof Error ? error.message : 'Failed to load overtourism data');
            } finally {
              setIsLoading(false);
            }

            setTimeout(() => {
              isResettingRef.current = false;
            }, 100);
          }
        } catch (error) {
          console.error('Failed to parse locations from URL:', error);
        }
      }
    };

    loadFromUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults.isLoading, searchResults.allLocations]);

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

  const handleLocationRemove = useCallback((locationId: number) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  }, []);

  const handleExecuteQuery = useCallback(async (startDateOverride?: string | unknown, endDateOverride?: string) => {
    if (!selectedLocations.length) return;
    setChartData(null); // Clear previous data only on manual "Search" button click
    
    const sDate = (typeof startDateOverride === 'string' ? startDateOverride : undefined);
    const eDate = (typeof endDateOverride === 'string' ? endDateOverride : undefined);
    
    await loadOvertourismData(selectedLocations, sDate, eDate);
    updateUrlWithLocations(selectedLocations); // Update URL for sharing
  }, [selectedLocations, loadOvertourismData, updateUrlWithLocations]);
  
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
              onLocationRemove={handleLocationRemove}
              highlightedForDeletion={highlightedForDeletion}
              maxLocations={OVERTOURISM_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS}
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
               actionLabel="View Overtourism Trends"
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

        {isLoading && (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading overtourism data...
            </Typography>
          </Box>
        )}

        {error && !isLoading && (
          <Box py={4}>
            <Typography variant="h6" color="error" gutterBottom>
              Error Loading Data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </Box>
        )}

        {chartData && !isLoading && !error && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  flex: '0 0 40%',
                  p: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    Overtourism Analysis
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                    Irritation Index & Environmental Stress
                  </Typography>

                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      mb: 1.5
                    }}
                  >
                    Selected Provinces
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedLocations.map((location) => (
                      <Chip
                        key={location.id}
                        icon={<MapPinAreaIcon size={16} />}
                        label={location.name}
                        color={getLocationColor(location.type)}
                        size="medium"
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      />
                    ))}
                    <Chip
                      label={`${selectedLocations.length} province${selectedLocations.length > 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        borderStyle: 'dashed'
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setChartData(null);
                        setSelectedLocations([]);
                        setSearchQuery('');
                        setHighlightedForDeletion(null);
                        setError(null);
                        clearUrlParams();
                        setTimeout(() => { inputRef.current?.focus(); }, 100);
                      }}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      New Search
                    </Button>
                  </Box>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  flex: '0 0 58.5%',
                  p: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <MigrationAnalysisDuration 
                  selectedStartDate={dateRange.startDate}
                  selectedEndDate={dateRange.endDate}
                  onDateRangeChange={handleDateRangeChange}
                  title="Overtourism Analysis Duration"
                />
              </Paper>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <ToggleButtonGroup
                value={activeSeries}
                exclusive
                onChange={(_, v) => v && setActiveSeries(v)}
                fullWidth
                sx={{
                  display: 'flex',
                  width: '100%',
                  gap: 0,
                  p: 0.5,
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    px: { xs: 3, sm: 4 },
                    py: 2,
                    borderRadius: 0,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    border: 'none',
                    transition: 'all 0.14s ease',
                    minHeight: 64,
                    display: 'flex',
                    alignItems: 'center',
                    '&:not(:last-of-type)': {
                      borderRight: `1px solid ${theme.palette.divider}`,
                    },
                    '&:first-of-type': {
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                    },
                    '&:last-of-type': {
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                    },
                    '&.Mui-selected': {
                      transform: 'none',
                      boxShadow: '0 10px 30px rgba(16,24,40,0.08)',
                      zIndex: 1,
                    },
                    '&:hover': {
                      transform: 'translateY(-2px)'
                    },
                  },
                }}
              >
                <ToggleButton
                  value="both"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(0,52,104,0.04) 0%, rgba(30,136,229,0.03) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #003468 0%, #1e88e5 100%)',
                      color: '#fff',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #003668 0%, #1e98e5 100%)',
                      },
                    },
                  }}
                >
                  Both Indexes
                </ToggleButton>
                <ToggleButton
                  value="irritation"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(239,83,80,0.04) 0%, rgba(239,83,80,0.02) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
                      color: '#fff',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #EF6360 0%, #E53935 100%)',
                      },
                    },
                  }}
                >
                  Irritation Index Only
                </ToggleButton>
                <ToggleButton
                  value="environmental"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(102,187,106,0.04) 0%, rgba(102,187,106,0.02) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
                      color: '#fff',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
                      },
                    },
                  }}
                >
                  Environmental Stress Only
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>

            {/* Warnings */}
            {chartData && chartData.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Data Availability Warning</AlertTitle>
                    {chartData.warnings.map(w => <div key={w}>{w}</div>)}
                </Alert>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {activeSeries === 'both' ? 'Irritation Index & Environmental Stress' : activeSeries === 'irritation' ? 'Irritation Index' : 'Environmental Stress'} — {selectedLocations.map(l => l.name).join(', ')}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {dateRange.startDate && dateRange.endDate ? formatDateRange(dateRange.startDate, dateRange.endDate) : 'All available periods'}
                </Typography>
              </Box>
              <Box display="flex" gap={3}>
                {/* Chart Container */}
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 3,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                  }}
                >
                  <OvertourismLineChart 
                    data={chartData.data}
                    locations={selectedLocations}
                    width={chartWidth}
                    height={chartHeight}
                    activeSeries={activeSeries}
                    getLocationColor={getTourismColor}
                  />
                </Paper>

                {/* Legend Container */}
                <Paper
                  elevation={0}
                  sx={{
                    width: '250px',
                    p: 3,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                  }}
                >
                  <OvertourismLegend 
                    locations={selectedLocations}
                    getLocationColor={getTourismColor}
                  />
                </Paper>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <AttributeDisplay data={chartData.data} locations={selectedLocations} getLocationColor={getTourismColor} />
            </Paper>

            <CitationFooter />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
