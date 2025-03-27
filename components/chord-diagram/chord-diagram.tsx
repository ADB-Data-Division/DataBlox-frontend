'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ChordDiagramProps } from './types';
import { calculatePercentage, createColorScale, groupTicks } from './utils';
import { TooltipData } from '../chord-tooltip/types';

const ChordDiagram: React.FC<ChordDiagramProps & { 
  onTooltipChange: (tooltipData: TooltipData | ((prevTooltip: TooltipData) => TooltipData)) => void 
}> = ({
  data,
  width = 480,
  height = 320,
  darkMode = false,
  onChordClick,
  colorScheme,
  onTooltipChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Determine text color based on mode
  const textColor = darkMode ? '#ffffff' : '#333333';
  const backgroundColor = darkMode ? '#121212' : 'transparent';

  useEffect(() => {
    if (!svgRef.current || data.matrix.length === 0 || data.names.length === 0) return;
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const matrix = data.matrix;
    const names = data.names;
    
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 10;
    const tickStep = d3.tickStep(0, d3.sum(matrix.flat()), 100);
    const totalValue = d3.sum(matrix.flat());
    
    // Configure chord diagram
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

    // Set up color scale
    const color = createColorScale(names, colorScheme);

    // Setup SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", `width: 100%; height: auto; font: 10px sans-serif; color: ${textColor}; background-color: ${backgroundColor};`);

    // Generate chords
    const chords = chord(matrix);

    // Helper function to show tooltip
    const showTooltip = (event: MouseEvent, d: any) => {
      const offset = 10;
      
      // Calculate percentages
      const sourceToDestPercent = calculatePercentage(d.source.value, totalValue);
      const destToSourcePercent = d.source.index !== d.target.index ? 
        calculatePercentage(d.target.value, totalValue) : undefined;
      
      onTooltipChange({
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
      onTooltipChange((prevTooltip: TooltipData) => ({ ...prevTooltip, visible: false }));
    };

    // Create chord groups
    const group = svg.append("g")
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    // Add arc paths for each group
    group.append("path")
      .attr("fill", d => color(names[d.index]) as string)
      .attr("d", arc as any)
      .on("mouseover", function(event, d) {
        // Calculate the total value for this group
        const totalGroupValue = d.value;
        const totalGroupPercent = calculatePercentage(totalGroupValue, totalValue);
        
        // Show a special tooltip for group totals
        onTooltipChange({
          visible: true,
          source: names[d.index],
          destination: "All provinces", // or "Total"
          sourceToDestValue: totalGroupValue,
          sourceToDestPercent: totalGroupPercent,
          sourceColor: color(names[d.index]) as string,
          destColor: undefined,
          x: event.clientX + 10,
          y: event.clientY + 10
        });
        
        // Highlight related chords
        svg.selectAll(".chord")
          .filter((c: any) => c.source.index === d.index || c.target.index === d.index)
          .attr("opacity", 1);
          
        svg.selectAll(".chord")
          .filter((c: any) => c.source.index !== d.index && c.target.index !== d.index)
          .attr("opacity", 0.1);
      })
      .on("mouseout", function() {
        // Hide tooltip and restore opacity
        onTooltipChange((prevTooltip: TooltipData) => ({ ...prevTooltip, visible: false }));
        svg.selectAll(".chord").attr("opacity", 0.8);
      })
      .on("mousemove", function(event) {
        // Update tooltip position
        onTooltipChange((prevTooltip: TooltipData) => ({
          ...prevTooltip,
          x: event.clientX + 10,
          y: event.clientY + 10
        }));
      })
      .on("click", function(event, d) {
        if (onChordClick) {
          onChordClick(names[d.index], "All");
        }
      });

    // Add labels for each group
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

    // Add ribbons (chords)
    svg.append("g")
      .attr("fill-opacity", 0.8)
      .attr("class", "chords")
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("class", "chord")
      .attr("d", ribbon as any)
      .attr("fill", d => color(names[d.source.index]) as string)
      .attr("stroke", d => d3.rgb(color(names[d.source.index]) as string).darker(0.1).toString())
      .attr("opacity", 0.8)
      .on("mouseover", showTooltip as any)
      .on("mousemove", showTooltip as any)
      .on("mouseout", hideTooltip)
      .on("click", function(event, d) {
        if (onChordClick) {
          onChordClick(names[d.source.index], names[d.target.index]);
        }
      });

    // Add ticks for each group
    const groupTick = group.append("g")
      .selectAll("g")
      .data(d => groupTicks(d, tickStep))
      .join("g")
      .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius},0)`);

    // Add tick lines
    groupTick.append("line")
      .attr("stroke", textColor)
      .attr("stroke-opacity", d => d.isMajor ? 0.7 : 0.2)
      .attr("x2", d => d.isMajor ? 7 : 4);

    // Add tick labels (only for major ticks)
    groupTick.filter(d => d.isMajor).append("text")
      .attr("x", 10)
      .attr("dy", ".35em")
      .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-20)" : null)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => d.value)
      .style("fill", textColor)
      .style("font-size", "8px");
      
  }, [data, width, height, darkMode, colorScheme, onChordClick, textColor, backgroundColor, onTooltipChange]);

  return (
    <svg 
      ref={svgRef} 
      width={width} 
      height={height} 
      style={{ maxWidth: '100%', display: 'block' }} 
    />
  );
};

export default ChordDiagram; 