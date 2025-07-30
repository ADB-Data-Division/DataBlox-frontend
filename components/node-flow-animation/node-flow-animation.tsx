"use client"
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Slider, Typography, Button, IconButton, Snackbar, Alert } from '@mui/material';
import { ContentCopy, Share } from '@mui/icons-material';
import { 
  generateThailandHexagonsFromCoordinates, 
  REGION_COLORS, 
  ThailandHexagon 
} from './thailand-map-data';

interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number; // radius of the circle
}

interface Connection {
  fromNodeId: string;
  toNodeId: string;
  toFlowRate: number; // normalized rate for "to" direction (negative multiplier)
  fromFlowRate: number; // normalized rate for "from" direction (positive multiplier)
  metadata: {
    absoluteToFlow: number;
    absoluteFromFlow: number;
    units?: string;
  };
}

interface MonthRange {
  start: number;
  end: number;
}

interface NodesVisualizationProps {
  width?: number;
  height?: number;
  nodes?: Node[];
  connections?: Connection[];
  curved?: boolean;
  onMonthRangeChange?: (monthRange: MonthRange) => void;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

// Custom hook to track container size
const useContainerSize = (ref: React.RefObject<HTMLDivElement>) => {
  const [size, setSize] = useState({ width: 960, height: 400 });

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.max(300, width), height: Math.max(400, height) });
      }
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
};

const NodeFlowAnimation: React.FC<NodesVisualizationProps> = ({ 
  width: propWidth, 
  height: propHeight,
  nodes,
  connections,
  curved = false,
  onMonthRangeChange,
  selectedPeriod,
  onPeriodChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to map period ID to month index
  // Since visualization starts from Jan 2021 (index 0 = Jan 2021)
  const mapPeriodToMonthIndex = (periodId: string): number => {
    switch (periodId) {
      case '2020-q1': return 0; // Jan 2021 (closest available)
      case '2020-q2': return 3; // Apr 2021  
      case '2020-q3': return 6; // Jul 2021
      case '2020-q4': return 9; // Oct 2021
      case '2020-all': return 0; // Default to first month for "All"
      default: return 0;
    }
  };

  // Helper function to map month index to period ID
  const mapMonthIndexToPeriod = (monthIndex: number): string => {
    if (monthIndex >= 0 && monthIndex <= 2) return '2020-q1';
    if (monthIndex >= 3 && monthIndex <= 5) return '2020-q2';
    if (monthIndex >= 6 && monthIndex <= 8) return '2020-q3';
    if (monthIndex >= 9 && monthIndex <= 11) return '2020-q4';
    return '2020-all';
  };

  // Month slider state (single month selection)
  // Initialize from selectedPeriod prop if provided
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return selectedPeriod ? mapPeriodToMonthIndex(selectedPeriod) : 0;
  });
  
  // Debounced month state for period changes
  const [debouncedMonth, setDebouncedMonth] = useState<number>(selectedMonth);
  
  // Track if this is the initial render to avoid unnecessary callback calls
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
  
  // Track the last period that was sent to the callback to prevent unnecessary calls
  const [lastCallbackPeriod, setLastCallbackPeriod] = useState<string | null>(() => {
    return selectedPeriod || null;
  });
  
  // Citation and sharing state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Generate monthly labels (spanning 24 months for flexibility)
  const generateMonthlyLabels = (): string[] => {
    const labels: string[] = [];
    const startDate = new Date(2021, 0, 1); // Start from Jan 2021
    
    for (let i = 0; i < 24; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + i);
      
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
      const year = currentDate.getFullYear();
      labels.push(`${monthName} ${year}`);
    }
    
    return labels;
  };

  const monthlyLabels = generateMonthlyLabels();

  // Debounce effect: Update debouncedMonth after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMonth(selectedMonth);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedMonth]);

  // Sync selectedMonth when selectedPeriod prop changes
  useEffect(() => {
    if (selectedPeriod) {
      const monthIndex = mapPeriodToMonthIndex(selectedPeriod);
      setSelectedMonth(monthIndex);
      setDebouncedMonth(monthIndex); // Also update debounced state immediately for external changes
      setLastCallbackPeriod(selectedPeriod); // Track the external period change
    }
  }, [selectedPeriod]);

  // Effect to mark end of initial render
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle debounced month changes - call callbacks only when period has actually changed
  useEffect(() => {
    if (isInitialRender) return;
    
    const periodId = mapMonthIndexToPeriod(debouncedMonth);
    
    // Only call onPeriodChange if the period has actually changed
    if (onPeriodChange && periodId !== lastCallbackPeriod) {
      onPeriodChange(periodId);
      setLastCallbackPeriod(periodId);
    }
    
    if (onMonthRangeChange) {
      onMonthRangeChange({
        start: debouncedMonth,
        end: debouncedMonth // Single month, so start and end are the same
      });
    }
  }, [debouncedMonth, onPeriodChange, onMonthRangeChange, isInitialRender, lastCallbackPeriod]);

  // Handle month change - only update visual state, callbacks handled by debounced effect
  const handleMonthChange = (event: Event, newValue: number | number[]) => {
    const month = newValue as number;
    setSelectedMonth(month);
    // Callbacks are now handled by the debounced effect above
  };

  // APA 7th Edition Citation
  const citationText = "Cordel, M., Smith, J., & Brown, A. (2025). Datablox: Thailand migration flow visualization. Asian Development Bank. Retrieved from " + (typeof window !== 'undefined' ? window.location.href : 'https://your-domain.com');

  // Copy citation to clipboard
  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setSnackbarMessage('Citation copied to clipboard!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to copy citation');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Copy page URL to clipboard
  const handleShareLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(url);
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to copy link');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Use container size if no width/height provided
  const containerSize = useContainerSize(containerRef);
  const width = propWidth || containerSize.width;
  const height = propHeight || containerSize.height;

  // Default data if none provided
  const defaultNodes: Node[] = [
    { id: 'bangkok', title: 'Bangkok', x: 180, y: 140, size: 25 }, // Central Thailand
    { id: 'chiangmai', title: 'Chiang Mai', x: 110, y: 50, size: 20 }, // Northern Thailand
    { id: 'khonkaen', title: 'Khon Kaen', x: 220, y: 90, size: 18 }, // Northeastern Thailand
    { id: 'songkhla', title: 'Songkhla', x: 130, y: 290, size: 22 } // Southern Thailand
  ];

  const defaultConnections: Connection[] = [
    { 
      fromNodeId: 'chiangmai', 
      toNodeId: 'bangkok',
      toFlowRate: 25, // Migration to Bangkok from Chiang Mai
      fromFlowRate: -8, // Return migration from Bangkok to Chiang Mai
      metadata: { absoluteToFlow: 250000, absoluteFromFlow: 80000, units: 'people/year' }
    },
    { 
      fromNodeId: 'khonkaen', 
      toNodeId: 'bangkok',
      toFlowRate: 30,
      fromFlowRate: -10,
      metadata: { absoluteToFlow: 300000, absoluteFromFlow: 100000, units: 'people/year' }
    },
    { 
      fromNodeId: 'songkhla', 
      toNodeId: 'bangkok',
      toFlowRate: 15,
      fromFlowRate: -12,
      metadata: { absoluteToFlow: 150000, absoluteFromFlow: 120000, units: 'people/year' }
    },
    { 
      fromNodeId: 'chiangmai', 
      toNodeId: 'khonkaen',
      toFlowRate: 5,
      fromFlowRate: -3,
      metadata: { absoluteToFlow: 50000, absoluteFromFlow: 30000, units: 'people/year' }
    }
  ];

  const activeNodes = nodes || defaultNodes;
  const activeConnections = connections || defaultConnections;

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);

    // Create main container group for zoom functionality
    const mainContainer = svg.append('g')
      .attr('class', 'main-container');

    // Set up zoom behavior with pan constraints
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.7, 10]) // Allow zoom from 70% to 1000% (prevents map from being too small)
      .translateExtent([[-500, -200], [width, height + 100]]) // Pan boundaries (with padding)
      .on('zoom', function(event) {
        mainContainer.attr('transform', event.transform);
        console.log("zoom: ", event.transform);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Calculate center position for Thailand map
    // Approximate Thailand map bounds (based on hexagon layout)
    const mapWidth = 300; // Approximate width of Thailand hexagon layout
    const mapHeight = 400; // Approximate height of Thailand hexagon layout
    
    // Center the map in the container
    const centerX = (width - mapWidth) / 2 + 50; // Add small offset for legend space
    const centerY = (height - mapHeight) / 2;
    
    // Set initial zoom to center content nicely
    const initialTransform = d3.zoomIdentity
      .translate(centerX, centerY) // Center translation
      .scale(1); // Initial scale

    svg.call(zoom.transform, initialTransform);

    // Thailand hexagonal map data
    const hexSize = 9; // Scaled down by 50% from 18
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    
    // Helper function to create hexagon path
    const createHexagonPath = (x: number, y: number, size: number) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        points.push(`${px},${py}`);
      }
      return `M${points.join('L')}Z`;
    };
    
    // Define Thailand regions with colors
    const regionColors = REGION_COLORS;

    // Generate ALL hexagons in the full grid for alignment purposes
    const allHexagons: Array<{row: number, col: number, x: number, y: number}> = [];
    const { cols, rows } = { cols: 24, rows: 34 }; // Reduced height for better Thailand proportions
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexWidth * 0.75; // Horizontal spacing for tessellation (removed base offset since it's handled by zoom)
        const y = row * hexHeight + (col % 2) * hexHeight * 0.5 + -70; // Proper tessellation offset (adjusted for zoom)
        
        allHexagons.push({ row, col, x, y });
      }
    }

    // Generate Thailand hexagons using the coordinate-based function
    const thailandHexagons = generateThailandHexagonsFromCoordinates(hexWidth, hexHeight, 0, 0); // Removed base offsets
    
    // Create a Set for quick lookup of Thailand coordinates
    const thailandCoordinates = new Set(
      thailandHexagons.map(hex => `${hex.row},${hex.col}`)
    );

    // Only show Thailand hexagons
    const visibleHexagons = allHexagons.filter(hex => thailandCoordinates.has(`${hex.row},${hex.col}`));

    // Create background group for Thailand map (now inside main container)
    const mapGroup = mainContainer.append('g')
      .attr('class', 'thailand-map');

    // Draw hexagonal shapes based on visibility filter
    mapGroup.selectAll('.hex-shape')
      .data(visibleHexagons)
      .enter()
      .append('path')
      .attr('class', 'hex-shape')
      .attr('d', d => createHexagonPath(d.x, d.y, hexSize))
      .attr('fill', 'transparent') // Blank fill
      .attr('stroke', d => {
        // Use blue stroke for Thailand hexagons, red for others
        const isThailand = thailandCoordinates.has(`${d.row},${d.col}`);
        return isThailand ? '#2563eb' : '#dc2626'; // Blue for Thailand, red for others
      })
      .attr('stroke-width', 1)
      .attr('opacity', 0.8);



    // Add legend (positioned relative to viewport, not zoomed content)
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 140}, 40)`);

    const legendData = [
      { region: 'North', color: regionColors.north },
      { region: 'Central', color: regionColors.central },
      { region: 'Northeast', color: regionColors.northeast },
      { region: 'East', color: regionColors.east },
      { region: 'West', color: regionColors.west },
      { region: 'South', color: regionColors.south }
    ];

    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const group = d3.select(this);
        
        group.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 6)
          .attr('fill', d.color);
          
        group.append('text')
          .attr('x', 15)
          .attr('y', 5)
          .text(d.region)
          .attr('font-size', '12px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('fill', '#374151');
      });

    // Add legend title
    legend.append('text')
      .attr('x', 0)
      .attr('y', -15)
      .text('THAILAND MAP')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#111827');

    // Define arrow markers for direction indicators
    const defs = svg.append('defs');
    
    // Arrow marker for "to" direction (blue)
    defs.append('marker')
      .attr('id', 'arrow-to')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#2563eb');

    // Arrow marker for "from" direction (red)
    defs.append('marker')
      .attr('id', 'arrow-from')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#dc2626');

    // Helper function to create offset paths between two points
    function createOffsetPath(x1: number, y1: number, x2: number, y2: number, offset: number, curved: boolean = false) {
      // Calculate perpendicular offset
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = -dy / length;
      const unitY = dx / length;
      
      const offsetX1 = x1 + unitX * offset;
      const offsetY1 = y1 + unitY * offset;
      const offsetX2 = x2 + unitX * offset;
      const offsetY2 = y2 + unitY * offset;

      if (curved) {
        // Create curved path with control point
        const midX = (offsetX1 + offsetX2) / 2 + unitX * offset * 2;
        const midY = (offsetY1 + offsetY2) / 2 + unitY * offset * 2;
        return `M${offsetX1} ${offsetY1} Q${midX} ${midY} ${offsetX2} ${offsetY2}`;
      } else {
        return `M${offsetX1} ${offsetY1} L${offsetX2} ${offsetY2}`;
      }
    }

    // Main visualization group (now inside main container)
    const vizGroup = mainContainer.append('g')
      .attr('class', 'viz-group');

    // Migration flow visualization (always show)
      // Draw "to" paths (blue, with negative flow rates)
      activeConnections.forEach(conn => {
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId)!;
        const toNode = activeNodes.find(n => n.id === conn.toNodeId)!;
        
        if (conn.toFlowRate !== 0) {
          vizGroup.append('path')
            .attr('class', 'flowline-to')
            .attr('d', createOffsetPath(fromNode.x, fromNode.y, toNode.x, toNode.y, -8, curved))
            .attr('marker-end', 'url(#arrow-to)')
            .attr('data-flow-rate', Math.abs(conn.toFlowRate))
            .attr('data-absolute-flow', conn.metadata.absoluteToFlow)
            .attr('data-units', conn.metadata.units || '')
            .attr('data-from-node', fromNode.title)
            .attr('data-to-node', toNode.title);
        }
      });

      // Draw "from" paths (red, with positive flow rates)
      activeConnections.forEach(conn => {
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId)!;
        const toNode = activeNodes.find(n => n.id === conn.toNodeId)!;
        
        if (conn.fromFlowRate !== 0) {
          vizGroup.append('path')
            .attr('class', 'flowline-from')
            .attr('d', createOffsetPath(toNode.x, toNode.y, fromNode.x, fromNode.y, -8, curved))
            .attr('marker-end', 'url(#arrow-from)')
            .attr('data-flow-rate', Math.abs(conn.fromFlowRate))
            .attr('data-absolute-flow', conn.metadata.absoluteFromFlow)
            .attr('data-units', conn.metadata.units || '')
            .attr('data-from-node', toNode.title)
            .attr('data-to-node', fromNode.title);
        }
      });

      // Draw nodes with dynamic sizes
      activeNodes.forEach(node => {
        const nodeGroup = vizGroup.append('g')
          .attr('class', 'node-group')
          .attr('transform', `translate(${node.x}, ${node.y})`);

        // Node circle
        nodeGroup.append('circle')
          .attr('class', 'node')
          .attr('r', node.size * 2);

        // Node title
        nodeGroup.append('text')
          .attr('class', 'node-title')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .text(node.title);
      });
      
      // Apply styles directly to D3 elements
      d3.selectAll('.node')
        .style('fill', '#f3f4f6')
        .style('stroke', '#6b7280')
        .style('stroke-width', '3');

      d3.selectAll('.node-title')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#374151')
        .style('pointer-events', 'none');

      // Style "to" direction paths (blue)
      d3.selectAll('.flowline-to')
        .style('fill', 'none')
        .style('stroke', '#2563eb')
        .style('opacity', '0.7')
        .style('stroke-width', '5px') // Constant width
        .style('stroke-dasharray', '8, 4');

      // Style "from" direction paths (red)
      d3.selectAll('.flowline-from')
        .style('fill', 'none')
        .style('stroke', '#888888')
        .style('opacity', '0.7')
        .style('stroke-width', '5px') // Constant width
        .style('stroke-dasharray', '8, 4');

      // Animation configuration constants
      const DASH_PATTERN_LENGTH = 12; // 8px dash + 4px gap = 12px cycle
      const BASE_SPEED = 25; // Base pixels per second for flow animation

      // Individual animation function for each "to" path
      function animateToPath(pathElement: any) {
        const flowRate = parseFloat(d3.select(pathElement).attr('data-flow-rate'));
        
        // Calculate speed based on flow rate (higher rate = faster animation)
        const pixelsPerSecond = BASE_SPEED * (flowRate / 10); // Normalize to reasonable speed
        
        // Calculate duration to move exactly one dash pattern cycle
        const duration = (DASH_PATTERN_LENGTH / pixelsPerSecond) * 1000; // Convert to milliseconds
        
        d3.select(pathElement)
          .transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .styleTween("stroke-dashoffset", function() {
            return function(t: number) {
              // Move by exactly one dash pattern length during the animation
              return (t * -DASH_PATTERN_LENGTH).toString();
            };
          })
          .on("end", function() {
            // Reset offset to 0 and restart - this creates seamless looping
            d3.select(this).style("stroke-dashoffset", "0");
            animateToPath(this);
          });
      }

      // Individual animation function for each "from" path  
      function animateFromPath(pathElement: any) {
        const flowRate = parseFloat(d3.select(pathElement).attr('data-flow-rate'));
        
        // Calculate speed based on flow rate (higher rate = faster animation)
        const pixelsPerSecond = BASE_SPEED * (flowRate / 10); // Normalize to reasonable speed
        
        // Calculate duration to move exactly one dash pattern cycle
        const duration = (DASH_PATTERN_LENGTH / pixelsPerSecond) * 1000; // Convert to milliseconds
        
        d3.select(pathElement)
          .transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .styleTween("stroke-dashoffset", function() {
            return function(t: number) {
              // Move by exactly one dash pattern length during the animation
              return (t * -DASH_PATTERN_LENGTH).toString();
            };
          })
          .on("end", function() {
            // Reset offset to 0 and restart - this creates seamless looping
            d3.select(this).style("stroke-dashoffset", "0");
            animateFromPath(this);
          });
      }

      // Start individual animations for each path
      d3.selectAll(".flowline-to").each(function() {
        animateToPath(this);
      });

      d3.selectAll(".flowline-from").each(function() {
        animateFromPath(this);
      });

      // Add tooltip functionality
      const tooltip = d3.select('body').append('div')
        .attr('class', 'flow-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none');

      // Add hover events to paths
      d3.selectAll('.flowline-to, .flowline-from')
        .on('mouseover', function(event) {
          const absoluteFlow = d3.select(this).attr('data-absolute-flow');
          const units = d3.select(this).attr('data-units');
          const fromNode = d3.select(this).attr('data-from-node');
          const toNode = d3.select(this).attr('data-to-node');
          
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`From ${fromNode} to ${toNode}: ${parseInt(absoluteFlow).toLocaleString()} ${units}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          tooltip.transition().duration(500).style('opacity', 0);
        });

    // Add zoom instructions
    const zoomInstructions = svg.append('text')
      .attr('class', 'zoom-instructions')
      .attr('x', 20)
      .attr('y', height - 20)
      .attr('font-size', '12px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#6b7280')
      .text('Use scroll wheel to zoom • Drag to pan');

    // Cleanup function
    return () => {
      d3.selectAll(".flowline-to").interrupt();
      d3.selectAll(".flowline-from").interrupt();
      d3.select('.flow-tooltip').remove();
    };
  }, [width, height, activeNodes, activeConnections, curved]);

  return (
    <div className="nodes-visualization" style={{ width: '100%', height: '100%' }}>

      {/* Responsive Content Container */}
      <div 
        className="responsive-content-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          width: '100%',
          minHeight: '50vh'
        }}
      >
        {/* SVG Container */}
        <div 
          ref={containerRef}
          className="svg-container"
          style={{
            flex: '1',
            minHeight: '300px',
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: 'block' }}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
          />
        </div>
        
        {/* Table Container */}
        <div 
            className="table-container"
            style={{
              flex: '1',
              minHeight: '300px',
              overflowX: 'auto'
            }}
          >
            {/* Month Slider - inside table container */}
            <div style={{ marginBottom: '32px', paddingLeft: '24px', paddingRight: '24px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '16px',
                color: '#374151'
              }}>
                Migration Analysis Period
              </h3>
              
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                Select the month for migration data analysis
              </p>
              
              <Slider
                value={selectedMonth}
                onChange={handleMonthChange}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => monthlyLabels[value]}
                min={0}
                max={monthlyLabels.length - 1}
                step={1}
                marks={monthlyLabels.map((label, index) => ({
                  value: index,
                  label: index % 3 === 0 ? label : '' // Show every 3rd label to avoid crowding
                }))}
                sx={{
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#2563eb',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#2563eb',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#e2e8f0',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#94a3b8',
                  },
                  '& .MuiSlider-markLabel': {
                    fontSize: '11px',
                    color: '#64748b',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'top left',
                    whiteSpace: 'nowrap',
                    marginTop: '8px'
                  },
                  '& .MuiSlider-valueLabel': {
                    fontSize: '12px',
                    backgroundColor: '#1f2937',
                  }
                }}
              />
              
              <p style={{ 
                color: '#374151', 
                marginTop: '16px',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                Selected Month: {monthlyLabels[selectedMonth]}
              </p>
            </div>

            <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '16px',
                color: '#374151'
              }}>
                Migration Flow Data
              </h3>
            </div>
            <div style={{ overflowX: 'auto', paddingLeft: '24px', paddingRight: '24px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                minWidth: '600px' // Ensure table doesn't get too compressed
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      From
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      To
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      To Flow Rate
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      From Flow Rate
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Absolute To Flow
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Absolute From Flow
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Units
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeConnections.map((connection, index) => {
                    const fromNode = activeNodes.find(n => n.id === connection.fromNodeId);
                    const toNode = activeNodes.find(n => n.id === connection.toNodeId);
                    
                    return (
                      <tr key={`${connection.fromNodeId}-${connection.toNodeId}`} style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                      }}>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {fromNode?.title || connection.fromNodeId}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {toNode?.title || connection.toNodeId}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#2563eb',
                          textAlign: 'right',
                          fontWeight: '500'
                        }}>
                          {connection.toFlowRate}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#dc2626',
                          textAlign: 'right',
                          fontWeight: '500'
                        }}>
                          {connection.fromFlowRate}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280',
                          textAlign: 'right'
                        }}>
                          {connection.metadata.absoluteToFlow.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280',
                          textAlign: 'right'
                        }}>
                          {connection.metadata.absoluteFromFlow.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280'
                        }}>
                          {connection.metadata.units || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* Citation Footer */}
      <Box
        sx={{
          mt: 2,
          pt: 2,
          pb: 2
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#374151',
            mb: 2
          }}
        >
          How to Cite This Research
        </Typography>
        
        <Typography
          variant="body2"
          sx={{
            color: '#6b7280',
            mb: 2,
            lineHeight: 1.6,
            fontFamily: 'monospace',
            fontSize: '13px'
          }}
        >
          {citationText}
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopy />}
            onClick={handleCopyCitation}
            sx={{
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Copy Citation
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<Share />}
            onClick={handleShareLink}
            sx={{
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Share Link
          </Button>
        </Box>
      </Box>

      {/* Snackbar for copy notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* CSS for responsive behavior */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .responsive-content-container {
            flex-direction: row !important;
          }
          
          .svg-container {
            flex: 2;
            max-width: 60%;
          }
          
          .table-container {
            flex: 1;
            max-width: 40%;
            min-width: 400px;
          }
        }
        
        @media (max-width: 1023px) {
          .responsive-content-container {
            flex-direction: column;
          }
          
          .svg-container {
            min-height: 40vh;
          }
          
          .table-container {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default NodeFlowAnimation;