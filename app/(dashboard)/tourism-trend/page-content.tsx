'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Paper, Typography, useTheme, CircularProgress, Button, Chip, ToggleButton, ToggleButtonGroup, FormControl, Select, MenuItem, InputLabel, Fade } from '@mui/material';
import { BarChart } from '@mui/icons-material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import * as d3 from 'd3';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr';

// Components
import { MigrationAnalysisDuration } from '@/components/migration-analysis-duration/MigrationAnalysisDuration';
import { ApiDisconnectedPage } from '../components/ApiDisconnectedPage';
import { useConnectivity } from '@/app/contexts/ConnectivityContext';
import CitationFooter from '@/components/citation-footer/citation-footer';
import { Header } from '../components/Header';
import { LocationChips } from '../components/LocationChips';
import { SearchBar } from '../components/SearchBar';
import { LoadingState } from '../components/LoadingState';
import { NoResultsState } from '../components/NoResultsState';
import { LocationList } from '../components/LocationList';
import { SearchPagination } from '../components/SearchPagination';
import { SearchResultsSummary } from '../components/SearchResultsSummary';
import { RecentSearches } from '../components/RecentSearches';

// Services
import { tourismAPIService } from '@/app/services/tourism-api-service';
import { metadataService } from '@/app/services/api';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts } from '../hooks';
import { Location, getLocationColor } from '../helper';
import { canAddMoreLocations } from '../constraints';
import { formatDateRange } from '@/src/utils/date-formatter';
import { saveRecentSearch, loadRecentSearches, removeRecentSearch, clearRecentSearches, RecentSearch, validateStoredLocations } from '../../../src/utils/recentSearches';

// Custom constraints for tourism analysis page
const TOURISM_ANALYSIS_CONSTRAINTS = {
  MAX_TOTAL_LOCATIONS: 5
};

// Types for D3.js chart - Tourism uses arrivals only
interface LocationTourismEntry {
  locationId: string;
  locationName: string;
  arrivals: number;
}

interface TourismChartDataEntry {
  period: string;
  locations: LocationTourismEntry[];
}

interface TourismChartDataEntryWithSort extends TourismChartDataEntry {
  sortKey: number;
}

interface TourismChartData {
  data: TourismChartDataEntry[];
  locations: Location[];
  period: { id: string; startDate: string; endDate: string };
  summary: {
    totalArrivals: number;
  };
}

// Legend Component for Tourism
interface LegendProps {
  locations: Location[];
  getLocationColor: (locationId: string) => string;
}

const Legend: React.FC<LegendProps> = ({ locations, getLocationColor }) => {
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
                  Tourist Arrivals
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const containerStyles = { width: '100%' };
const paperStyles = { p: 3, borderRadius: 2 };

// D3.js Tourism Bar Chart Component (single-direction for arrivals)
const TourismBarChart: React.FC<{
  data: TourismChartDataEntry[];
  locations: Location[];
  width: number;
  height: number;
  getTourismColor: (locationId: string) => string;
}> = ({ data, locations, width, height, getTourismColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tourism-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    const margin = { top: 60, right: 20, bottom: 120, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.period))
      .range([0, innerWidth])
      .padding(0.2);

    const xSubScale = d3
      .scaleBand()
      .domain(locations.map(l => l.uniqueId))
      .range([0, xScale.bandwidth()])
      .padding(0.05);

    // Find the max arrivals value
    const maxArrivals = d3.max(data.flatMap(d => d.locations.map(l => l.arrivals))) || 0;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxArrivals * 1.1])
      .range([innerHeight, 0]);

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

    // Add axes (hide month labels if year span > 3)
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => {
        if (hideMonthLabels) return '';
        const parts = d.split(' ');
        return parts.length >= 1 ? parts[0] : d;
      }))
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
        if (isFirstOfYear) {
          const x = xScale(d.period)! - 5;
          yearBoundaries.push({ year, x, label: year.toString() });
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

    // Format y-axis values
    const formatYAxis = (d: d3.NumberValue) => {
      const value = d.valueOf();
      if (value >= 1000) {
        return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'k';
      }
      return value.toString();
    };

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(formatYAxis))
      .selectAll("text")
      .style("font-weight", "bold");

    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .text("Number of Tourists (thousands)");

    // Add direction label
    g.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -margin.top / 2)
      .attr("dy", "0.5em")
      .style("text-anchor", "start")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .style("fill", "#000")
      .text("Arrivals");

    // Create bars for each period
    data.forEach(periodData => {
      const periodGroup = g
        .append("g")
        .attr("class", `period-${periodData.period}`)
        .attr("transform", `translate(${xScale(periodData.period)},0)`);

      periodData.locations.forEach(locationData => {
        const locationGroup = periodGroup
          .append("g")
          .attr("class", `location-${locationData.locationId}`)
          .attr("transform", `translate(${xSubScale(locationData.locationId)},0)`);

        // Arrivals bar
        locationGroup
          .append("rect")
          .attr("class", "arrivals-bar")
          .attr("x", 0)
          .attr("y", yScale(locationData.arrivals))
          .attr("width", xSubScale.bandwidth())
          .attr("height", innerHeight - yScale(locationData.arrivals))
          .attr("fill", getTourismColor(locationData.locationId))
          .attr("opacity", 0.9)
          .style("cursor", "pointer")
          .on("mouseover", function(event) {
            d3.select(this).attr("opacity", 1);
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${locationData.locationName}</strong><br/>
                <strong>${periodData.period}</strong><br/>
                Arrivals: ${locationData.arrivals.toLocaleString()}
              `);
          })
          .on("mousemove", function(event) {
            tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          })
          .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.9);
            tooltip.style("opacity", 0);
          });
      });
    });

    return () => {
      d3.selectAll(".tourism-tooltip").remove();
    };
  }, [data, locations, width, height, getTourismColor]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

// D3.js Tourism Line Chart Component (for Trend Breakdown)
const TourismLineChart: React.FC<{
  data: TourismChartDataEntry[];
  locations: Location[];
  width: number;
  height: number;
  getTourismColor: (locationId: string) => string;
}> = ({ data, locations, width, height, getTourismColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tourism-line-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    const margin = { top: 60, right: 20, bottom: 120, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Transform data for line chart: each location becomes a series
    const lineData = locations.map(location => {
      const series = data.map((periodData, periodIndex) => {
        const locationEntry = periodData.locations.find(l => l.locationId === location.uniqueId);
        return {
          period: periodData.period,
          periodIndex,
          value: locationEntry?.arrivals || 0,
          locationName: location.name,
          locationId: location.uniqueId
        };
      });
      return {
        locationId: location.uniqueId,
        locationName: location.name,
        data: series,
        color: getTourismColor(location.uniqueId)
      };
    });

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    const maxValue = d3.max(lineData.flatMap(series => series.data.map(d => d.value))) || 0;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([innerHeight, 0]);

    // Create line generator
    const line = d3
      .line<{ periodIndex: number; value: number }>()
      .x(d => xScale(d.periodIndex))
      .y(d => yScale(d.value))
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

    // Add x-axis (hide month labels if year span > 3)
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues(hideMonthLabels ? [] : d3.range(data.length))
        .tickFormat((i: any) => {
          if (hideMonthLabels) return '';
          const period = data[i]?.period;
          if (period) {
            const parts = period.split(' ');
            return parts.length >= 1 ? parts[0] : period;
          }
          return '';
        })
      )
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
        if (isFirstOfYear) {
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

    // Format y-axis values
    const formatYAxis = (d: d3.NumberValue) => {
      const value = d.valueOf();
      if (value >= 1000) {
        return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'k';
      }
      return value.toString();
    };

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(formatYAxis))
      .selectAll("text")
      .style("font-weight", "bold");

    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .text("Tourist Arrivals (thousands)");

    // Add lines for each location
    const locationGroups = g.selectAll(".location-line")
      .data(lineData)
      .enter()
      .append("g")
      .attr("class", "location-line");

    locationGroups
      .append("path")
      .attr("class", "line")
      .attr("d", d => line(d.data))
      .attr("fill", "none")
      .attr("stroke", d => d.color)
      .attr("stroke-width", 3)
      .attr("opacity", 0.8);

    // Add data points
    locationGroups.selectAll(".data-point")
      .data(d => d.data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(d.periodIndex))
      .attr("cy", d => yScale(d.value))
      .attr("r", 4)
      .attr("fill", d => {
        const locationData = lineData.find(l => l.locationId === d.locationId);
        return locationData ? locationData.color : '#000';
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 6);
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${d.locationName}</strong><br/>
            <strong>${d.period}</strong><br/>
            Arrivals: ${d.value.toLocaleString()}
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 4);
        tooltip.style("opacity", 0);
      });

    return () => {
      d3.selectAll(".tourism-line-tooltip").remove();
    };
  }, [data, locations, width, height, getTourismColor]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default function TourismAnalysisPageContent() {
  const theme = useTheme();
  const { isConnected } = useConnectivity();
  const inputRef = useRef<HTMLInputElement>(null);

  // Shared color functions for chart and legend
  const locationColors = d3.scaleOrdinal([
    '#EF5350', // Light Thai red
    '#42A5F5', // Light Thai blue
    '#D4AF37', // Gold
    '#FF9933', // Saffron
    '#26A69A', // Light emerald
    '#00BCD4', // Turquoise
    '#AB47BC', // Light royal purple
    '#FF6B6B', // Coral
    '#4ECDC4', // Teal
  ]);

  const getTourismColor = useCallback((locationId: string) => {
    return locationColors(locationId);
  }, [locationColors]);

  // Search and location state
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedForDeletion, setHighlightedForDeletion] = useState<number | null>(null);

  // Visualization selector state
  const [activeVisualization, setActiveVisualization] = useState<'tourism-timeline' | 'trend-breakdown' | 'period-comparison'>('tourism-timeline');

  // Time period selection state for targeted comparisons (Period Comparison feature)
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [filteredChartData, setFilteredChartData] = useState<TourismChartData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Chart data and loading state
  const [chartData, setChartData] = useState<TourismChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time period state - initialized with empty values, will be populated from metadata
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [defaultDateRangeInitialized, setDefaultDateRangeInitialized] = useState(false);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Tourism only supports province-level data, so restrict search to provinces
  const searchResults = useLocationSearch(selectedLocations, searchQuery, {
    restrictToTypes: ['province']
  });

  // Chart dimensions
  const chartWidth = 1000;
  const chartHeight = 500;

  // Keyboard shortcuts
  const keyboardShortcutsConfig = useMemo(() => ({
    inputRef,
    onShowShortcutsModal: () => {
      console.log('Show shortcuts modal');
    }
  }), [inputRef]);

  useKeyboardShortcuts(keyboardShortcutsConfig);

  // Initialize default date range from metadata on component mount
  useEffect(() => {
    const initializeDefaultDateRange = async () => {
      if (defaultDateRangeInitialized) return;
      
      try {
        const defaultRange = await metadataService.getDefaultDateRange();
        setDateRange({
          startDate: defaultRange.startDate,
          endDate: defaultRange.endDate
        });
        setDefaultDateRangeInitialized(true);
        
        console.log('Initialized default date range:', defaultRange);
      } catch (error) {
        console.error('Failed to initialize default date range:', error);
        setDefaultDateRangeInitialized(true); // Still mark as initialized to avoid retries
      }
    };

    initializeDefaultDateRange();
  }, [defaultDateRangeInitialized]);

  // Load and validate recent searches on mount
  useEffect(() => {
    const loadAndValidateRecentSearches = () => {
      const storedSearches = loadRecentSearches();
      const validatedSearches = storedSearches.map(search => ({
        ...search,
        locations: validateStoredLocations(search.locations, searchResults.allLocations)
      })).filter(search => search.locations.length > 0);
      setRecentSearches(validatedSearches);
    };

    loadAndValidateRecentSearches();
  }, [searchResults.allLocations]);

  // Paper styles
  const paperStyles = useMemo(() => ({
    p: 3,
    backgroundColor: theme.palette.background.paper,
    minHeight: '70vh'
  }), [theme.palette.background.paper]);

  // Transform Tourism API response to chart format for D3.js
  const transformTourismResponseToChartData = useCallback((
    apiResponse: any, 
    locations: Location[], 
    period: { id: string; startDate: string; endDate: string }
  ): TourismChartData => {
    console.log('Transforming Tourism API response:', apiResponse);
    console.log('Selected period range:', period);
    
    if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
      console.warn('Invalid Tourism API response structure:', apiResponse);
      return {
        data: [],
        locations,
        period,
        summary: { totalArrivals: 0 }
      };
    }

    // Create location data map for easier lookup
    const locationDataMap = new Map();
    apiResponse.data.forEach((locationData: any) => {
      locationDataMap.set(locationData.location.id, locationData);
    });

    // Parse the selected date range
    const selectedStartDate = new Date(period.startDate);
    const selectedEndDate = new Date(period.endDate);

    // Group time series data by time period, keeping location separation
    const timeSeriesMap: Record<string, LocationTourismEntry[]> = {};
    let totalArrivals = 0;

    // Get all unique time periods and filter by date range
    const allTimePeriods = new Set<string>();
    
    apiResponse.data.forEach((locationData: any) => {
      if (locationData.time_series) {
        Object.keys(locationData.time_series).forEach(timePeriodId => {
          const periodDate = parseTimePeriodToDate(timePeriodId, apiResponse);
          if (periodDate && periodDate >= selectedStartDate && periodDate < selectedEndDate) {
            allTimePeriods.add(timePeriodId);
          }
        });
      }
    });

    console.log('Filtered time periods:', Array.from(allTimePeriods));

    // Process each time period
    Array.from(allTimePeriods).forEach(timePeriodId => {
      const locationEntries: LocationTourismEntry[] = [];

      locations.forEach(location => {
        // Find corresponding API location data
        let apiLocationData = null;
        for (const [, data] of locationDataMap) {
          const locData = data as any;
          if (locData.location.name.toLowerCase() === location.name.toLowerCase()) {
            apiLocationData = locData;
            break;
          }
        }

        if (apiLocationData?.time_series?.[timePeriodId]) {
          const stats = apiLocationData.time_series[timePeriodId];
          // Tourism API uses 'arrivals' instead of move_in/move_out
          const arrivals = stats.arrivals || 0;

          locationEntries.push({
            locationId: location.uniqueId,
            locationName: location.name,
            arrivals
          });

          totalArrivals += arrivals;
        } else {
          locationEntries.push({
            locationId: location.uniqueId,
            locationName: location.name,
            arrivals: 0
          });
        }
      });

      timeSeriesMap[timePeriodId] = locationEntries;
    });

    // Convert to chart data format and sort chronologically
    const chartData: TourismChartDataEntry[] = Object.entries(timeSeriesMap)
      .map(([timePeriodId, locationEntries]): TourismChartDataEntryWithSort => {
        const displayPeriod = formatTimePeriodForDisplay(timePeriodId);
        
        return {
          period: displayPeriod,
          locations: locationEntries,
          sortKey: parseTimePeriodToDate(timePeriodId, apiResponse)?.getTime() || 0
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ sortKey, ...entry }) => entry);

    return {
      data: chartData,
      locations,
      period,
      summary: {
        totalArrivals
      }
    };
  }, []);

  // Load tourism data using the Tourism API
  const loadTourismData = useCallback(async (
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await tourismAPIService.executeQuery(locations, startDate, endDate);
      
      if (response.success && response.data) {
        // Use the effective date range from the API response
        const effectiveRange = response.data.effectiveDateRange || { startDate: startDate || '', endDate: endDate || '' };
        
        // Transform API response to chart data for tourism
        const transformedData = transformTourismResponseToChartData(
          response.apiResponse, 
          locations, 
          { id: 'custom-range', startDate: effectiveRange.startDate, endDate: effectiveRange.endDate }
        );
        setChartData(transformedData);
        
        // Update the component's date range state to reflect what was actually used
        setDateRange({
          startDate: effectiveRange.startDate,
          endDate: effectiveRange.endDate
        });
      } else {
        setError(response.error || 'Failed to load tourism data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Tourism data loading failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle date range change
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    console.log('Date range changed:', { startDate, endDate });
    setDateRange({ startDate, endDate });
    
    // Only reload data if we already have chart data (user has already executed a query)
    if (selectedLocations.length > 0 && chartData) {
      loadTourismData(selectedLocations, startDate, endDate);
    }
  }, [selectedLocations, chartData, loadTourismData]);

  // Helper function to parse time period ID to Date object for filtering
  const parseTimePeriodToDate = (timePeriodId: string, apiResponse?: any): Date | null => {
    try {
      // Handle the actual API format like "oct19", "nov19", "dec19"
      if (timePeriodId.match(/^[a-z]{3}\d{2}$/)) {
        const monthMap: Record<string, number> = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const monthPart = timePeriodId.substring(0, 3).toLowerCase();
        const yearPart = timePeriodId.substring(3);
        
        const monthNum = monthMap[monthPart];
        const fullYear = 2000 + parseInt(yearPart); // 19 → 2019, 20 → 2020, etc.
        
        if (monthNum !== undefined && !isNaN(fullYear)) {
          return new Date(fullYear, monthNum, 1);
        }
      }
      
      // Handle period IDs that might be in the time_periods metadata
      // Check if the API response has time_periods metadata we can use for lookup
      if (apiResponse.time_periods && Array.isArray(apiResponse.time_periods)) {
        const matchingPeriod = apiResponse.time_periods.find((p: any) => p.id === timePeriodId);
        if (matchingPeriod && matchingPeriod.start_date) {
          const startDate = new Date(matchingPeriod.start_date);
          if (!isNaN(startDate.getTime())) {
            return startDate;
          }
        }
      }
      
      // Fallback: try ISO date format directly
      const isoDate = new Date(timePeriodId);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      // Handle YYYY-MM format (e.g., "2020-01")
      if (timePeriodId.match(/^\d{4}-\d{1,2}$/)) {
        const parts = timePeriodId.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
        
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          return new Date(year, month, 1);
        }
      }
      
      // Handle YYYY-MM-DD format
      if (timePeriodId.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const date = new Date(timePeriodId);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return null;
    } catch (e) {
      console.warn(`Failed to parse time period: ${timePeriodId}`, e);
      return null;
    }
  };

  // Helper function to format time period ID for display
  const formatTimePeriodForDisplay = (timePeriodId: string): string => {
    // Handle the actual API format like "oct19", "nov19", "dec19"
    if (timePeriodId.match(/^[a-z]{3}\d{2}$/)) {
      const monthMap: Record<string, string> = {
        'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'may': 'May', 'jun': 'Jun',
        'jul': 'Jul', 'aug': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'
      };
      
      const monthPart = timePeriodId.substring(0, 3).toLowerCase();
      const yearPart = timePeriodId.substring(3);
      const fullYear = 2000 + parseInt(yearPart); // 19 → 2019, 20 → 2020, etc.
      
      const monthName = monthMap[monthPart];
      if (monthName && !isNaN(fullYear)) {
        return `${monthName} ${fullYear}`;
      }
    }
    
    // Handle YYYY-MM format
    if (timePeriodId.includes('-')) {
      const parts = timePeriodId.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1];
        
        // Convert month number to abbreviated name
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(month) - 1;
        
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${monthNames[monthIndex]} ${year}`;
        }
      }
    }
    
    // Fallback to original ID if parsing fails
    return timePeriodId;
  };

  // Custom location limit check for tourism analysis
  const canAddMoreTourismLocations = (currentCount: number): boolean => {
    return currentCount < TOURISM_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS;
  };

  // Handle search change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    if (!canAddMoreTourismLocations(selectedLocations.length)) {
      console.warn(`Cannot add more locations. Maximum of ${TOURISM_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS} locations allowed for tourism analysis.`);
      return;
    }
    
    const newLocations = [...selectedLocations, location];
    setSelectedLocations(newLocations);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [selectedLocations]);

  // Handle location removal
  const handleLocationRemove = useCallback((locationId: number) => {
    setSelectedLocations(prev => prev.filter(loc => loc.id !== locationId));
  }, []);

  // Handle execute query
  const handleExecuteQuery = useCallback(async () => {
    if (selectedLocations.length === 0) return;
    
    await loadTourismData(selectedLocations, dateRange.startDate, dateRange.endDate);

    // Save successful search to recent searches
    console.log('💾 Saving recent search for locations:', selectedLocations.map(l => l.name));
    saveRecentSearch(selectedLocations);
    
    // Update the recent searches state to reflect the new search
    setRecentSearches(prev => {
      const updated = loadRecentSearches();
      // Validate against current location data
      return updated.map(search => ({
        ...search,
        locations: validateStoredLocations(search.locations, searchResults.allLocations)
      })).filter(search => search.locations.length > 0);
    });
  }, [selectedLocations, dateRange.startDate, dateRange.endDate, loadTourismData, searchResults.allLocations]);

  // Handle new search
  const handleNewSearch = useCallback(() => {
    setChartData(null);
    setSelectedLocations([]);
    setSearchQuery('');
    setHighlightedForDeletion(null);
    setError(null);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Handle edit search
  const handleEditSearch = useCallback(() => {
    setChartData(null);
    setError(null);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Handle key down events
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        handleExecuteQuery();
      } else {
        event.preventDefault();
        const firstResult = searchResults.getFirstAvailableResult();
        if (firstResult) {
          handleLocationSelect(firstResult);
        }
      }
    } else if (event.key === 'Backspace') {
      if (searchQuery === '' && selectedLocations.length > 0) {
        event.preventDefault();
        
        if (highlightedForDeletion !== null) {
          handleLocationRemove(highlightedForDeletion);
          setHighlightedForDeletion(null);
        } else {
          setHighlightedForDeletion(selectedLocations[selectedLocations.length - 1].id);
        }
      }
    } else {
      if (highlightedForDeletion !== null) {
        setHighlightedForDeletion(null);
      }
    }
  }, [handleExecuteQuery, searchResults, handleLocationSelect, searchQuery, selectedLocations, highlightedForDeletion, handleLocationRemove]);

  // Recent searches handlers
  const handleLoadRecentSearch = useCallback((locations: Location[]) => {
    const availableSlots = 5 - selectedLocations.length;
    if (availableSlots <= 0) return;

    // Add locations that fit within the limit
    const locationsToAdd = locations.slice(0, availableSlots);
    setSelectedLocations(prev => [...prev, ...locationsToAdd]);
  }, [selectedLocations.length]);

  const handleRemoveRecentSearch = useCallback((searchId: string) => {
    removeRecentSearch(searchId);
    setRecentSearches(prev => prev.filter(search => search.id !== searchId));
  }, []);

  const handleClearAllRecentSearches = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const showSearchResults = searchQuery.trim() !== '' || selectedLocations.length === 0 || !chartData;

  if (!isConnected) {
    return (
      <Box sx={containerStyles}>
        <Header />
        <ApiDisconnectedPage />
      </Box>
    );
  }

  return (
    <Box sx={containerStyles}>
      <Header />

      <Paper elevation={0} sx={paperStyles}>
        {/* Location Search Interface */}
        {!chartData && (
          <>
            <LocationChips
              selectedLocations={selectedLocations}
              highlightedForDeletion={highlightedForDeletion}
              onLocationRemove={handleLocationRemove}
              maxLocations={TOURISM_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS}
            />

            <SearchBar
              inputRef={inputRef}
              searchQuery={searchQuery}
              selectedLocations={selectedLocations}
              highlightedForDeletion={highlightedForDeletion}
              isLoading={false}
              allowedType={searchResults.allowedType}
              restrictToTypes={searchResults.restrictToTypes}
              onSearchChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onExecuteQuery={handleExecuteQuery}
              actionLabel="View Tourism Trends"
            />

            <RecentSearches
              recentSearches={recentSearches}
              onLoadRecentSearch={handleLoadRecentSearch}
              onRemoveRecentSearch={handleRemoveRecentSearch}
              onClearAllRecentSearches={handleClearAllRecentSearches}
              currentSelectedCount={selectedLocations.length}
              maxLocations={5}
            />
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading tourism data...
            </Typography>
          </Box>
        )}

        {/* Error State */}
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

        {/* Chart Display */}
        {chartData && !isLoading && !error && (
          <Box sx={{ px: 2, py: 2 }}>
            {/* Title Card and Date Range Selector Row */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              {/* Multi-province tourism analysis card */}
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
                    Multi-province Tourism Analysis
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                    Tourism Timeline
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
                    {chartData.locations.map((location) => (
                      <Chip
                        key={location.uniqueId}
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
                      label={`${chartData.locations.length} province${chartData.locations.length > 1 ? 's' : ''}`}
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
                      onClick={handleEditSearch}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Edit Search
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleNewSearch}
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

              {/* Tourism Analysis Duration Card */}
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
                  title="Tourism Analysis Duration"
                />
              </Paper>
            </Box>

            {/* Visualization Selector */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 0,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <ToggleButtonGroup
                value={activeVisualization}
                exclusive
                onChange={(_, newValue) => {
                  if (newValue !== null) {
                    setActiveVisualization(newValue);
                  }
                }}
                aria-label="Visualization type"
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
                  value="tourism-timeline"
                  aria-label="Tourism Timeline"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(0,52,104,0.04) 0%, rgba(30,136,229,0.03) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #003468 0%, #1E88E5 100%)',
                      color: 'white',
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%', textAlign: 'left' }}>
                    <BarChart fontSize="small" />
                    <Box>
                      <Typography component="span" sx={{ fontWeight: 700 }}>Tourism Timeline</Typography>
                      <Typography component="div" variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Arrivals by period</Typography>
                    </Box>
                  </Box>
                </ToggleButton>

                <ToggleButton
                  value="trend-breakdown"
                  aria-label="Trend Breakdown"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(0,119,190,0.04) 0%, rgba(51,153,211,0.03) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #0077BE 0%, #3399D3 100%)',
                      color: 'white',
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%', textAlign: 'left' }}>
                    <ShowChartIcon fontSize="small" />
                    <Box>
                      <Typography component="span" sx={{ fontWeight: 700 }}>Trend Breakdown</Typography>
                      <Typography component="div" variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Line trends by province</Typography>
                    </Box>
                  </Box>
                </ToggleButton>

                <ToggleButton
                  value="period-comparison"
                  aria-label="Period Comparison"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(30,136,229,0.04) 0%, rgba(66,165,245,0.03) 100%)',
                    color: theme.palette.text.primary,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
                      color: 'white',
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%', textAlign: 'left' }}>
                    <CompareArrowsIcon fontSize="small" />
                    <Box>
                      <Typography component="span" sx={{ fontWeight: 700 }}>Period Comparison</Typography>
                      <Typography component="div" variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Compare moments in time</Typography>
                    </Box>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>
          </Box>
        )}

        {/* Tourism Timeline Visualization */}
        {chartData && !isLoading && !error && activeVisualization === 'tourism-timeline' && (
          <Box sx={{ px: 2, py: 2 }}>
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
                  <TourismBarChart
                    data={chartData.data}
                    locations={chartData.locations}
                    width={chartWidth}
                    height={chartHeight}
                    getTourismColor={getTourismColor}
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
                  <Legend
                    locations={chartData.locations}
                    getLocationColor={getTourismColor}
                  />
                </Paper>
              </Box>
            </Paper>

            {/* Citation Footer */}
            <CitationFooter />
          </Box>
        )}

        {/* Trend Breakdown Visualization (Line Chart) */}
        {chartData && !isLoading && !error && activeVisualization === 'trend-breakdown' && (
          <Box sx={{ px: 2, py: 2 }}>
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
                  <TourismLineChart
                    data={chartData.data}
                    locations={chartData.locations}
                    width={chartWidth}
                    height={chartHeight}
                    getTourismColor={getTourismColor}
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
                  <Legend
                    locations={chartData.locations}
                    getLocationColor={getTourismColor}
                  />
                </Paper>
              </Box>
            </Paper>

            {/* Citation Footer */}
            <CitationFooter />
          </Box>
        )}

        {/* Period Comparison Visualization */}
        {chartData && !isLoading && !error && activeVisualization === 'period-comparison' && (
          <Box sx={{ px: 2, py: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                pb: 2,
                mb: 3,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  Targeted Period Comparison
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                  Select specific time periods for detailed comparison across the same locations
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
                  Selected Periods ({selectedPeriods.length})
                </Typography>

                {/* Selected Periods Display */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {selectedPeriods.map((periodId) => (
                    <Chip
                      key={periodId}
                      label={formatTimePeriodForDisplay(periodId)}
                      onDelete={() => setSelectedPeriods(prev => prev.filter(p => p !== periodId))}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Box>

                {/* Period Selection Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 'fit-content' }}>
                    Add Period:
                  </Typography>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={selectedYear}
                      label="Year"
                      onChange={(e) => setSelectedYear(e.target.value)}
                      sx={{ borderRadius: 1.5, fontWeight: 500 }}
                    >
                      <MenuItem value=""><em>Year</em></MenuItem>
                      {(() => {
                        if (!dateRange.startDate || !dateRange.endDate) {
                          return <MenuItem disabled>No date range selected</MenuItem>;
                        }
                        const startYear = new Date(dateRange.startDate).getFullYear();
                        const endYear = new Date(dateRange.endDate).getFullYear();
                        const years = [];
                        for (let year = startYear; year <= endYear; year++) {
                          years.push(year);
                        }
                        return years.map(year => (
                          <MenuItem key={year} value={year.toString().slice(-2)}>{year}</MenuItem>
                        ));
                      })()}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={selectedMonth}
                      label="Month"
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      disabled={!selectedYear}
                      sx={{ borderRadius: 1.5, fontWeight: 500 }}
                    >
                      <MenuItem value=""><em>Month</em></MenuItem>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                        <MenuItem key={month} value={month.toLowerCase()}>{month}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (selectedMonth && selectedYear) {
                        const periodId = `${selectedMonth}${selectedYear}`;
                        const periodExists = chartData?.data.some(entry => formatTimePeriodForDisplay(periodId) === entry.period);
                        
                        if (!periodExists) {
                          const monthMap: Record<string, number> = {
                            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                          };
                          const monthNum = monthMap[selectedMonth];
                          const fullYear = 2000 + parseInt(selectedYear);
                          const periodDate = new Date(fullYear, monthNum, 1);
                          
                          if (!isNaN(periodDate.getTime())) {
                            const currentStart = new Date(dateRange.startDate || '2020-01-01');
                            const currentEnd = new Date(dateRange.endDate || '2024-12-31');
                            
                            if (periodDate < currentStart) {
                              setFeedbackMessage(`This period is before your current date range. Please adjust the Tourism Analysis Duration above to include ${formatTimePeriodForDisplay(periodId)}.`);
                            } else if (periodDate > currentEnd) {
                              setFeedbackMessage(`This period is after your current date range. Please adjust the Tourism Analysis Duration above to include ${formatTimePeriodForDisplay(periodId)}.`);
                            } else {
                              setFeedbackMessage(`Period ${formatTimePeriodForDisplay(periodId)} is not available in the current data.`);
                            }
                            setTimeout(() => setFeedbackMessage(''), 5000);
                          }
                          return;
                        }
                        
                        if (!selectedPeriods.includes(periodId)) {
                          setSelectedPeriods(prev => [...prev, periodId]);
                        }
                        setSelectedYear('');
                      }
                    }}
                    disabled={!selectedMonth || !selectedYear}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                  >
                    Add Period
                  </Button>
                </Box>

                {/* Apply Button */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (selectedPeriods.length > 0 && chartData) {
                        const filteredData = {
                          ...chartData,
                          data: chartData.data.filter(entry => {
                            return selectedPeriods.some(selectedPeriod => {
                              const displayPeriod = formatTimePeriodForDisplay(selectedPeriod);
                              return entry.period === displayPeriod;
                            });
                          })
                        };
                        setFilteredChartData(filteredData);
                      }
                    }}
                    disabled={selectedPeriods.length === 0}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                  >
                    Apply Comparison
                  </Button>

                  {filteredChartData && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setFilteredChartData(null);
                        setSelectedPeriods([]);
                        setSelectedMonth('');
                        setSelectedYear('');
                        setFeedbackMessage('');
                      }}
                      sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                    >
                      Clear Comparison
                    </Button>
                  )}
                </Box>

                {/* Feedback message */}
                <Fade in={!!feedbackMessage} timeout={500}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
                    <Typography variant="body2" sx={{ color: 'warning.contrastText', fontWeight: 500 }}>
                      ⚠️ {feedbackMessage}
                    </Typography>
                  </Box>
                </Fade>
              </Box>
            </Paper>

            {/* Filtered Chart Display */}
            {filteredChartData && (
              <Box sx={{ mb: 3 }}>
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
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Period Comparison Results
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      Comparing {filteredChartData.data.length} selected periods across {filteredChartData.locations.length} locations
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
                      <TourismBarChart
                        data={filteredChartData.data}
                        locations={filteredChartData.locations}
                        width={chartWidth}
                        height={chartHeight}
                        getTourismColor={getTourismColor}
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
                      <Legend
                        locations={filteredChartData.locations}
                        getLocationColor={getTourismColor}
                      />
                    </Paper>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* Citation Footer */}
            <CitationFooter />
          </Box>
        )}

        {/* Search Results - only show when no chart data */}
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

        {/* Empty State */}
        {!chartData && !isLoading && !error && selectedLocations.length > 0 && (
          <Box py={4} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              Click &quot;Execute Query&quot; or press Shift+Enter to load tourism data for the selected provinces.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}