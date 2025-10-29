'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Paper, Typography, useTheme, CircularProgress, Button, Chip } from '@mui/material';
import * as d3 from 'd3';

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

// Services
import { migrationAPIService } from '@/app/services/migration-api-service';
import { metadataService } from '@/app/services/api';

// Hooks and utils
import { useLocationSearch, useKeyboardShortcuts } from '../hooks';
import { useUrlParams } from '../hooks/useUrlParams';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';
import { formatDateRange } from '@/src/utils/date-formatter';

// Legend Component
interface LegendProps {
  locations: Location[];
  getMoveInColor: (locationId: string) => string;
  getMoveOutColor: (locationId: string) => string;
}

const Legend: React.FC<LegendProps> = ({ locations, getMoveInColor, getMoveOutColor }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
        Legend
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {locations.map((location) => (
          <Box key={location.uniqueId} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Province Name */}
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

            {/* Legend Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1 }}>
              {/* Move-in */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: getMoveInColor(location.uniqueId),
                    borderRadius: 0.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  Move-in
                </Typography>
              </Box>

              {/* Move-out */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: getMoveOutColor(location.uniqueId),
                    borderRadius: 0.5,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  Move-out
                </Typography>
              </Box>

              {/* Net Migration */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 2,
                      backgroundColor: 'black',
                      opacity: 0.8,
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  Net Migration
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

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
  getMoveInColor: (locationId: string) => string;
  getMoveOutColor: (locationId: string) => string;
}> = ({ data, locations, width, height, getMoveInColor, getMoveOutColor }) => {
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

    const margin = { top: 60, right: 150, bottom: 100, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
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
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-weight", "bold")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Format y-axis values to thousands (k)
    const formatYAxis = (d: d3.NumberValue) => {
      const value = Math.abs(d.valueOf());
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
      .text("Number of People (thousands)");

    // Add directional labels
    g.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -margin.top / 2)
      .attr("dy", "0.5em")
      .style("text-anchor", "start")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .style("fill", "#000")
      .text("Move In");

    g.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", innerHeight + margin.bottom - 20)
      .attr("dy", "0.5em")
      .style("text-anchor", "start")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .style("fill", "#000")
      .text("Move Out");

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

    // Cleanup function to remove tooltip when component unmounts
    return () => {
      d3.selectAll(".migration-tooltip").remove();
    };
  }, [data, locations, width, height, getMoveInColor, getMoveOutColor]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

// D3.js Net Migration Line Chart Component
const NetMigrationLineChart: React.FC<{
  data: ChartDataEntry[];
  locations: Location[];
  width: number;
  height: number;
  getMoveInColor: (locationId: string) => string;
  getMoveOutColor: (locationId: string) => string;
}> = ({ data, locations, width, height, getMoveInColor, getMoveOutColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "net-migration-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    const margin = { top: 60, right: 150, bottom: 100, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Transform data for line chart: each location becomes a series
    const lineData = locations.map(location => {
      const series = data.map(periodData => {
        const locationEntry = periodData.locations.find(l => l.locationId === location.uniqueId);
        return {
          period: periodData.period,
          periodIndex: data.indexOf(periodData),
          netMigration: locationEntry ? locationEntry.netMigration : 0,
          locationName: location.name,
          locationId: location.uniqueId
        };
      });
      return {
        locationId: location.uniqueId,
        locationName: location.name,
        data: series,
        color: getMoveInColor(location.uniqueId) // Use move-in color for consistency
      };
    });

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    // Find the extent of all net migration values
    const allValues = lineData.flatMap(series => series.data.map(d => d.netMigration));
    const yExtent = d3.extent(allValues) as [number, number];
    const yMax = Math.max(Math.abs(yExtent[0]), Math.abs(yExtent[1]));

    const yScale = d3
      .scaleLinear()
      .domain([-yMax * 1.1, yMax * 1.1])
      .range([innerHeight, 0]);

    // Create line generator
    const line = d3
      .line<{ periodIndex: number; netMigration: number }>()
      .x(d => xScale(d.periodIndex))
      .y(d => yScale(d.netMigration))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues(d3.range(data.length))
        .tickFormat((i: any) => data[i]?.period || '')
      )
      .selectAll("text")
      .style("font-weight", "bold")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Format y-axis values to thousands (k)
    const formatYAxis = (d: d3.NumberValue) => {
      const value = Math.abs(d.valueOf());
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
      .text("Net Migration (thousands)");

    // Add zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2")
      .attr("opacity", 0.5);

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
      .attr("cy", d => yScale(d.netMigration))
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
            Net Migration: ${d.netMigration >= 0 ? '+' : ''}${d.netMigration.toLocaleString()}
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

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth + 20}, 0)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(lineData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", d => d.color)
      .attr("stroke-width", 3)
      .attr("opacity", 0.8);

    legendItems
      .append("text")
      .attr("x", 25)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#000")
      .text(d => d.locationName);

    // Cleanup function to remove tooltip when component unmounts
    return () => {
      d3.selectAll(".net-migration-tooltip").remove();
    };
  }, [data, locations, width, height, getMoveInColor, getMoveOutColor]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default function MigrationAnalysisPageContent() {
  const theme = useTheme();
  const { isConnected } = useConnectivity();
  const inputRef = useRef<HTMLInputElement>(null);
  const isResettingRef = useRef(false);

  // Shared color functions for chart and legend
  const locationColors = d3.scaleOrdinal(d3.schemeCategory10);

  const getMoveInColor = useCallback((locationId: string) => {
    const baseColor = locationColors(locationId);
    return d3.color(baseColor)?.darker(0.3)?.toString() || baseColor;
  }, [locationColors]);

  const getMoveOutColor = useCallback((locationId: string) => {
    const baseColor = locationColors(locationId);
    return d3.color(baseColor)?.brighter(0.5)?.toString() || baseColor;
  }, [locationColors]);

  // Search and location state
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedForDeletion, setHighlightedForDeletion] = useState<number | null>(null);

  // Loading, error, and chart data state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<MigrationChartData | null>(null);

  // Time period selection state for targeted comparisons
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [periodSelectionMode, setPeriodSelectionMode] = useState(false);
  const [filteredChartData, setFilteredChartData] = useState<MigrationChartData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Time period state - initialized with empty values, will be populated from metadata
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [defaultDateRangeInitialized, setDefaultDateRangeInitialized] = useState(false);

  const searchResults = useLocationSearch(selectedLocations, searchQuery);

  // URL params hook for shareable URLs
  const { updateUrlWithLocations, clearUrlParams, getLocationsParam } = useUrlParams();

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

  // Load locations from URL on mount
  useEffect(() => {
    const loadFromUrl = async () => {
      if (isResettingRef.current || searchResults.isLoading || searchResults.allLocations.length === 0 || !defaultDateRangeInitialized) return;
      
      const locationsParam = getLocationsParam();
      
      if (locationsParam) {
        try {
          const decodedParam = decodeURIComponent(locationsParam);
          const uniqueIds = decodedParam.split(',').filter(id => id.trim() !== '');
          
          console.log('Migration Analysis: Loading locations from URL...', uniqueIds);
          const locations = uniqueIds
            .map(uniqueId => searchResults.allLocations.find(loc => loc.uniqueId === uniqueId))
            .filter((location): location is Location => location !== undefined);
          
          const currentUniqueIds = selectedLocations.map(loc => loc.uniqueId).sort();
          const urlUniqueIds = uniqueIds.sort();
          const locationsMatch = currentUniqueIds.length === urlUniqueIds.length && 
                                currentUniqueIds.every((id, index) => id === urlUniqueIds[index]);
          
          if (locations.length > 0 && !locationsMatch && dateRange.startDate && dateRange.endDate) {
            isResettingRef.current = true;
            
            setSelectedLocations(locations);
            setSearchQuery('');
            
            // Auto-execute query with loaded locations
            setIsLoading(true);
            setError(null);
            
            try {
              await loadMigrationData(locations, dateRange.startDate, dateRange.endDate);
              updateUrlWithLocations(locations);
            } catch (error) {
              console.error('Migration Analysis query failed after URL load:', error);
              setError(error instanceof Error ? error.message : 'Failed to load migration data');
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
  }, [getLocationsParam, searchResults.isLoading, searchResults.allLocations, defaultDateRangeInitialized, dateRange.startDate, dateRange.endDate]);

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
          
          // Use inclusive start date but exclusive end date to avoid off-by-one errors
          // This ensures that if end date is "2025-01-01", we don't include January 2025 data
          if (periodDate && periodDate >= selectedStartDate && periodDate < selectedEndDate) {
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
    updateUrlWithLocations(selectedLocations); // Update URL for sharing
  }, [selectedLocations, dateRange.startDate, dateRange.endDate, loadMigrationData, updateUrlWithLocations]);

  // Handle new search
  const handleNewSearch = useCallback(() => {
    setChartData(null);
    setSelectedLocations([]);
    setSearchQuery('');
    setHighlightedForDeletion(null);
    setError(null);
    clearUrlParams(); // Clear URL params on reset
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [clearUrlParams]);

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

      {/* Location Search Interface */}
        {!chartData && (
          <Box sx={{ px: 2, py: 1 }}>
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
          </Box>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Loading migration data...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box py={4}>
              <Typography variant="h6" color="error" gutterBottom>
                Error Loading Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Chart Display */}
        {chartData && !isLoading && !error && (
          <Box sx={{ px: 2, py: 2 }}>
            {/* Title Card */}
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
              <Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  Multi-province Migration Analysis
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                  Diverging Grouped Bars Comparison
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
                  Selected Locations
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {chartData.locations.map((location) => (
                    <Chip
                      key={location.uniqueId}
                      label={location.name}
                      color={location.type === 'province' ? 'primary' : location.type === 'district' ? 'secondary' : 'default'}
                      size="medium"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    />
                  ))}
                  <Chip
                    label={`${chartData.locations.length} location${chartData.locations.length > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      borderStyle: 'dashed'
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
                    Analysis Period:
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                    {formatDateRange(chartData.period.startDate, chartData.period.endDate)}
                  </Typography>
                </Box>

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
            </Paper>

            {/* Date Range Selector for changing periods after query execution */}
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
              <MigrationAnalysisDuration
                selectedStartDate={dateRange.startDate}
                selectedEndDate={dateRange.endDate}
                onDateRangeChange={handleDateRangeChange}
              />
            </Paper>

            <Box display="flex" gap={3} mb={3}>
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
                <DivergingBarChart
                  data={chartData.data}
                  locations={chartData.locations}
                  width={chartWidth}
                  height={chartHeight}
                  getMoveInColor={getMoveInColor}
                  getMoveOutColor={getMoveOutColor}
                />
              </Paper>

              {/* Legend Container */}
              <Paper
                elevation={0}
                sx={{
                  width: '350px',
                  p: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Legend
                  locations={chartData.locations}
                  getMoveInColor={getMoveInColor}
                  getMoveOutColor={getMoveOutColor}
                />
              </Paper>
            </Box>
          </Box>
        )}

        {/* Search Results - only show when no chart data */}
        {showSearchResults && !isLoading && !chartData && (
          <Box sx={{ px: 2, py: 2 }}>
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
          </Box>
        )}

        {/* Empty State */}
        {!chartData && !isLoading && !error && selectedLocations.length > 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box py={4} textAlign="center">
              <Typography variant="body1" color="text.secondary">
                Click &quot;Execute Query&quot; or press Shift+Enter to load migration data for the selected locations.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Net Migration Trends Line Chart */}
        {chartData && !isLoading && !error && (
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  Net Migration Trends
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Time series view of net migration for each location across all periods
                </Typography>
              </Box>

              <NetMigrationLineChart
                data={chartData.data}
                locations={chartData.locations}
                width={chartWidth}
                height={chartHeight}
                getMoveInColor={getMoveInColor}
                getMoveOutColor={getMoveOutColor}
              />
            </Paper>
          </Box>
        )}

        {/* Targeted Period Comparison Section */}
        {chartData && !isLoading && !error && (
          <Box sx={{ px: 2, py: 2, mt: 4 }}>
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
                  Targeted Period Comparison
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                  Select specific time periods for detailed comparison across the same locations
                </Typography>

                <Button
                  variant={periodSelectionMode ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setPeriodSelectionMode(!periodSelectionMode)}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  {periodSelectionMode ? 'Hide Period Selection' : 'Select Specific Periods'}
                </Button>
              </Box>

              {periodSelectionMode && (
                <Box sx={{ mb: 3 }}>
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
                    
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        fontSize: '14px',
                        minWidth: '100px'
                      }}
                    >
                      <option value="" disabled>Month</option>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                        <option key={month} value={month.toLowerCase()}>{month}</option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        fontSize: '14px',
                        minWidth: '100px'
                      }}
                    >
                      <option value="" disabled>Year</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year.toString().slice(-2)}>{year}</option>
                      ))}
                    </select>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (selectedMonth && selectedYear) {
                          const periodId = `${selectedMonth}${selectedYear}`;
                          
                          // Check if this period exists in the available data by comparing the formatted periodId
                          // to the display periods already stored in chartData.data
                          const periodExists = chartData?.data.some(entry => formatTimePeriodForDisplay(periodId) === entry.period);
                          
                          if (!periodExists) {
                            alert(`Period ${formatTimePeriodForDisplay(periodId)} is not available in the current data range.`);
                            return;
                          }
                          
                          if (!selectedPeriods.includes(periodId)) {
                            setSelectedPeriods(prev => [...prev, periodId]);
                          }
                          // Reset selects
                          setSelectedMonth('');
                          setSelectedYear('');
                        }
                      }}
                      disabled={!selectedMonth || !selectedYear}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
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
                          // Filter chart data to only selected periods
                          const filteredData = {
                            ...chartData,
                            data: chartData.data.filter(entry => {
                              // Find the period ID that corresponds to this display period
                              // We need to check if any of the selected periods match this entry's period
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
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
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
                        }}
                        sx={{
                          borderRadius: 1.5,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Clear Comparison
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
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

                  <DivergingBarChart
                    data={filteredChartData.data}
                    locations={filteredChartData.locations}
                    width={chartWidth}
                    height={chartHeight}
                    getMoveInColor={getMoveInColor}
                    getMoveOutColor={getMoveOutColor}
                  />
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* Citation Footer - only show when visualizations are rendered */}
      {chartData && !isLoading && !error && (
        <CitationFooter />
      )}
    </Box>
  );
}