'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Container, useTheme, Paper, CircularProgress } from '@mui/material';
import VisualizationToolbar, { VisualizationFilters } from '@/components/visualization-toolbar/visualization-toolbar';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';
import { Filter, ProvinceFilter } from '@/app/services/data-loader/data-loader-interface';
import { transformFilter } from '@/app/services/filter/transform';
import { MigrationData, processMigrationData } from '@/app/services/data-loader/process-migration-data';
import ChordTooltip from '@/components/chord-tooltip/chord-tooltip';
import { TooltipData } from '@/components/chord-tooltip/types';
interface IndustryMigrationProps {
  title?: string;
  darkMode?: boolean;
}

const IndustryMigration: React.FC<IndustryMigrationProps> = ({ 
  title = "ADB Data Visualization",
  darkMode = false
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  
  // State for migration data
  const [migrationData, setMigrationData] = useState<MigrationData>({
    matrix: [],
    names: []
  });
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    source: undefined,
    destination: undefined,
    sourceToDestValue: undefined,
    sourceToDestPercent: undefined,
    destToSourceValue: undefined,
    destToSourcePercent: undefined,
    sourceColor: undefined,
    destColor: undefined,
    x: 0,
    y: 0
  });
  
  // Determine text color based on mode
  const textColor = darkMode ? '#ffffff' : '#333333';
  const backgroundColor = darkMode ? '#121212' : 'transparent';

  // Function to draw the chart
  const drawChart = useCallback(() => {
    if (!chartRef.current || migrationData.matrix.length === 0 || migrationData.names.length === 0) return;
    
    // Clear any existing SVG
    d3.select(chartRef.current).selectAll("svg").remove();
    
    const data = migrationData.matrix;
    const names = migrationData.names;
    const colors = d3.schemeCategory10;

    function groupTicks(d: any, step: number) {
      const k = (d.endAngle - d.startAngle) / d.value;
      return d3.range(0, d.value, step).map(value => {
        return { 
          value: value, 
          angle: value * k + d.startAngle,
          isMajor: value % (step * 5) === 0 // Mark every 5th tick as major
        };
      });
    }

    const width = 480;
    const height = 320;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 10;
    const tickStep = d3.tickStep(0, d3.sum(data.flat()), 100);
    const totalValue = d3.sum(data.flat());
    const formatValue = (value: number) => d3.format(".1%")(value / totalValue);

    const chord = d3.chord()
      .padAngle(10 / innerRadius)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
      .radius(innerRadius - 1)
      .padAngle(1 / innerRadius);

    const color = d3.scaleOrdinal(names, colors);

    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", `width: 100%; height: auto; font: 10px sans-serif; color: ${textColor}; background-color: ${backgroundColor};`);

    const chords = chord(data);

    // Helper function to show tooltip
    const showTooltip = (event: MouseEvent, d: any) => {
      const offset = 10;
      
      // Calculate percentages
      const sourceToDestPercent = Math.round(d.source.value / totalValue * 100);
      const destToSourcePercent = d.source.index !== d.target.index ? 
        Math.round(d.target.value / totalValue * 100) : undefined;
      
      setTooltip({
        visible: true,
        source: names[d.source.index],
        destination: names[d.target.index],
        sourceToDestValue: d.source.value,
        sourceToDestPercent: sourceToDestPercent,
        destToSourceValue: d.source.index !== d.target.index ? d.target.value : undefined,
        destToSourcePercent: destToSourcePercent,
        sourceColor: color(names[d.source.index]) as string,
        destColor: color(names[d.target.index]) as string,
        x: event.clientX + offset,
        y: event.clientY + offset
      });
    };
    
    // Helper function to hide tooltip
    const hideTooltip = () => {
      setTooltip((prev: any) => ({ ...prev, visible: false }));
    };

    const group = svg.append("g")
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    group.append("path")
      .attr("fill", d => color(names[d.index]) as string)
      .attr("d", arc as any)
      .on("mouseover", function(event, d) {
        // Calculate the total value for this group
        const totalValue = d.value;
        const totalPercent = Math.round((totalValue / d3.sum(data.flat())) * 100);
        
        // Show a special tooltip for group totals
        setTooltip({
          visible: true,
          source: names[d.index],
          destination: "All provinces", // or "Total"
          sourceToDestValue: totalValue,
          sourceToDestPercent: totalPercent,
          sourceColor: color(names[d.index]) as string,
          destColor: undefined,
          x: event.clientX + 10,
          y: event.clientY + 10
        });
        
        // Optional: Highlight related chords
        svg.selectAll(".chord")
          .filter((c: any) => c.source.index === d.index || c.target.index === d.index)
          .attr("opacity", 1);
          
        svg.selectAll(".chord")
          .filter((c: any) => c.source.index !== d.index && c.target.index !== d.index)
          .attr("opacity", 0.1);
      })
      .on("mouseout", function() {
        // Hide tooltip and restore opacity
        setTooltip((prev: any) => ({ ...prev, visible: false }));
        svg.selectAll(".chord").attr("opacity", 0.8);
      })
      .on("mousemove", function(event) {
        // Update tooltip position
        setTooltip((prev: any) => ({
          ...prev,
          x: event.clientX + 10,
          y: event.clientY + 10
        }));
      });

    group.append("text")
      .each(d => (d as any).angle = (d.startAngle + d.endAngle) / 2)
      .attr("dy", "0.35em")
      .attr("transform", d => `
        rotate(${((d as any).angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 5})
        ${(d as any).angle > Math.PI ? "rotate(180)" : ""}
      `)
      .attr("text-anchor", d => (d as any).angle > Math.PI ? "end" : null)
      .text(d => names[d.index])
      .style("fill", textColor);

    // group.append("title")
    //   .text(d => `${names[d.index]}\n${formatValue(d.value)} of total flow`);

    svg.append("g")
      .attr("fill-opacity", 0.8)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon as any)
      .attr("fill", d => color(names[d.source.index]) as string)
      .attr("stroke", d => d3.rgb(color(names[d.source.index]) as string).darker(0.1).toString())
      .on("mouseover", showTooltip as any)
      .on("mousemove", showTooltip as any)
      .on("mouseout", hideTooltip)
//       .append("title")
//       .text(d => `${names[d.source.index]} → ${names[d.target.index]}: ${d.source.value}
// ${names[d.target.index]} → ${names[d.source.index]}: ${d.target.value}`);

    const groupTick = group.append("g")
      .selectAll("g")
      .data(d => groupTicks(d, tickStep))
      .join("g")
      .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius},0)`);

    groupTick.append("line")
      .attr("stroke", textColor)
      .attr("stroke-opacity", d => d.isMajor ? 0.7 : 0.2)
      .attr("x2", d => d.isMajor ? 7 : 4);

    groupTick.filter(d => d.isMajor).append("text")
      .attr("x", 10)
      .attr("dy", ".35em")
      .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-20)" : null)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => d.value)
      .style("fill", textColor)
      .style("font-size", "8px");
  }, [migrationData, textColor, backgroundColor]);

  const handleVisualize = async (filters: VisualizationFilters) => {
    setLoading(true);
    setIsEmpty(true);
    
    try {
      const appliedFilters: Filter[] = transformFilter(filters);
      
      // Process and load data using the MigrationDataProcessor
      const migrationProcessor = new MigrationDataProcessor();
      await migrationProcessor.fetchData('/Jan20-Dec20_sparse.json');
      
      const data = await migrationProcessor.applyFilters(appliedFilters);
      
      if (data && data.length > 0) {
        const monthSelector = null;
        const processed = processMigrationData(data, monthSelector, appliedFilters);
        setMigrationData(processed);
        setIsEmpty(false);
        console.log('Visualization data loaded:', processed);
      } else {
        console.log('No data returned after applying filters');
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Draw the chart when migration data changes
  useEffect(() => {
    drawChart();
  }, [migrationData, drawChart]);

  const initialFilters: Partial<VisualizationFilters> = {
    visualizationType: 'chord',
    subaction: 'raw',
  };

  return (
    <Box sx={{ 
      bgcolor: darkMode ? 'background.paper' : 'transparent',
      color: darkMode ? 'text.primary' : 'inherit',
      position: 'relative', // For tooltip positioning
      width: '100%'
    }}>
      <VisualizationToolbar 
        onVisualize={handleVisualize}
        onFileUpload={(file) => console.log('File uploaded:', file.name)}
        onDataLoaded={(data) => console.log('Data loaded:', data)}
        darkMode={darkMode}
        subActionsAllowed={['raw']}
        initialFilters={initialFilters}
      />
      
      <Container sx={{ px: 2, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 4 }}>
            {isEmpty ? (
              <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
                Please select a dataset and apply filters to visualize industry migration data.
              </Typography>
            ) : (
              <div ref={chartRef} id="chart"></div>
            )}
          </Box>
        )}
      </Container>
      
      {/* Custom tooltip component */}
      <ChordTooltip {...tooltip} darkMode={darkMode} />
    </Box>
  );
};

export default IndustryMigration;