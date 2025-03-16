'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Container, useTheme, Paper } from '@mui/material';
import VisualizationToolbar from '@/components/visualization-toolbar/visualization-toolbar';

// Updated tooltip interface
interface TooltipData {
  visible: boolean;
  source?: string;
  destination?: string;
  sourceToDestValue?: number;
  sourceToDestPercent?: number;
  destToSourceValue?: number;
  destToSourcePercent?: number;
  sourceColor?: string;
  destColor?: string;
  x: number;
  y: number;
}

interface IndustryMigrationProps {
  title?: string;
  darkMode?: boolean;
}

// Redesigned Tooltip component
const Tooltip: React.FC<TooltipData & { darkMode: boolean }> = ({ 
  visible, 
  source, 
  destination, 
  sourceToDestValue,
  sourceToDestPercent,
  destToSourceValue,
  destToSourcePercent,
  sourceColor,
  destColor,
  x, 
  y, 
  darkMode 
}) => {
  if (!visible || !source || !destination) return null;
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px)`,
        padding: '16px',
        borderRadius: '4px',
        width: '300px',
        zIndex: 1000,
        pointerEvents: 'none',
        backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        color: darkMode ? '#ffffff' : '#333333',
        transition: 'transform 0.1s ease-out',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Source to Destination Flow */}
        {sourceToDestValue !== undefined && sourceToDestPercent !== undefined && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5 }}>
              {sourceToDestValue.toLocaleString()} ({sourceToDestPercent}%)
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              width: '100%', 
              justifyContent: 'space-between' 
            }}>
              <Typography variant="body2" sx={{ color: sourceColor }}>
                {source}
              </Typography>
              <Box sx={{ 
                flex: 1, 
                height: '2px', 
                backgroundColor: sourceColor || (darkMode ? '#fff' : '#000'),
                mx: 1,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 0,
                  top: '-4px',
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: `8px solid ${sourceColor || (darkMode ? '#fff' : '#000')}`,
                }
              }} />
              <Typography variant="body2" sx={{ color: destColor }}>
                {destination}
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Destination to Source Flow */}
        {destToSourceValue !== undefined && destToSourcePercent !== undefined && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
            <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5 }}>
              {destToSourceValue.toLocaleString()} ({destToSourcePercent}%)
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              width: '100%', 
              justifyContent: 'space-between' 
            }}>
              <Typography variant="body2" sx={{ color: destColor }}>
                {destination}
              </Typography>
              <Box sx={{ 
                flex: 1, 
                height: '2px', 
                backgroundColor: destColor || (darkMode ? '#fff' : '#000'),
                mx: 1,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '-4px',
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderRight: `8px solid ${destColor || (darkMode ? '#fff' : '#000')}`,
                }
              }} />
              <Typography variant="body2" sx={{ color: sourceColor }}>
                {source}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

const IndustryMigration: React.FC<IndustryMigrationProps> = ({ 
  title = "ADB Data Visualization",
  darkMode = false
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  
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

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clear any existing SVG
    d3.select(chartRef.current).selectAll("svg").remove();
    
    // Sample data structure
    const data = [
      [0, 5871, 8916, 2868],
      [1951, 0, 2060, 6171],
      [8010, 16145, 0, 8045],
      [1013, 990, 940, 0]
    ];

    const names = ["Agriculture", "Industrial", "Service", "Migrant"];
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
        x: event.pageX + 10,
        y: event.pageY + 10
      });
    };

    // Helper function to hide tooltip
    const hideTooltip = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    // Draw the ribbons with standard D3 ribbon
    const ribbons = svg.append("g")
      .attr("fill-opacity", 0.8)
      .selectAll("path")
      .data(chords)
      .join("path")
      .style("mix-blend-mode", darkMode ? "screen" : "multiply")
      .attr("fill", d => color(names[d.source.index]))
      .attr("d", ribbon as any)
      .attr("class", d => `chord chord-source-${d.source.index} chord-target-${d.target.index}`)
      .on("mouseover", function(event, d) {
        // Fade all ribbons to 5% opacity
        ribbons.transition().duration(200).attr("fill-opacity", 0.05);
        
        // Highlight only this ribbon
        d3.select(this).transition().duration(200).attr("fill-opacity", 0.8);
        
        showTooltip(event, d);
      })
      .on("mouseout", function() {
        // Restore all ribbons to original opacity
        ribbons.transition().duration(200).attr("fill-opacity", 0.8);
        hideTooltip();
      })
      .on("mousemove", function(event, d) {
        showTooltip(event, d);
      });

    // Then draw the groups
    const group = svg.append("g")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    // Draw the outer arcs with hover effects
    group.append("path")
      .attr("fill", d => color(names[d.index]))
      .attr("d", arc as any)
      .attr("class", d => `group-${d.index}`)
      .on("mouseover", function(event, d) {
        // Fade all ribbons to 5% opacity
        ribbons.transition().duration(200).attr("fill-opacity", 0.05);
        
        // Highlight ribbons connected to this group
        ribbons.filter(c => c.source.index === d.index || c.target.index === d.index)
          .transition().duration(200).attr("fill-opacity", 0.8);
          
        // For group hover, we'll show a different tooltip
        setTooltip({
          visible: true,
          source: names[d.index],
          destination: "All sectors",
          sourceToDestValue: d.value,
          sourceToDestPercent: Math.round(d.value / totalValue * 100),
          sourceColor: color(names[d.index]) as string,
          destColor: "#888888",
          x: event.pageX + 10,
          y: event.pageY + 10
        });
      })
      .on("mouseout", function() {
        // Restore all ribbons to original opacity
        ribbons.transition().duration(200).attr("fill-opacity", 0.8);
        hideTooltip();
      })
      .on("mousemove", function(event, d) {
        // Update tooltip position on mouse move
        setTooltip(prev => ({
          ...prev,
          x: event.pageX + 10,
          y: event.pageY + 10
        }));
      });

    const groupTick = group.append("g")
      .selectAll("g")
      .data(d => groupTicks(d, tickStep))
      .join("g")
      .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius},0)`);

    groupTick.append("line")
      .attr("stroke", textColor)
      .attr("x2", d => d.isMajor ? 10 : 6) // Longer line for major ticks
      .attr("stroke-width", d => d.isMajor ? 2 : 1); // Thicker line for major ticks

    // Only add text labels to major ticks
    groupTick.filter(d => d.isMajor)
      .append("text")
      .attr("x", 12) // Moved slightly further out
      .attr("dy", "0.35em")
      .attr("fill", textColor)
      .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-24)" : null)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => formatValue(d.value));

    group.select("text")
      .attr("font-weight", "bold")
      .attr("fill", textColor)
      .text(function(d) {
        // Use optional chaining and type assertion for SVGElement
        return (this as SVGTextElement)?.getAttribute("text-anchor") === "end"
          ? `↑ ${names[d.index]}`
          : `${names[d.index]} ↓`;
      })
      .attr("style", `font: 9px sans-serif;`);

  }, [darkMode, textColor, backgroundColor]);

  return (
    <Box sx={{ 
      bgcolor: darkMode ? 'background.paper' : 'transparent',
      color: darkMode ? 'text.primary' : 'inherit',
      position: 'relative', // For tooltip positioning
      width: '100%'
    }}>
      <VisualizationToolbar onVisualize={() => {}} />
      <Container sx={{ px: 2, py: 2 }}>
        <Box sx={{ display: 'grid', gap: 4 }}>
          <div ref={chartRef} id="chart"></div>
        </Box>
      </Container>
      
      {/* Custom tooltip component */}
      <Tooltip {...tooltip} darkMode={darkMode} />
    </Box>
  );
};

export default IndustryMigration;