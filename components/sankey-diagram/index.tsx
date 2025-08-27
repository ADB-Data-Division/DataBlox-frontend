'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { MigrationResponse } from '@/app/services/api/types';

interface SankeyDiagramProps {
  migrationData: MigrationResponse | null;
  selectedTimePeriod?: string;
  width?: number;
  height?: number;
}

interface SankeyNodeData {
  id: string;
  name: string;
  color: string;
}

interface SankeyLinkData {
  source: string | SankeyNodeData;
  target: string | SankeyNodeData;
  value: number;
  flowCount: number;
}

export default function SankeyDiagram({ 
  migrationData, 
  selectedTimePeriod, 
  width = 900, 
  height = 600 
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Transform migration data into Sankey format
  const sankeyData = useMemo(() => {
    console.log('🔍 Sankey: Checking migration data:', {
      migrationData: !!migrationData,
      flows: migrationData?.flows?.length || 0,
      data: migrationData?.data?.length || 0,
      timePeriods: migrationData?.time_periods?.length || 0,
      selectedTimePeriod,
      flowsData: migrationData?.flows
    });

    if (!migrationData?.flows || migrationData.flows.length === 0) {
      console.log('🚫 Sankey: No flows data available');
      return null;
    }

    // Use first time period if none specified or if selected one doesn't exist
    const availableTimePeriodIds = migrationData.time_periods.map(tp => tp.id);
    const timePeriodId = (selectedTimePeriod && availableTimePeriodIds.includes(selectedTimePeriod)) 
      ? selectedTimePeriod 
      : migrationData.time_periods[0]?.id;
    
    console.log('⏰ Time period selection:', {
      selectedTimePeriod,
      availableTimePeriodIds,
      usingTimePeriod: timePeriodId
    });
    
    if (!timePeriodId) return null;

    // Filter flows for the selected time period
    const relevantFlows = migrationData.flows.filter(flow => 
      flow.time_period_id === timePeriodId && flow.flow_count > 0
    );

    console.log('📊 Sankey: Filtering flows:', {
      timePeriodId,
      totalFlows: migrationData.flows?.length || 0,
      relevantFlows: relevantFlows.length,
      availableTimePeriods: migrationData.time_periods?.map(tp => tp.id),
      flowTimePeriods: [...new Set(migrationData.flows?.map(f => f.time_period_id) || [])],
      sampleFlow: relevantFlows[0]
    });

    if (relevantFlows.length === 0) {
      console.log('🚫 Sankey: No flows for time period:', timePeriodId);
      return null;
    }

    // Create nodes from unique locations
    const locationMap = new Map<string, { id: string; name: string }>();
    
    relevantFlows.forEach(flow => {
      locationMap.set(flow.origin.id, {
        id: flow.origin.id,
        name: flow.origin.name
      });
      locationMap.set(flow.destination.id, {
        id: flow.destination.id,
        name: flow.destination.name
      });
    });

    // Create color scale for nodes based on their position
    const colorScale = d3.scaleOrdinal(d3.schemeSet3);
    
    const nodes: SankeyNodeData[] = Array.from(locationMap.values()).map((location, index) => ({
      ...location,
      color: colorScale(location.name)
    }));

    // Create links from flows
    const links: SankeyLinkData[] = relevantFlows.map(flow => ({
      source: flow.origin.id,
      target: flow.destination.id,
      value: flow.flow_count,
      flowCount: flow.flow_count
    }));

    // Validate that all source and target nodes exist
    const nodeIds = new Set(nodes.map(n => n.id));
    const validLinks = links.filter(link => {
      const sourceExists = nodeIds.has(link.source as string);
      const targetExists = nodeIds.has(link.target as string);
      if (!sourceExists) console.warn(`Missing source node: ${link.source}`);
      if (!targetExists) console.warn(`Missing target node: ${link.target}`);
      return sourceExists && targetExists;
    });

    console.log('🔗 Link validation:', {
      totalLinks: links.length,
      validLinks: validLinks.length,
      nodeIds: Array.from(nodeIds)
    });

    return { nodes, links: validLinks };
  }, [migrationData, selectedTimePeriod]);

  useEffect(() => {
    if (!sankeyData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 20, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create Sankey generator
    const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);

    // Generate Sankey layout - need to ensure nodes and links reference each other correctly
    const graphData = {
      nodes: sankeyData.nodes.map(d => ({ ...d })),
      links: sankeyData.links.map(d => ({ ...d }))
    };
    
    console.log('🔧 Sankey generator input:', {
      nodes: graphData.nodes.map(n => ({ id: n.id, name: n.name })),
      links: graphData.links.map(l => ({ source: l.source, target: l.target, value: l.value }))
    });
    
    const sankeyGraph = sankeyGenerator(graphData);
    const { nodes, links } = sankeyGraph;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale for links
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add links
    const link = g.append('g')
      .selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal())
      .style('fill', 'none')
      .style('stroke', (d: any) => colorScale((d.source as any).name))
      .style('stroke-opacity', 0.4)
      .style('stroke-width', (d: any) => Math.max(1, d.width || 0))
      .style('cursor', 'pointer');

    // Add link hover effects
    link
      .on('mouseover', function(event, d) {
        // Highlight the link
        d3.select(this)
          .style('stroke-opacity', 0.8)
          .style('stroke-width', Math.max(2, (d.width || 0) + 2));
        
        // Highlight connected nodes
        g.selectAll('.node rect')
          .style('fill-opacity', function(this: any) {
            const nodeData = d3.select(this.parentNode).datum() as any;
            return (nodeData && (nodeData.id === (d.source as any).id || nodeData.id === (d.target as any).id)) ? 1 : 0.3;
          });
        
        // Dim other links
        g.selectAll('.link')
          .style('stroke-opacity', function(this: any) {
            const linkData = d3.select(this).datum();
            return linkData === d ? 0.8 : 0.1;
          });
        
        // Show tooltip
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${Math.min(mouseX, innerWidth - 200)}, ${Math.max(mouseY - 30, 20)})`);
        
        const tooltipRect = tooltip.append('rect')
          .style('fill', 'rgba(0, 0, 0, 0.9)')
          .style('rx', 6)
          .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
        
        const tooltipText = tooltip.append('text')
          .style('fill', 'white')
          .style('font-size', '13px')
          .style('font-family', 'sans-serif')
          .attr('x', 12)
          .attr('y', 20)
          .text(`${(d.source as any).name} → ${(d.target as any).name}: ${(d as any).flowCount.toLocaleString()} people`);
        
        const bbox = tooltipText.node()?.getBBox();
        if (bbox) {
          tooltipRect
            .attr('width', bbox.width + 24)
            .attr('height', bbox.height + 16)
            .attr('x', 0)
            .attr('y', 4);
        }
      })
      .on('mouseout', function(event, d) {
        // Restore link styles
        d3.select(this)
          .style('stroke-opacity', 0.4)
          .style('stroke-width', Math.max(1, (d as any).width || 0));
        
        // Restore node styles
        g.selectAll('.node rect').style('fill-opacity', 1);
        
        // Restore all link opacity
        g.selectAll('.link').style('stroke-opacity', 0.4);
        
        // Remove tooltip
        g.selectAll('.tooltip').remove();
      });

    // Add nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Node rectangles
    node.append('rect')
      .attr('height', (d: any) => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', sankeyGenerator.nodeWidth())
      .style('fill', (d: any) => d.color)
      .style('stroke', '#000')
      .style('stroke-width', 0.5)
      .style('rx', 2)
      .on('mouseover', function(event, d) {
        // Highlight the node
        d3.select(this)
          .style('fill-opacity', 0.8)
          .style('stroke-width', 2);
        
        // Highlight connected links
        g.selectAll('.link')
          .style('stroke-opacity', function(this: any) {
            const linkData = d3.select(this).datum() as any;
            return (linkData && ((linkData.source as any).id === d.id || (linkData.target as any).id === d.id)) ? 0.8 : 0.1;
          });
        
        // Show node tooltip
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        const inFlow = links.filter(l => (l.target as any).id === d.id).reduce((sum, l) => sum + (l as any).flowCount, 0);
        const outFlow = links.filter(l => (l.source as any).id === d.id).reduce((sum, l) => sum + (l as any).flowCount, 0);
        
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${Math.min(mouseX, innerWidth - 200)}, ${Math.max(mouseY - 50, 20)})`);
        
        const tooltipRect = tooltip.append('rect')
          .style('fill', 'rgba(0, 0, 0, 0.9)')
          .style('rx', 6)
          .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
        
        const tooltipGroup = tooltip.append('g');
        
        tooltipGroup.append('text')
          .style('fill', 'white')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('font-family', 'sans-serif')
          .attr('x', 12)
          .attr('y', 18)
          .text(d.name);
        
        tooltipGroup.append('text')
          .style('fill', 'lightgray')
          .style('font-size', '12px')
          .style('font-family', 'sans-serif')
          .attr('x', 12)
          .attr('y', 35)
          .text(`In: ${inFlow.toLocaleString()} people`);
        
        tooltipGroup.append('text')
          .style('fill', 'lightgray')
          .style('font-size', '12px')
          .style('font-family', 'sans-serif')
          .attr('x', 12)
          .attr('y', 50)
          .text(`Out: ${outFlow.toLocaleString()} people`);
        
        const bbox = tooltipGroup.node()?.getBBox();
        if (bbox) {
          tooltipRect
            .attr('width', bbox.width + 24)
            .attr('height', bbox.height + 16)
            .attr('x', 0)
            .attr('y', 4);
        }
      })
      .on('mouseout', function() {
        // Restore node styles
        d3.select(this)
          .style('fill-opacity', 1)
          .style('stroke-width', 0.5);
        
        // Restore all link opacity
        g.selectAll('.link').style('stroke-opacity', 0.4);
        
        // Remove tooltip
        g.selectAll('.tooltip').remove();
      });

    // Node labels
    node.append('text')
      .attr('x', (d: any) => (d.x0 || 0) < innerWidth / 2 ? sankeyGenerator.nodeWidth() + 6 : -6)
      .attr('y', (d: any) => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .style('font-family', 'sans-serif')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d: any) => d.name);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Migration Flow Sankey Diagram');

  }, [sankeyData, width, height]);

  if (!sankeyData) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: height,
        border: '1px dashed #ccc',
        borderRadius: 1
      }}>
        <Typography variant="body2" color="text.secondary">
          No migration flow data available for Sankey diagram
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Hover over nodes and flows to see migration details. Flow thickness represents migration volume.
      </Typography>
    </Box>
  );
}