'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { MigrationResponse } from '@/app/services/api/types';

interface SankeyDiagramProps {
  apiResponse: MigrationResponse | null;
}

interface SankeyNodeData {
  id: string;
  name: string;
  color: string;
  layer: number; // 0=year, 1=source, 2=destination
  sortKey?: string; // For sorting nodes within their layer
}

interface SankeyLinkData {
  source: SankeyNodeData;
  target: SankeyNodeData;
  value: number;
  flowCount: number;
  year?: string;
  monthBreakdown?: Array<{ month: string; count: number }>; // For tooltip details
}

export default function SankeyDiagram({ 
  apiResponse
}: SankeyDiagramProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 1200, height: 700 });

  // Transform API response into simplified Sankey data format
  // Year → Source Location → Destination Location (aggregated across months)
  const sankeyData = useMemo(() => {
    if (!apiResponse || !apiResponse.flows || apiResponse.flows.length === 0) {
      return null;
    }

    console.log('🔧 Processing simplified Sankey data:', {
      totalFlows: apiResponse.flows.length,
      timePeriods: apiResponse.time_periods.length,
      timePeriodsDetail: apiResponse.time_periods.map(p => ({
        id: p.id,
        start: p.start_date,
        year: new Date(p.start_date).getFullYear()
      }))
    });

    const nodes: SankeyNodeData[] = [];
    const links: SankeyLinkData[] = [];
    const nodeMap = new Map<string, SankeyNodeData>();
    
    const yearColor = '#1f77b4';
    const sourceColor = '#2ca02c';
    const destColor = '#d62728';

    // Helper to get or create a node
    const getOrCreateNode = (id: string, name: string, layer: number, color: string, sortKey?: string): SankeyNodeData => {
      if (!nodeMap.has(id)) {
        const node: SankeyNodeData = { id, name, color, layer, sortKey };
        nodeMap.set(id, node);
        nodes.push(node);
      }
      return nodeMap.get(id)!;
    };

    // Group flows by year
    const flowsByYear = new Map<number, typeof apiResponse.flows>();
    apiResponse.flows.forEach(flow => {
      const period = apiResponse.time_periods.find(p => p.id === flow.time_period_id);
      if (!period) return;
      
      const year = new Date(period.start_date).getFullYear();
      if (!flowsByYear.has(year)) {
        flowsByYear.set(year, []);
      }
      flowsByYear.get(year)!.push(flow);
    });

    // Sort years chronologically
    const sortedYears = Array.from(flowsByYear.keys()).sort();

    console.log('📅 Years detected in data:', {
      years: sortedYears,
      flowCountByYear: Object.fromEntries(
        sortedYears.map(y => [y, flowsByYear.get(y)!.length])
      )
    });

    // Process each year
    sortedYears.forEach(year => {
      const yearFlows = flowsByYear.get(year)!;
      
      // Layer 0: Year node
      const yearNode = getOrCreateNode(`year-${year}`, `${year}`, 0, yearColor, `${year}`);

      // Aggregate flows by source and destination within this year
      const yearSourceDestFlows = new Map<string, Map<string, { count: number; monthBreakdown: Map<string, number> }>>();
      
      yearFlows.forEach(flow => {
        if (flow.origin.id === flow.destination.id) return; // Skip self-loops
        
        const sourceKey = `${flow.origin.id}|${flow.origin.name}`;
        const destKey = `${flow.destination.id}|${flow.destination.name}`;
        
        if (!yearSourceDestFlows.has(sourceKey)) {
          yearSourceDestFlows.set(sourceKey, new Map());
        }
        
        const destMap = yearSourceDestFlows.get(sourceKey)!;
        if (!destMap.has(destKey)) {
          destMap.set(destKey, { count: 0, monthBreakdown: new Map() });
        }
        
        const destData = destMap.get(destKey)!;
        destData.count += flow.flow_count;
        
        // Track month breakdown
        const period = apiResponse.time_periods.find(p => p.id === flow.time_period_id);
        if (period) {
          const month = new Date(period.start_date).toLocaleString('default', { month: 'short' });
          destData.monthBreakdown.set(month, (destData.monthBreakdown.get(month) || 0) + flow.flow_count);
        }
      });

      // Create nodes and links for this year
      yearSourceDestFlows.forEach((destMap, sourceKey) => {
        const [sourceId, sourceName] = sourceKey.split('|');
        
        // Layer 1: Source node
        const sourceNode = getOrCreateNode(
          `source-${year}-${sourceId}`,
          sourceName,
          1,
          sourceColor,
          `${year}-${sourceName}`
        );

        // Create year → source link
        const totalSourceFlow = Array.from(destMap.values()).reduce((sum, d) => sum + d.count, 0);
        links.push({
          source: yearNode,
          target: sourceNode,
          value: totalSourceFlow,
          flowCount: totalSourceFlow,
          year: `${year}`
        });

        // Create source → destination links
        destMap.forEach((destData, destKey) => {
          const [destId, destName] = destKey.split('|');
          
          // Layer 2: Destination node
          const destNode = getOrCreateNode(
            `dest-${year}-${destId}`,
            destName,
            2,
            destColor,
            `${year}-${destName}`
          );

          // Convert month breakdown to array
          const monthBreakdown = Array.from(destData.monthBreakdown.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => {
              const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
            });

          links.push({
            source: sourceNode,
            target: destNode,
            value: destData.count,
            flowCount: destData.count,
            year: `${year}`,
            monthBreakdown
          });
        });
      });
    });

    console.log('🎨 Simplified Sankey processed:', {
      totalNodes: nodes.length,
      totalLinks: links.length,
      nodesByLayer: {
        years: nodes.filter(n => n.layer === 0).length,
        sources: nodes.filter(n => n.layer === 1).length,
        destinations: nodes.filter(n => n.layer === 2).length
      }
    });

    if (nodes.length === 0 || links.length === 0) {
      console.warn('⚠️ No valid data for Sankey');
      return null;
    }

    return { nodes, links };
  }, [apiResponse]);

  // Handle responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = Math.max(700, Math.min(800, containerWidth * 0.6)); // Responsive height
        setDimensions({ width: containerWidth, height: containerHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!sankeyData || !svgRef.current) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 20, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create Sankey generator with vertical layout
    const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]])
      .nodeSort((a: any, b: any) => {
        // Sort by layer first
        if (a.layer !== b.layer) return a.layer - b.layer;
        
        // Within same layer, sort by sortKey (chronological for months, grouped for sources/dests)
        if (a.sortKey && b.sortKey) {
          return a.sortKey.localeCompare(b.sortKey);
        }
        
        // Fallback to name
        return a.name.localeCompare(b.name);
      });

    // Generate Sankey layout - d3-sankey requires node indices, not objects
    // First, create a clean copy of nodes
    const graphNodes = sankeyData.nodes.map(d => ({ ...d }));
    
    // Create a map to get node index by id
    const nodeIndexMap = new Map<string, number>();
    graphNodes.forEach((node, index) => {
      nodeIndexMap.set(node.id, index);
    });
    
    // Convert links to use node indices instead of objects
    const graphLinks = sankeyData.links
      .map(link => {
        const sourceIndex = nodeIndexMap.get(link.source.id);
        const targetIndex = nodeIndexMap.get(link.target.id);
        
        if (sourceIndex === undefined || targetIndex === undefined) {
          console.error('❌ Cannot find node index:', {
            sourceId: link.source.id,
            targetId: link.target.id,
            sourceIndex,
            targetIndex,
            availableNodes: Array.from(nodeIndexMap.keys())
          });
          return null;
        }
        
        return {
          source: sourceIndex,
          target: targetIndex,
          value: link.value,
          flowCount: link.flowCount
        };
      })
      .filter((link): link is NonNullable<typeof link> => link !== null); // Filter out invalid links
    
    const graphData = {
      nodes: graphNodes,
      links: graphLinks
    };
    
    console.log('🔧 Sankey generator input:', {
      totalNodes: graphData.nodes.length,
      totalLinks: graphData.links.length,
      nodesByLayer: {
        0: graphData.nodes.filter(n => n.layer === 0).map(n => n.name),
        1: graphData.nodes.filter(n => n.layer === 1).map(n => n.name),
        2: graphData.nodes.filter(n => n.layer === 2).map(n => n.name),
        3: graphData.nodes.filter(n => n.layer === 3).map(n => n.name)
      },
      sampleLinks: graphData.links.slice(0, 5).map((l: any) => ({
        source: l.source,
        target: l.target,
        value: l.value
      }))
    });
    
    // Try to generate the Sankey layout with error handling for circular links
    let sankeyGraph;
    try {
      sankeyGraph = sankeyGenerator(graphData as any);
    } catch (error) {
      console.error('❌ Sankey generation failed:', error);
      // Show error message in the SVG
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#666')
        .style('font-size', '14px')
        .text('Unable to generate diagram - please adjust your filters');
      return;
    }
    
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
      .on('mouseover', function(event: MouseEvent, d: any) {
        // Highlight the link
        d3.select(this)
          .style('stroke-opacity', 0.8)
          .style('stroke-width', Math.max(2, d.width || 0) + 2);
        
        // Highlight connected nodes
        g.selectAll('.node rect')
          .style('fill-opacity', function(this: any) {
            const nodeData = d3.select(this.parentNode).datum() as any;
            return (nodeData && (nodeData.id === d.source.id || nodeData.id === d.target.id)) ? 1 : 0.3;
          });
        
        // Dim other links
        g.selectAll('.link')
          .style('stroke-opacity', function(this: any) {
            const linkData = d3.select(this).datum();
            return linkData === d ? 0.8 : 0.1;
          });
        
        // Build tooltip with journey path and month breakdown
        let tooltipHtml = '';
        const linkMetadata = sankeyData.links.find(
          l => l.source.id === d.source.id && l.target.id === d.target.id
        );
        
        if (linkMetadata) {
          const sourceLayer = d.source.layer;
          const targetLayer = d.target.layer;
          
          if (sourceLayer === 0 && targetLayer === 1) {
            // Year → Source
            tooltipHtml = `<div style="font-weight: 600; margin-bottom: 6px;">${linkMetadata.year} → ${d.target.name}</div>`;
            tooltipHtml += `<div style="font-size: 12px;">Total: ${d.flowCount?.toLocaleString() || 'N/A'} people</div>`;
          } else if (sourceLayer === 1 && targetLayer === 2) {
            // Source → Destination (show month breakdown)
            tooltipHtml = `<div style="font-weight: 600; margin-bottom: 6px;">${linkMetadata.year}: ${d.source.name} → ${d.target.name}</div>`;
            tooltipHtml += `<div style="font-size: 12px; margin-bottom: 4px;">Total: ${d.flowCount?.toLocaleString() || 'N/A'} people</div>`;
            
            // Show month breakdown if available
            if (linkMetadata.monthBreakdown && linkMetadata.monthBreakdown.length > 0) {
              tooltipHtml += `<div style="font-size: 11px; color: #ccc; border-top: 1px solid #444; padding-top: 6px; margin-top: 4px;">`;
              tooltipHtml += `<div style="font-weight: 600; margin-bottom: 3px;">Monthly Breakdown:</div>`;
              linkMetadata.monthBreakdown.forEach(({ month, count }) => {
                tooltipHtml += `<div>${month}: ${count.toLocaleString()}</div>`;
              });
              tooltipHtml += `</div>`;
            }
          } else {
            tooltipHtml = `<div style="font-weight: 600;">${d.source.name} → ${d.target.name}</div>`;
            tooltipHtml += `<div style="font-size: 12px;">Total: ${d.flowCount?.toLocaleString() || 'N/A'} people</div>`;
          }
        } else {
          tooltipHtml = `<div style="font-weight: 600;">${d.source.name} → ${d.target.name}</div>`;
          tooltipHtml += `<div style="font-size: 12px;">Total: ${d.flowCount?.toLocaleString() || d.value?.toLocaleString() || 'N/A'} people</div>`;
        }
        
        // Show tooltip
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        
        // Calculate tooltip position to keep it within bounds
        // Reserve more space for edge cases
        const tooltipMaxWidth = 280;
        let tooltipX = mouseX + 10;
        let tooltipY = Math.max(mouseY - 40, 20);
        
        // Adjust X position if too close to right edge
        if (tooltipX + tooltipMaxWidth > innerWidth) {
          tooltipX = mouseX - tooltipMaxWidth - 10;
        }
        
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('pointer-events', 'none') // Prevent tooltip from interfering with mouse events
          .attr('transform', `translate(${tooltipX}, ${tooltipY})`);
        
        const tooltipRect = tooltip.append('rect')
          .style('fill', 'rgba(0, 0, 0, 0.92)')
          .style('rx', 8)
          .style('filter', 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))');
        
        const tooltipForeignObject = tooltip.append('foreignObject')
          .attr('width', tooltipMaxWidth)
          .attr('height', 300)
          .attr('pointer-events', 'none'); // Prevent pointer events on foreign object
        
        const tooltipDiv = tooltipForeignObject.append('xhtml:div')
          .style('color', 'white')
          .style('font-size', '13px')
          .style('font-family', 'sans-serif')
          .style('padding', '10px 12px')
          .style('line-height', '1.4')
          .style('pointer-events', 'none') // Prevent pointer events on div
          .style('background', 'transparent') // Ensure background is transparent
          .html(tooltipHtml);
        
        // Adjust tooltip size based on content
        requestAnimationFrame(() => {
          const divElement = tooltipDiv.node() as HTMLElement;
          if (divElement) {
            const height = divElement.offsetHeight;
            const width = Math.min(divElement.offsetWidth, tooltipMaxWidth - 24);
            tooltipForeignObject
              .attr('height', height + 4)
              .attr('width', width + 24);
            tooltipRect
              .attr('width', width + 24)
              .attr('height', height + 20)
              .attr('x', 0)
              .attr('y', 0);
          }
        });
      })
      .on('mouseout', function(event: MouseEvent, d: any) {
        // Restore link styles
        d3.select(this)
          .style('stroke-opacity', 0.4)
          .style('stroke-width', Math.max(1, d.width || 0));
        
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
      .on('mouseover', function(event: MouseEvent, d: any) {
        // Highlight the node
        d3.select(this)
          .style('fill-opacity', 0.8)
          .style('stroke-width', 2);
        
        // Highlight connected links
        g.selectAll('.link')
          .style('stroke-opacity', function(this: any) {
            const linkData = d3.select(this).datum() as any;
            return (linkData && (linkData.source.id === d.id || linkData.target.id === d.id)) ? 0.8 : 0.1;
          });
        
        // Show node tooltip
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        const inFlow = links.filter((l: any) => l.target.id === d.id).reduce((sum: number, l: any) => sum + l.flowCount, 0);
        const outFlow = links.filter((l: any) => l.source.id === d.id).reduce((sum: number, l: any) => sum + l.flowCount, 0);
        
        // Calculate tooltip position to keep it within bounds
        const tooltipMaxWidth = 200;
        let tooltipX = mouseX + 10;
        let tooltipY = Math.max(mouseY - 50, 20);
        
        // Adjust X position if too close to right edge
        if (tooltipX + tooltipMaxWidth > innerWidth) {
          tooltipX = mouseX - tooltipMaxWidth - 10;
        }
        
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('pointer-events', 'none') // Prevent tooltip from interfering with mouse events
          .attr('transform', `translate(${tooltipX}, ${tooltipY})`);
        
        const tooltipRect = tooltip.append('rect')
          .style('fill', 'rgba(0, 0, 0, 0.92)')
          .style('rx', 6)
          .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
        
        const tooltipGroup = tooltip.append('g')
          .attr('pointer-events', 'none'); // Prevent pointer events on group
        
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
        
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
          const bbox = tooltipGroup.node()?.getBBox();
          if (bbox) {
            tooltipRect
              .attr('width', bbox.width + 24)
              .attr('height', bbox.height + 16)
              .attr('x', 0)
              .attr('y', 4);
          }
        });
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

    // Add title with layer labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#666')
      .text('Migration Flow: Year → Source → Destination');

  }, [sankeyData, dimensions]);

  if (!sankeyData) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: dimensions.height,
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
    <Box ref={containerRef} sx={{ width: '100%', overflow: 'visible' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    </Box>
  );
}