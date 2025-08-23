'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Paper, Typography, useTheme, CircularProgress, Button } from '@mui/material';
import * as d3 from 'd3';

// Components
import { MigrationAnalysisDuration } from '@/components/migration-analysis-duration/MigrationAnalysisDuration';
import { Header } from '../components/Header';
import { LocationChips } from '../components/LocationChips';
import { SearchBar } from '../components/SearchBar';
import { LoadingState } from '../components/LoadingState';
import { NoResultsState } from '../components/NoResultsState';
import { LocationList } from '../components/LocationList';
import { SearchPagination } from '../components/SearchPagination';
import { SearchResultsSummary } from '../components/SearchResultsSummary';

// Services
import { migrationAPIService } from '@/app/services/migration-api-service';
import { metadataService } from '@/app/services/api';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts } from '../hooks';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';

// Custom constraints for migration analysis page
const MIGRATION_ANALYSIS_CONSTRAINTS = {
  MAX_TOTAL_LOCATIONS: 5
};

// Types for D3.js chart
interface LocationMigrationEntry {
  locationId: string;
  locationName: string;
  moveIn: number;
  moveOut: number;
  netMigration: number;
}

interface ChartDataEntry {
  period: string;
  locations: LocationMigrationEntry[];
}

interface ChartDataEntryWithSort extends ChartDataEntry {
  sortKey: number;
}

interface MigrationChartData {
  data: ChartDataEntry[];
  locations: Location[];
  period: { id: string; startDate: string; endDate: string };
  summary: {
    totalMoveIn: number;
    totalMoveOut: number;
    netMigration: number;
  };
}

const containerStyles = { width: '100%' };

// D3.js Diverging Bar Chart Component
const DivergingBarChart: React.FC<{
  data: ChartDataEntry[];
  locations: Location[];
  width: number;
  height: number;
}> = ({ data, locations, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "migration-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    const margin = { top: 60, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Color scales - different colors per province
    const locationColors = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Function to get darker (move-in) and lighter (move-out) versions of location colors
    const getMoveInColor = (locationId: string) => {
      const baseColor = locationColors(locationId);
      return d3.color(baseColor)?.darker(0.3)?.toString() || baseColor;
    };
    
    const getMoveOutColor = (locationId: string) => {
      const baseColor = locationColors(locationId);
      return d3.color(baseColor)?.brighter(0.5)?.toString() || baseColor;
    };

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

    // Find the extent of all values for y-scale
    const allValues = data.flatMap(d => 
      d.locations.flatMap(l => [l.moveIn, -l.moveOut, l.netMigration])
    );
    const yExtent = d3.extent(allValues) as [number, number];
    const yMax = Math.max(Math.abs(yExtent[0]), Math.abs(yExtent[1]));

    const yScale = d3
      .scaleLinear()
      .domain([-yMax * 1.1, yMax * 1.1])
      .range([innerHeight, 0]);

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${yScale(0)})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-weight", "bold");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d => Math.abs(d.valueOf()).toLocaleString()))
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
      .text("Number of People");

    // Add zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

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

        // Move-in bar (positive) - darker hue for this province
        locationGroup
          .append("rect")
          .attr("class", "move-in-bar")
          .attr("x", 0)
          .attr("y", yScale(locationData.moveIn))
          .attr("width", xSubScale.bandwidth())
          .attr("height", yScale(0) - yScale(locationData.moveIn))
          .attr("fill", getMoveInColor(locationData.locationId))
          .attr("opacity", 0.9)
          .style("cursor", "pointer")
          .on("mouseover", function(event) {
            d3.select(this).attr("opacity", 1);
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${locationData.locationName}</strong><br/>
                <strong>${periodData.period}</strong><br/>
                Move In: ${locationData.moveIn.toLocaleString()}<br/>
                Move Out: ${locationData.moveOut.toLocaleString()}<br/>
                Net Migration: ${locationData.netMigration >= 0 ? '+' : ''}${locationData.netMigration.toLocaleString()}
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

        // Move-out bar (negative) - lighter hue for this province
        locationGroup
          .append("rect")
          .attr("class", "move-out-bar")
          .attr("x", 0)
          .attr("y", yScale(0))
          .attr("width", xSubScale.bandwidth())
          .attr("height", yScale(-locationData.moveOut) - yScale(0))
          .attr("fill", getMoveOutColor(locationData.locationId))
          .attr("opacity", 0.9)
          .style("cursor", "pointer")
          .on("mouseover", function(event) {
            d3.select(this).attr("opacity", 1);
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${locationData.locationName}</strong><br/>
                <strong>${periodData.period}</strong><br/>
                Move In: ${locationData.moveIn.toLocaleString()}<br/>
                Move Out: ${locationData.moveOut.toLocaleString()}<br/>
                Net Migration: ${locationData.netMigration >= 0 ? '+' : ''}${locationData.netMigration.toLocaleString()}
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

        // Net migration line - black dashed with 80% opacity
        locationGroup
          .append("line")
          .attr("class", "net-migration-line")
          .attr("x1", 0)
          .attr("x2", xSubScale.bandwidth())
          .attr("y1", yScale(locationData.netMigration))
          .attr("y2", yScale(locationData.netMigration))
          .attr("stroke", "black")
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", "5,5")
          .attr("opacity", 0.8);

        // Add small circle at the end of net migration line
        locationGroup
          .append("circle")
          .attr("class", "net-migration-point")
          .attr("cx", xSubScale.bandwidth() / 2)
          .attr("cy", yScale(locationData.netMigration))
          .attr("r", 3)
          .attr("fill", "black")
          .attr("opacity", 0.8);
      });
    });

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

    // Province-specific legends
    locations.forEach((location, i) => {
      const yOffset = i * 70; // Increased spacing between provinces
      
      // Create a group for this province's legend items
      const provinceGroup = legend
        .append("g")
        .attr("class", `legend-province-${location.uniqueId}`)
        .style("cursor", "pointer");

      // Move-in legend for this province (darker color)
      provinceGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", yOffset)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", getMoveInColor(location.uniqueId));

      provinceGroup
        .append("text")
        .attr("x", 20)
        .attr("y", yOffset + 12)
        .text("Move-in")
        .style("font-size", "12px")
        .style("font-weight", "normal");

      // Move-out legend for this province (lighter color)
      provinceGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", yOffset + 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", getMoveOutColor(location.uniqueId));

      provinceGroup
        .append("text")
        .attr("x", 20)
        .attr("y", yOffset + 32)
        .text("Move-out")
        .style("font-size", "12px")
        .style("font-weight", "normal");

      // Net migration line for this province - black dashed
      provinceGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", yOffset + 47)
        .attr("y2", yOffset + 47)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.8);

      provinceGroup
        .append("text")
        .attr("x", 20)
        .attr("y", yOffset + 52)
        .text(`Net: ${location.name}`)
        .style("font-size", "12px")
        .style("font-weight", "normal");

      // Add hover events to the entire province group
      provinceGroup
        .on("mouseover", function(event) {
          // Calculate total stats for this province across all periods
          let totalMoveIn = 0;
          let totalMoveOut = 0;
          let totalNet = 0;
          
          data.forEach(periodData => {
            const locationStats = periodData.locations.find(l => l.locationId === location.uniqueId);
            if (locationStats) {
              totalMoveIn += locationStats.moveIn;
              totalMoveOut += locationStats.moveOut;
              totalNet += locationStats.netMigration;
            }
          });

          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${location.name} - Total Summary</strong><br/>
              Total Move In: ${totalMoveIn.toLocaleString()}<br/>
              Total Move Out: ${totalMoveOut.toLocaleString()}<br/>
              Total Net Migration: ${totalNet >= 0 ? '+' : ''}${totalNet.toLocaleString()}
            `);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.style("opacity", 0);
        });
    });

    // Cleanup function to remove tooltip when component unmounts
    return () => {
      d3.selectAll(".migration-tooltip").remove();
    };
  }, [data, locations, width, height]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default function MigrationAnalysisPageContent() {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search and location state
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedForDeletion, setHighlightedForDeletion] = useState<number | null>(null);

  // Chart data and loading state
  const [chartData, setChartData] = useState<MigrationChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time period state - initialized with empty values, will be populated from metadata
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [defaultDateRangeInitialized, setDefaultDateRangeInitialized] = useState(false);

  const searchResults = useLocationSearch(selectedLocations, searchQuery);

  // Chart dimensions
  const chartWidth = 1200;
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

  // Paper styles
  const paperStyles = useMemo(() => ({
    p: 3,
    backgroundColor: theme.palette.background.paper,
    minHeight: '70vh'
  }), [theme.palette.background.paper]);

  // Transform API response to chart format for D3.js diverging bars
  const transformAPIResponseToChartData = useCallback((
    apiResponse: any, 
    locations: Location[], 
    period: { id: string; startDate: string; endDate: string }
  ): MigrationChartData => {
    console.log('Transforming API response:', apiResponse);
    console.log('Selected period range:', period);
    
    if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
      console.warn('Invalid API response structure:', apiResponse);
      return {
        data: [],
        locations,
        period,
        summary: { totalMoveIn: 0, totalMoveOut: 0, netMigration: 0 }
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
    const timeSeriesMap: Record<string, LocationMigrationEntry[]> = {};
    let totalMoveIn = 0;
    let totalMoveOut = 0;

    // Get all unique time periods and filter by date range
    const allTimePeriods = new Set<string>();
    const allAvailablePeriods: string[] = [];
    
    apiResponse.data.forEach((locationData: any) => {
      if (locationData.time_series) {
        Object.keys(locationData.time_series).forEach(timePeriodId => {
          allAvailablePeriods.push(timePeriodId);
          
          // Parse the time period date to check if it's within range
          const periodDate = parseTimePeriodToDate(timePeriodId, apiResponse);
          console.log(`Parsing period ${timePeriodId}:`, periodDate, 'Selected range:', selectedStartDate, '-', selectedEndDate);
          
          if (periodDate && periodDate >= selectedStartDate && periodDate <= selectedEndDate) {
            allTimePeriods.add(timePeriodId);
          }
        });
      }
    });

    console.log('All available time periods from API:', [...new Set(allAvailablePeriods)]);
    console.log('Filtered time periods:', Array.from(allTimePeriods));

    // Process each time period
    Array.from(allTimePeriods).forEach(timePeriodId => {
      const locationEntries: LocationMigrationEntry[] = [];

      locations.forEach(location => {
        // Find corresponding API location data
        let apiLocationData = null;
        for (const [, data] of locationDataMap) {
          const locationData = data as any;
          if (locationData.location.name.toLowerCase() === location.name.toLowerCase()) {
            apiLocationData = locationData;
            break;
          }
        }

        if (apiLocationData && apiLocationData.time_series && apiLocationData.time_series[timePeriodId]) {
          const stats = apiLocationData.time_series[timePeriodId];
          const moveIn = stats.move_in || 0;
          const moveOut = stats.move_out || 0;
          const netMigration = stats.net_migration || (moveIn - moveOut);

          locationEntries.push({
            locationId: location.uniqueId,
            locationName: location.name,
            moveIn,
            moveOut,
            netMigration
          });

          totalMoveIn += moveIn;
          totalMoveOut += moveOut;
        } else {
          // Add zero entry if no data for this location/period
          locationEntries.push({
            locationId: location.uniqueId,
            locationName: location.name,
            moveIn: 0,
            moveOut: 0,
            netMigration: 0
          });
        }
      });

      timeSeriesMap[timePeriodId] = locationEntries;
    });

    // Convert to chart data format and sort chronologically
    const chartData: ChartDataEntry[] = Object.entries(timeSeriesMap)
      .map(([timePeriodId, locationEntries]): ChartDataEntryWithSort => {
        const displayPeriod = formatTimePeriodForDisplay(timePeriodId);
        
        return {
          period: displayPeriod,
          locations: locationEntries,
          sortKey: parseTimePeriodToDate(timePeriodId, apiResponse)?.getTime() || 0
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey) // Sort chronologically
      .map(({ sortKey, ...entry }) => entry); // Remove sortKey from final data

    return {
      data: chartData,
      locations,
      period,
      summary: {
        totalMoveIn,
        totalMoveOut,
        netMigration: totalMoveIn - totalMoveOut
      }
    };
  }, []);

  // Load migration data using the new API
  const loadMigrationData = useCallback(async (
    locations: Location[], 
    startDate?: string, 
    endDate?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await migrationAPIService.executeQuery(locations, startDate, endDate);
      
      if (response.success && response.data) {
        // Use the effective date range from the API response (includes defaults if no dates were provided)
        const effectiveRange = response.data.effectiveDateRange || { startDate: startDate || '', endDate: endDate || '' };
        
        // Transform API response to chart data
        const transformedData = transformAPIResponseToChartData(
          response.data.apiResponse, 
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
        setError(response.error || 'Failed to load migration data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Migration data loading failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transformAPIResponseToChartData]);

  // Handle date range change
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    console.log('Date range changed:', { startDate, endDate });
    setDateRange({ startDate, endDate });
    
    // Only reload data if we already have chart data (user has already executed a query)
    if (selectedLocations.length > 0 && chartData) {
      loadMigrationData(selectedLocations, startDate, endDate);
    }
  }, [selectedLocations, chartData, loadMigrationData]);

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

  // Custom location limit check for migration analysis
  const canAddMoreMigrationLocations = (currentCount: number): boolean => {
    return currentCount < MIGRATION_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS;
  };

  // Handle search change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    if (!canAddMoreMigrationLocations(selectedLocations.length)) {
      console.warn(`Cannot add more locations. Maximum of ${MIGRATION_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS} locations allowed for migration analysis.`);
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
    
    await loadMigrationData(selectedLocations, dateRange.startDate, dateRange.endDate);
  }, [selectedLocations, dateRange.startDate, dateRange.endDate, loadMigrationData]);

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

  const showSearchResults = searchQuery.trim() !== '' || selectedLocations.length === 0 || !chartData;

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
              maxLocations={MIGRATION_ANALYSIS_CONSTRAINTS.MAX_TOTAL_LOCATIONS}
            />

            <SearchBar
              inputRef={inputRef}
              searchQuery={searchQuery}
              selectedLocations={selectedLocations}
              highlightedForDeletion={highlightedForDeletion}
              isLoading={false}
              allowedType={searchResults.allowedType}
              onSearchChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onExecuteQuery={handleExecuteQuery}
            />
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading migration data...
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
          <>
            {/* Date Range Selector for changing periods after query execution */}
            <MigrationAnalysisDuration
              selectedStartDate={dateRange.startDate}
              selectedEndDate={dateRange.endDate}
              onDateRangeChange={handleDateRangeChange}
            />
            
            <Box mt={3}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Multi-province comparison (diverging grouped bars): {chartData.locations.map(l => l.name).join(', ')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Period: {chartData.period.startDate} - {chartData.period.endDate}
                  </Typography>
                  
                </Box>
                <Button 
                  variant="outlined" 
                  onClick={handleNewSearch}
                  sx={{ mt: 1 }}
                >
                  New Search
                </Button>
              </Box>
              
              <DivergingBarChart
                data={chartData.data}
                locations={chartData.locations}
                width={chartWidth}
                height={chartHeight}
              />
            </Box>
          </>
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
              Click &quot;Execute Query&quot; or press Shift+Enter to load migration data for the selected locations.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}