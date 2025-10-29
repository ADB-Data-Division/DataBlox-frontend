"use client"
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, Paper } from '@mui/material';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/ssr';
import { 
  generateThailandHexagonsFromCoordinates} from './thailand-map-data';
import { 
  generateNodesFromAdministrativeUnits} from './thailand-map-utils';
import { 
  loadAdministrativeData, 
  type ProcessedAdministrativeData 
} from '@/app/services/data-loader/thailand-administrative-data';
import type { MigrationResponse } from '@/app/services/api';
import MigrationFlowDiagram from '@/components/migration-flow-diagram';
import { MigrationAnalysisPeriod } from '@/components/migration-analysis-period';
import { ColorPicker } from '@/components/color-picker';

// Default transform constants
const DEFAULT_TRANSFORM_SCALE = 1.5;
const DEFAULT_TRANSFORM_X = 160;
const DEFAULT_TRANSFORM_Y = 90;

// Zoom configuration constants
const DEFAULT_MIN_ZOOM = 1;
const DEFAULT_MAX_ZOOM = 30;

// Text scaling configuration - adjust these values to fine-tune text scaling
const TEXT_SCALING_CONFIG = {
  minScale: 0.3,        // Minimum text scale (30% of original size)
  sqrtScaling: true,    // Use square root scaling instead of linear
};

interface Node {
  id: string;
  title: string;
  tooltip: string;
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
  selectedPeriod?: string;
  onPeriodChange?: (period: string, startDate: string, endDate: string) => void;
  apiResponse?: MigrationResponse | null; // Add apiResponse prop for table data
  migrationThreshold?: number;
  onThresholdChange?: (threshold: number) => void;
  flowVisibility?: Record<string, { moveIn: boolean; moveOut: boolean }>;
  onFlowVisibilityChange?: (visibility: Record<string, { moveIn: boolean; moveOut: boolean }>) => void;
  edgeColors?: Record<string, string>;
  onEdgeColorsChange?: (colors: Record<string, string>) => void;
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
  selectedPeriod,
  onPeriodChange,
  apiResponse,
  migrationThreshold = 0,
  onThresholdChange,
  flowVisibility = {},
  onFlowVisibilityChange,
  edgeColors = {},
  onEdgeColorsChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // State for administrative data
  const [administrativeData, setAdministrativeData] = useState<ProcessedAdministrativeData | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // State for units selection
  const [selectedUnits, setSelectedUnits] = useState<'thousands' | 'units'>('thousands');

  // State for node click interaction
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // State for map reset button visibility
  const [showResetButton, setShowResetButton] = useState<boolean>(false);

  // State to store current zoom transform to preserve it during re-renders
  const [currentZoomTransform, setCurrentZoomTransform] = useState<d3.ZoomTransform | null>(null);

  // Ref to avoid dependency issues in useEffect
  const selectedNodeIdRef = useRef<string | null>(null);
  
  // Update ref when selectedNodeId changes
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Default colors for edges
  const DEFAULT_EDGE_COLORS = useMemo(() => [
    '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c',
    '#0891b2', '#c2410c', '#be185d', '#4338ca', '#059669'
  ], []);

  // Function to get edge color
  const getEdgeColor = useCallback((edgeKey: string, index: number = 0): string => {
    return edgeColors[edgeKey] || DEFAULT_EDGE_COLORS[index % DEFAULT_EDGE_COLORS.length];
  }, [edgeColors, DEFAULT_EDGE_COLORS]);

  // Helper function to check if visibility objects are deeply equal
  const areVisibilityEqual = useCallback((a: Record<string, { moveIn: boolean; moveOut: boolean }>, b: Record<string, { moveIn: boolean; moveOut: boolean }>) => {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => {
      const itemA = a[key];
      const itemB = b[key];
      return itemA?.moveIn === itemB?.moveIn && itemA?.moveOut === itemB?.moveOut;
    });
  }, []);

  // Initialize flow visibility when API response changes
  useEffect(() => {
    if (apiResponse?.flows && onFlowVisibilityChange) {
      const newVisibility: Record<string, { moveIn: boolean; moveOut: boolean }> = {};
      
      // Process flows similar to how they're processed in the display
      const filteredFlows = apiResponse.flows.filter(flow => 
        flow.time_period_id === selectedPeriod || 
        (selectedPeriod && !apiResponse.time_periods.find(tp => tp.id === selectedPeriod) && 
         flow.time_period_id === apiResponse.time_periods[0]?.id)
      );

      // Group flows by bidirectional pairs
      const flowPairs = new Map<string, { flows: typeof filteredFlows, key: string }>();
      
      filteredFlows.forEach(flow => {
        const originId = flow.origin.id;
        const destinationId = flow.destination.id;
        
        // Handle self-loops
        if (originId === destinationId) {
          const selfKey = `self-${originId}`;
          const existingVis = flowVisibility[selfKey];
          newVisibility[selfKey] = {
            moveIn: existingVis?.moveIn !== undefined 
              ? (existingVis.moveIn && flow.flow_count >= migrationThreshold)
              : (flow.flow_count >= migrationThreshold),
            moveOut: true // Self-loops only have one direction
          };
          return;
        }
        
        // Handle bidirectional flows
        const flowKey = [originId, destinationId].sort().join('-');
        if (!flowPairs.has(flowKey)) {
          flowPairs.set(flowKey, { flows: [], key: flowKey });
        }
        flowPairs.get(flowKey)?.flows.push(flow);
      });

      // Initialize visibility for bidirectional flows
      flowPairs.forEach(({ flows, key }) => {
        const moveInFlow = flows[0]?.flow_count || 0;
        const moveOutFlow = flows[1]?.flow_count || 0;
        
        // Update visibility based on threshold, but preserve user-disabled settings
        const existingVis = flowVisibility[key];
        newVisibility[key] = {
          moveIn: existingVis?.moveIn !== undefined 
            ? (existingVis.moveIn && moveInFlow >= migrationThreshold)
            : (moveInFlow >= migrationThreshold),
          moveOut: existingVis?.moveOut !== undefined 
            ? (existingVis.moveOut && moveOutFlow >= migrationThreshold)
            : (moveOutFlow >= migrationThreshold)
        };
      });

      // Only update visibility if there are actual changes
      if (Object.keys(newVisibility).length > 0) {
        const combinedVisibility = { ...flowVisibility, ...newVisibility };
        
        // Only call onFlowVisibilityChange if the combined visibility is actually different
        if (!areVisibilityEqual(flowVisibility, combinedVisibility)) {
          onFlowVisibilityChange(combinedVisibility);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResponse, selectedPeriod, migrationThreshold, onFlowVisibilityChange, areVisibilityEqual]); // Removed flowVisibility from dependencies to prevent infinite loop



  // Load administrative data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        const data = await loadAdministrativeData();
        setAdministrativeData(data);
      } catch (error) {
        console.error('Failed to load administrative data:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);



  // Use container size if no width/height provided
  const containerSize = useContainerSize(containerRef);
  const width = propWidth || containerSize.width;
  const height = propHeight || containerSize.height;

  // Calculate center position for Thailand map
  // Approximate Thailand map bounds (based on hexagon layout)
  const mapWidth = 270; // Approximate width of Thailand hexagon layout
  const mapHeight = 500; // Approximate height of Thailand hexagon layout
  
  // Center the map in the container
  const centerX = 45; // Center the map
  const centerY = -60;

  // Generate nodes from administrative data or fallback to static data
  const defaultNodes: Node[] = useMemo(() => {
    if (administrativeData) {
      // Use provinces only for the main visualization
      return generateNodesFromAdministrativeUnits(
        administrativeData.provinces,
        mapWidth,
        mapHeight,
        centerX,
        centerY
      );
    } 
    return [];
  }, [administrativeData, mapWidth, mapHeight, centerX, centerY]);

  

  // Merge custom nodes with defaultNodes positions
  const activeNodes = React.useMemo(() => {
    if (!nodes) {
      return defaultNodes;
    }
    
    // Create a lookup map for defaultNodes positions by ID
    const defaultPositions = new Map(
      defaultNodes.map(node => [node.id, { x: node.x, y: node.y }])
    );
    
    // Override x,y positions in custom nodes with positions from defaultNodes
    return nodes.map(node => {
      const defaultPosition = defaultPositions.get(node.id);
      if (defaultPosition) {
        return {
          ...node,
          x: defaultPosition.x,
          y: defaultPosition.y
        };
      }
      return node; // Keep original if no default position found
    });
  }, [nodes, defaultNodes]);
  
  // Initialize edge colors when connections change
  useEffect(() => {
    if (connections && connections.length > 0 && onEdgeColorsChange) {
      const newColors: Record<string, string> = { ...edgeColors };
      let hasNewColors = false;

      connections.forEach((conn, index) => {
        const edgeKey = `${conn.fromNodeId}-${conn.toNodeId}`;
        if (!newColors[edgeKey]) {
          newColors[edgeKey] = DEFAULT_EDGE_COLORS[index % DEFAULT_EDGE_COLORS.length];
          hasNewColors = true;
        }
      });

      if (hasNewColors) {
        onEdgeColorsChange(newColors);
      }
    }
  }, [connections, edgeColors, onEdgeColorsChange, DEFAULT_EDGE_COLORS]);

  // Function to calculate dynamic node size based on zoom level
  const getDynamicNodeSize = useCallback((baseSize: number, zoomLevel?: number): number => {
    // Use current zoom level if not provided
    const currentZoom = zoomLevel ?? 2;
    // As zoom increases, make nodes smaller to prevent them from covering edges
    // Use more aggressive inverse relationship with a minimum size limit
    const scaleFactor = Math.max(0.05, 1 / currentZoom); // Minimum 20% of original size, more aggressive scaling
    return baseSize * scaleFactor;
  }, []);

  // Function to update edge visibility based on selected node
  const updateEdgeVisibility = useCallback((selectedNodeId: string | null) => {
    if (!selectedNodeId) {
      // Show all edges when no node is selected
      d3.selectAll('.flowline-to, .flowline-from').style('opacity', function() {
        // Check if this flow should be visible based on flowVisibility state
        const flowKey = d3.select(this).attr('data-flow-key');
        const direction = d3.select(this).attr('data-direction');
        const flowVis = flowVisibility[flowKey];
        
        if (direction === 'to') {
          return flowVis?.moveIn !== false ? '0.7' : '0';
        } else if (direction === 'from') {
          return flowVis?.moveOut !== false ? '0.7' : '0';
        }
        return '0.7'; // fallback
      });
      return;
    }

    // Get the selected node's tooltip for comparison
    const selectedNode = activeNodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    // Update flow line visibility based on node selection and individual flow visibility
    d3.selectAll('.flowline-to, .flowline-from').style('opacity', function() {
      const fromNode = d3.select(this).attr('data-from-node');
      const toNode = d3.select(this).attr('data-to-node');
      const flowKey = d3.select(this).attr('data-flow-key');
      const direction = d3.select(this).attr('data-direction');
      const flowVis = flowVisibility[flowKey];
      
      // Check if this flow involves the selected node
      const isRelated = fromNode === selectedNode.tooltip || toNode === selectedNode.tooltip;
      
      // If not related to selected node, hide it
      if (!isRelated) return '0.1';
      
      // If related, check individual flow visibility settings
      if (direction === 'to') {
        return flowVis?.moveIn !== false ? '0.7' : '0';
      } else if (direction === 'from') {
        return flowVis?.moveOut !== false ? '0.7' : '0';
      }
      return '0.7'; // fallback
    });
  }, [activeNodes, flowVisibility]);



  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const activeConnections = connections || [];

    // Create main container group for zoom functionality
    const mainContainer = svg.append('g')
      .attr('class', 'main-container');

    // Set up zoom behavior with pan constraints
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM]) // Allow zoom from 70% to 1000% (prevents map from being too small)
      .translateExtent([[-300, -300], [800, 800]]) // Expanded pan boundaries for better UX
      .on('zoom', function(event) {
        mainContainer.attr('transform', event.transform);
        console.log("zoom: ", event.transform);
        const zoomLevel = event.transform.k;
        
        // Store the current zoom transform to preserve it during re-renders
        setCurrentZoomTransform(event.transform);
        
        // Check if transform is different from default (scale 2, translate 100,20)
        const defaultTransform = d3.zoomIdentity.scale(DEFAULT_TRANSFORM_SCALE).translate(DEFAULT_TRANSFORM_X, DEFAULT_TRANSFORM_Y);
        const isAtDefault = event.transform.k === defaultTransform.k && 
                          event.transform.x === defaultTransform.x && 
                          event.transform.y === defaultTransform.y;
        setShowResetButton(!isAtDefault);
        
        // Create consistent scaling functions available in this scope
        const getScaleFactor = (minScale: number) => Math.max(minScale, 1 / zoomLevel);
        const getTextScaleFactor = (minScale: number) => {
          const baseScale = TEXT_SCALING_CONFIG.sqrtScaling ? 1 / Math.sqrt(zoomLevel) : 1 / zoomLevel;
          return Math.max(minScale, baseScale);
        };
        const getDynamicSize = (baseSize: number) => baseSize * getScaleFactor(0.2);
        
        // Update node sizes based on zoom level using consistent scaling
        d3.selectAll('.node').attr('r', function() {
          const element = this as Element;
          const parentElement = element.parentNode as SVGGElement;
          if (!parentElement) return 20; // fallback size
          const nodeGroup = d3.select(parentElement);
          const nodeId = nodeGroup.attr('data-node-id');
          const node = activeNodes.find(n => n.id === nodeId);
          if (!node) return 20; // fallback size
          return getDynamicSize(node.size * 2);
        });

        // Update text size using separate text scaling (gentler than element scaling)
        d3.selectAll('.node-title').style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = getTextScaleFactor(TEXT_SCALING_CONFIG.minScale);
          return `${baseFontSize * scaleFactor}px`;
        });

        // Update border thickness using consistent scaling
        d3.selectAll('.node').style('stroke-width', function() {
          const baseStrokeWidth = 3;
          const scaleFactor = getScaleFactor(0.05); // Minimum 30% scale
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow line thickness using consistent scaling
        d3.selectAll('.flowline-to, .flowline-from').style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const scaleFactor = getScaleFactor(0.05); // Minimum 30% scale
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow marker sizes using consistent scaling
        const arrowScaleFactor = getScaleFactor(0.05);
        d3.selectAll('#arrow-to, #arrow-from')
          .attr('markerWidth', 4 * arrowScaleFactor)
          .attr('markerHeight', 4 * arrowScaleFactor);
      });

    // Store zoom behavior in ref for reset functionality
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Apply the current zoom transform, or default if none stored
    const initialTransform = currentZoomTransform || d3.zoomIdentity.scale(DEFAULT_TRANSFORM_SCALE).translate(DEFAULT_TRANSFORM_X, DEFAULT_TRANSFORM_Y);
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
      .attr('fill', 'transparent') // No fill
      .attr('stroke', 'black') // Black borders for all hexagons
      .attr('stroke-width', 1)
      .attr('opacity', 0.2);

    // Define arrow markers for direction indicators
    const defs = svg.append('defs');
    
    // Arrow marker for "to" direction (gray, smaller)
    defs.append('marker')
      .attr('id', 'arrow-to')
      .attr('viewBox', '0 -3 6 6')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L6,0L0,3')
      .attr('fill', '#888888');

    // Arrow marker for "from" direction (gray, smaller)
    defs.append('marker')
      .attr('id', 'arrow-from')
      .attr('viewBox', '0 -3 6 6')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L6,0L0,3')
      .attr('fill', '#888888');

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
      // Draw "to" paths with custom edge colors
      activeConnections.forEach((conn, index) => {
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
        const toNode = activeNodes.find(n => n.id === conn.toNodeId);
        
        // Skip if either node is not found (e.g., "Other Provinces" aggregated data)
        if (!fromNode || !toNode) {
          console.log(`Skipping connection visualization: ${conn.fromNodeId} -> ${conn.toNodeId} (missing node data)`);
          return;
        }
        
        // Check if this flow should be visible based on threshold and individual flow visibility
        const flowKey = [conn.fromNodeId, conn.toNodeId].sort().join('-');
        const flowVis = flowVisibility[flowKey];
        const shouldShowMoveIn = flowVis?.moveIn ?? (conn.metadata.absoluteToFlow >= migrationThreshold);
        
        if (conn.toFlowRate !== 0 && shouldShowMoveIn) {
          const edgeColor = getEdgeColor(flowKey, index);
          vizGroup.append('path')
            .attr('class', 'flowline-to')
            .attr('d', createOffsetPath(fromNode.x, fromNode.y, toNode.x, toNode.y, -8, curved))
            .attr('marker-end', 'url(#arrow-to)')
            .attr('data-flow-rate', Math.abs(conn.toFlowRate))
            .attr('data-absolute-flow', conn.metadata.absoluteToFlow)
            .attr('data-units', conn.metadata.units || '')
            .attr('data-from-node', fromNode.tooltip)
            .attr('data-to-node', toNode.tooltip)
            .attr('data-flow-key', flowKey)
            .attr('data-direction', 'to')
            .attr('data-edge-color', edgeColor);
        }
      });

      // Draw "from" paths with custom edge colors
      activeConnections.forEach((conn, index) => {
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
        const toNode = activeNodes.find(n => n.id === conn.toNodeId);
        
        // Skip if either node is not found (e.g., "Other Provinces" aggregated data)
        if (!fromNode || !toNode) {
          return;
        }
        
        // Check if this flow should be visible based on threshold and individual flow visibility
        const flowKey = [conn.fromNodeId, conn.toNodeId].sort().join('-');
        const flowVis = flowVisibility[flowKey];
        const shouldShowMoveOut = flowVis?.moveOut ?? (conn.metadata.absoluteFromFlow >= migrationThreshold);
        
        if (conn.fromFlowRate !== 0 && shouldShowMoveOut) {
          const edgeColor = getEdgeColor(flowKey, index);
          vizGroup.append('path')
            .attr('class', 'flowline-from')
            .attr('d', createOffsetPath(toNode.x, toNode.y, fromNode.x, fromNode.y, -8, curved))
            .attr('marker-end', 'url(#arrow-from)')
            .attr('data-flow-rate', Math.abs(conn.fromFlowRate))
            .attr('data-absolute-flow', conn.metadata.absoluteFromFlow)
            .attr('data-units', conn.metadata.units || '')
            .attr('data-from-node', toNode.tooltip)
            .attr('data-to-node', fromNode.tooltip)
            .attr('data-flow-key', flowKey)
            .attr('data-direction', 'from')
            .attr('data-edge-color', edgeColor);
        }
      });

      // Draw nodes with dynamic sizes (colorless/neutral)
      activeNodes.forEach((node, index) => {
        const nodeGroup = vizGroup.append('g')
          .attr('class', 'node-group')
          .attr('data-node-id', node.id)
          .attr('data-tooltip', node.tooltip)
          .attr('transform', `translate(${node.x}, ${node.y})`)
          .style('cursor', 'pointer');

        // Node circle (neutral gray color)
        nodeGroup.append('circle')
          .attr('class', 'node')
          .attr('r', getDynamicNodeSize(node.size * 2, 2))
          .style('fill', '#e5e7eb')
          .style('stroke', '#6b7280')
          .style('stroke-width', (() => {
            const baseStrokeWidth = 3;
            const zoomLevel = 2; // Initial zoom level
            const scaleFactor = Math.max(0.05, 1 / zoomLevel);
            return `${baseStrokeWidth * scaleFactor}px`;
          })());

        // Node title
        nodeGroup.append('text')
          .attr('class', 'node-title')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .text(node.title);

        // Add click events to node group
        nodeGroup
          .on('click', function(event) {
            // Prevent the click from propagating to the SVG zoom handler
            event.stopPropagation();
            // Toggle selection
            if (selectedNodeIdRef.current === node.id) {
              // Unselect if already selected
              setSelectedNodeId(null);
              
              // Reset node appearance to neutral color
              d3.select(this).select('.node')
                .style('fill', '#e5e7eb')
                .style('stroke', '#6b7280')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 3;
                  const currentTransform = d3.zoomTransform(svgRef.current!);
                  const zoomLevel = currentTransform.k;
                  const scaleFactor = Math.max(0.05, 1 / zoomLevel);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
            } else {
              // Select new node
              setSelectedNodeId(node.id);
              
              // Reset all other nodes first to neutral colors
              activeNodes.forEach(() => {
                d3.selectAll('[data-node-id] .node')
                  .style('fill', '#e5e7eb')
                  .style('stroke', '#6b7280')
                  .style('stroke-width', function() {
                    const baseStrokeWidth = 3;
                    const currentTransform = d3.zoomTransform(svgRef.current!);
                    const zoomLevel = currentTransform.k;
                    const scaleFactor = Math.max(0.05, 1 / zoomLevel);
                    return `${baseStrokeWidth * scaleFactor}px`;
                  });
              });
              
              // Highlight the selected node with a blue outline
              d3.select(this).select('.node')
                .style('fill', '#e5e7eb')
                .style('stroke', '#2563eb')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 5; // Thicker for selected state
                  const currentTransform = d3.zoomTransform(svgRef.current!);
                  const zoomLevel = currentTransform.k;
                  const scaleFactor = Math.max(0.05, 1 / zoomLevel);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
            }
          });
      });
      
      // Apply styles have been moved to individual node rendering above

      d3.selectAll('.node-title')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = Math.max(TEXT_SCALING_CONFIG.minScale, TEXT_SCALING_CONFIG.sqrtScaling ? 1 / Math.sqrt(2) : 1 / 2);
          return `${baseFontSize * scaleFactor}px`;
        })
        .style('font-weight', 'bold')
        .style('fill', '#374151')
        .style('pointer-events', 'none');

      // Style "to" direction paths with custom edge colors
      d3.selectAll('.flowline-to')
        .style('fill', 'none')
        .style('stroke', function() {
          return d3.select(this).attr('data-edge-color') || '#2563eb';
        })
        .style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const zoomLevel = 2; // Initial zoom level
          const scaleFactor = Math.max(0.05, 1 / zoomLevel); // Dynamic scaling consistent with zoom handler
          return `${baseStrokeWidth * scaleFactor}px`;
        })
        .style('stroke-dasharray', '8, 4');

      // Style "from" direction paths with custom edge colors  
      d3.selectAll('.flowline-from')
        .style('fill', 'none')
        .style('stroke', function() {
          return d3.select(this).attr('data-edge-color') || '#888888';
        })
        .style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const zoomLevel = 2; // Initial zoom level
          const scaleFactor = Math.max(0.05, 1 / zoomLevel); // Dynamic scaling consistent with zoom handler
          return `${baseStrokeWidth * scaleFactor}px`;
        })
        .style('stroke-dasharray', '8, 4');

      // Animation configuration constants
      const DASH_PATTERN_LENGTH = 12; // 8px dash + 4px gap = 12px cycle
      const BASE_SPEED = 25; // Base pixels per second for flow animation

      // Individual animation function for each "to" path
      function animateToPath(pathElement: any) {
        const absoluteFlow = parseFloat(d3.select(pathElement).attr('data-absolute-flow'));
        
        // Calculate speed based on absolute flow value (higher flow = faster animation)
        // Use square root scaling for more dramatic visual differences
        const normalizedFlow = Math.sqrt(absoluteFlow / 100); // Normalize and apply square root
        const speedMultiplier = 0.2 + (normalizedFlow * 0.3); // Range from 0.2x to much higher
        const pixelsPerSecond = BASE_SPEED * Math.max(speedMultiplier, 0.1); // Minimum 10% speed
        
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
        const absoluteFlow = parseFloat(d3.select(pathElement).attr('data-absolute-flow'));
        
        // Calculate speed based on absolute flow value (higher flow = faster animation)
        // Use square root scaling for more dramatic visual differences
        const normalizedFlow = Math.sqrt(absoluteFlow / 100); // Normalize and apply square root
        const speedMultiplier = 0.2 + (normalizedFlow * 0.3); // Range from 0.2x to much higher
        const pixelsPerSecond = BASE_SPEED * Math.max(speedMultiplier, 0.1); // Minimum 10% speed
        
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

      // Add tooltip events to nodes
      d3.selectAll('.node-group')
        .on('mouseover', function(event) {
          event.stopPropagation();
          const tooltipText = d3.select(this).attr('data-tooltip');
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(tooltipText)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(event) {
          event.stopPropagation();
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // Add tooltip events to paths
      d3.selectAll('.flowline-to, .flowline-from')
        .on('mouseover', function(event) {
          event.stopPropagation();
          const absoluteFlow = d3.select(this).attr('data-absolute-flow');
          const units = d3.select(this).attr('data-units');
          const fromNode = d3.select(this).attr('data-from-node');
          const toNode = d3.select(this).attr('data-to-node');
          
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`From ${fromNode} to ${toNode}: ${parseInt(absoluteFlow).toLocaleString()} ${units}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(event) {
          event.stopPropagation();
          tooltip.transition().duration(500).style('opacity', 0);
        });

    // // Add zoom instructions
    // svg.append('text')
    //   .attr('class', 'zoom-instructions')
    //   .attr('x', 20)
    //   .attr('y', height - 20)
    //   .attr('font-size', '12px')
    //   .attr('font-family', 'Arial, sans-serif')
    //   .attr('fill', '#6b7280')
    //   .text('Use scroll wheel to zoom • Drag to pan');

    // Cleanup function
    return () => {
      d3.selectAll(".flowline-to").interrupt();
      d3.selectAll(".flowline-from").interrupt();
      d3.select('.flow-tooltip').remove();
    };
  }, [width, height, activeNodes, curved, getDynamicNodeSize, connections, migrationThreshold, edgeColors, getEdgeColor]);

  // Apply initial visibility after rendering
  useEffect(() => {
    if (!svgRef.current || !connections) return;

    // Force an initial visibility update to ensure correct opacity
    const activeConnections = connections || [];
    activeConnections.forEach((conn: any) => {
      const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
      const toNode = activeNodes.find(n => n.id === conn.toNodeId);
      
      if (!fromNode || !toNode) return;

      const flowKey = [conn.fromNodeId, conn.toNodeId].sort().join('-');
      const flowVis = flowVisibility[flowKey];
      
      // Get the selected node for filtering
      const selectedNode = selectedNodeId ? activeNodes.find(n => n.id === selectedNodeId) : null;
      
      // Update "to" direction flows (Move In)
      const shouldShowMoveIn = flowVis?.moveIn ?? (conn.metadata.absoluteToFlow >= migrationThreshold);
      const toPaths = d3.selectAll(`.flowline-to[data-flow-key="${flowKey}"][data-direction="to"]`);
      
      if (selectedNode) {
        // Node filtering is active - check if this flow involves the selected node
        const isRelated = fromNode.tooltip === selectedNode.tooltip || toNode.tooltip === selectedNode.tooltip;
        toPaths.style('opacity', isRelated && shouldShowMoveIn && conn.toFlowRate !== 0 ? '0.7' : '0.1');
      } else {
        // No node filtering - use checkbox visibility
        toPaths.style('opacity', shouldShowMoveIn && conn.toFlowRate !== 0 ? '0.7' : '0');
      }

      // Update "from" direction flows (Move Out)  
      const shouldShowMoveOut = flowVis?.moveOut ?? (conn.metadata.absoluteFromFlow >= migrationThreshold);
      const fromPaths = d3.selectAll(`.flowline-from[data-flow-key="${flowKey}"][data-direction="from"]`);
      
      if (selectedNode) {
        // Node filtering is active - check if this flow involves the selected node
        const isRelated = toNode.tooltip === selectedNode.tooltip || fromNode.tooltip === selectedNode.tooltip;
        fromPaths.style('opacity', isRelated && shouldShowMoveOut && conn.fromFlowRate !== 0 ? '0.7' : '0.1');
      } else {
        // No node filtering - use checkbox visibility
        fromPaths.style('opacity', shouldShowMoveOut && conn.fromFlowRate !== 0 ? '0.7' : '0');
      }
    });
  }, [connections, activeNodes, flowVisibility, migrationThreshold, selectedNodeId]);

  // Show loading state while data is being fetched
  if (dataLoading) {
    return (
      <div className="nodes-visualization" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Loading Thailand map data...</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Please wait while we load province and district information</div>
        </div>
      </div>
    );
  }

  // Show error state if data failed to load
  if (dataError) {
    return (
      <div className="nodes-visualization" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px', color: '#dc2626' }}>Failed to load map data</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{dataError}</div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nodes-visualization" style={{ width: '100%', height: '100%' }}>

      {/* Responsive Content Container */}
      <div 
        className="responsive-content-container"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '24px',
          width: '100%',
          minHeight: '50vh'
        }}
      >
        {/* SVG Container */}
        <div 
          id="svg-container"
          ref={containerRef}
          className="svg-container"
          style={{
            flex: '8',
            height: '700px',
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Reset Button */}
          {showResetButton && (
            <Button
              onClick={() => {
                if (svgRef.current && zoomRef.current) {
                  const defaultTransform = d3.zoomIdentity.scale(DEFAULT_TRANSFORM_SCALE).translate(DEFAULT_TRANSFORM_X, DEFAULT_TRANSFORM_Y);
                  const svg = d3.select(svgRef.current);
                  svg.transition()
                    .duration(750)
                    .call(zoomRef.current.transform, defaultTransform);
                  // Clear stored transform and reset to default
                  setCurrentZoomTransform(null);
                  // The zoom event handler will automatically update showResetButton
                }
              }}
              variant="outlined"
              size="small"
              startIcon={<ArrowCounterClockwise size={16} />}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                },
                minWidth: 'auto',
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              Reset Map
            </Button>
          )}
          
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
            id="table-container"  
            className="table-container"
            style={{
              flex: '5',
              height: '700px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Timeline Period Card */}
            <Paper
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: 2,
                p: 2.5,
                flexShrink: 0
              }}
            >
              <MigrationAnalysisPeriod
                selectedPeriod={selectedPeriod}
                onPeriodChange={(periodId, startDate, endDate) => {
                  console.log('Period changed:', { periodId, startDate, endDate });
                  if (onPeriodChange) {
                    onPeriodChange(periodId, startDate, endDate);
                  }
                }}
              />
            </Paper>

            {/* Controls Card - Temporarily Hidden */}
            {/*
            <Paper
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: 2,
                p: 2.5,
                flexShrink: 0
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: 'text.secondary',
                  display: 'block',
                  mb: 2
                }}
              >
                Controls
              </Typography>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <TextField
                  label="Threshold"
                  type="number"
                  size="small"
                  value={migrationThreshold}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (onThresholdChange) {
                      if (inputValue === '') {
                        onThresholdChange(0);
                      } else {
                        const value = parseInt(inputValue, 10);
                        if (!isNaN(value) && value >= 0) {
                          onThresholdChange(value);
                        }
                      }
                    }
                  }}
                  InputProps={{
                    inputProps: { min: 0, step: 1 }
                  }}
                  sx={{ width: 140 }}
                />

                <FormControl size="small" sx={{ width: 180 }}>
                  <InputLabel>Display Format</InputLabel>
                  <Select
                    value={selectedUnits}
                    label="Display Format"
                    onChange={(e) => setSelectedUnits(e.target.value as 'thousands' | 'units')}
                  >
                    <MenuItem value="thousands">Thousands (K)</MenuItem>
                    <MenuItem value="units">Raw Units</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
            */}

            {/* Flow Details Card */}
            {apiResponse && apiResponse.flows && (
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: 0
                }}
              >
                <Box sx={{ p: 2.5, flexShrink: 0 }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: '#374151',
                  }}>
                    Flow Details
                  </h3>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    marginBottom: '16px'
                  }}>
                    * {selectedUnits === 'thousands' ? 'thousands people/month' : 'people/month'}
                  </div>
                  
                  {/* Filter indicator */}
                  {selectedNodeId && (() => {
                    const selectedNode = activeNodes.find(n => n.id === selectedNodeId);
                    return selectedNode ? (
                      <div style={{
                        padding: '8px 16px',
                        backgroundColor: '#dbeafe',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#1e40af',
                        fontWeight: '500',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>📍 Showing flows involving: <strong>{selectedNode.tooltip}</strong></span>
                        <button
                          onClick={() => {
                            setSelectedNodeId(null);
                            // Reset all node appearances to neutral colors
                            d3.selectAll('[data-node-id] .node')
                              .style('fill', '#e5e7eb')
                              .style('stroke', '#6b7280')
                              .style('stroke-width', function() {
                                const baseStrokeWidth = 3;
                                const currentTransform = d3.zoomTransform(svgRef.current!);
                                const zoomLevel = currentTransform.k;
                                const scaleFactor = Math.max(0.05, 1 / zoomLevel);
                                return `${baseStrokeWidth * scaleFactor}px`;
                              });
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid #2563eb',
                            borderRadius: '4px',
                            color: '#1e40af',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Clear Filter
                        </button>
                      </div>
                    ) : null;
                  })()}
                  </Box>
                  
                  {/* Scrollable Flow Cards Container */}
                  <Box sx={{ 
                    flex: 1,
                    overflowY: 'auto',
                    px: 2.5,
                    pb: 2.5,
                    minHeight: 0
                  }}>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(470px, 100%), 1fr))',
                      gap: 1.5,
                      p: 2,
                      backgroundColor: '#f9fafb',
                      borderRadius: 1
                    }}>
                    {(() => {
                      // Filter flows for the selected period
                      let filteredFlows = apiResponse.flows
                        .filter(flow => flow.time_period_id === selectedPeriod || 
                                       (selectedPeriod && !apiResponse.time_periods.find(tp => tp.id === selectedPeriod) && 
                                        flow.time_period_id === apiResponse.time_periods[0]?.id));

                      // Additional filter based on selected node
                      if (selectedNodeId) {
                        const selectedNode = activeNodes.find(n => n.id === selectedNodeId);
                        if (selectedNode) {
                          filteredFlows = filteredFlows.filter(flow => 
                            flow.origin.name === selectedNode.tooltip || 
                            flow.destination.name === selectedNode.tooltip
                          );
                        }
                      }

                      // Group bidirectional flows and identify self-loops
                      const processedFlows = new Map<string, {
                        fromLocation: string;
                        toLocation: string;
                        flowCount: number;
                        returnFlowCount: number;
                        key: string;
                      }>();
                      const selfLoops: {
                        location: string;
                        flowCount: number;
                        isSelfLoop: true;
                        key: string;
                      }[] = [];

                      filteredFlows.forEach(flow => {
                        const originId = flow.origin.id;
                        const destinationId = flow.destination.id;

                        // Check for self-loops
                        if (originId === destinationId) {
                          selfLoops.push({
                            location: flow.origin.name,
                            flowCount: flow.flow_count,
                            isSelfLoop: true,
                            key: `self-${originId}`
                          });
                          return;
                        }

                        // Create a consistent key for bidirectional flows
                        const flowKey = [originId, destinationId].sort().join('-');

                        if (processedFlows.has(flowKey)) {
                          // This is the return flow
                          const existingFlow = processedFlows.get(flowKey);
                          if (existingFlow) {
                            existingFlow.returnFlowCount = flow.flow_count;
                          }
                        } else {
                          // This is the first flow in this direction
                          processedFlows.set(flowKey, {
                            fromLocation: flow.origin.name,
                            toLocation: flow.destination.name,
                            flowCount: flow.flow_count,
                            returnFlowCount: 0,
                            key: flowKey
                          });
                        }
                      });

                      // Combine processed flows and self-loops
                      type FlowData = {
                        fromLocation: string;
                        toLocation: string;
                        flowCount: number;
                        returnFlowCount: number;
                        key: string;
                        isSelfLoop?: false;
                      } | {
                        location: string;
                        flowCount: number;
                        key: string;
                        isSelfLoop: true;
                      };

                      const allFlows: FlowData[] = [
                        ...Array.from(processedFlows.values()).map(flow => ({ ...flow, isSelfLoop: false as const })),
                        ...selfLoops
                      ];

                      return allFlows.map((flowData) => {
                        // Generate flow key for visibility tracking
                        const flowKey = flowData.isSelfLoop 
                          ? `self-${flowData.key}` 
                          : flowData.key;
                        
                        // Get current visibility settings
                        const visibility = flowVisibility[flowKey] || { moveIn: true, moveOut: true };
                        
                        // Check if flows meet threshold
                        const moveInPassesThreshold = flowData.flowCount >= migrationThreshold;
                        const moveOutPassesThreshold = flowData.isSelfLoop ? true : (flowData.returnFlowCount >= migrationThreshold);
                        
                        return (
                          <div 
                            key={flowData.key}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '8px',
                              padding: '12px',
                              border: '1px solid #e5e7eb',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            {/* Location Colors Header */}
                            {!flowData.isSelfLoop ? (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                padding: '4px 0',
                                borderBottom: '1px solid #f3f4f6'
                              }}>
                                <ColorPicker
                                  currentColor={getEdgeColor(flowData.key, 0)}
                                  onColorChange={(color) => {
                                    if (onEdgeColorsChange) {
                                      onEdgeColorsChange({
                                        ...edgeColors,
                                        [flowData.key]: color
                                      });
                                    }
                                  }}
                                  label={`${flowData.fromLocation} → ${flowData.toLocation} Edge Color`}
                                />
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#374151',
                                  marginLeft: '8px'
                                }}>
                                  {flowData.fromLocation} ↔ {flowData.toLocation}
                                </span>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 0',
                                borderBottom: '1px solid #f3f4f6'
                              }}>
                                <ColorPicker
                                  currentColor={getEdgeColor(flowData.key, 0)}
                                  onColorChange={(color) => {
                                    if (onEdgeColorsChange) {
                                      onEdgeColorsChange({
                                        ...edgeColors,
                                        [flowData.key]: color
                                      });
                                    }
                                  }}
                                  label={`${flowData.location} Internal Flow Color`}
                                />
                                <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                                  {flowData.location} (Internal Flow)
                                </span>
                              </div>
                            )}
                            
                            {/* Checkbox Controls */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 0',
                              borderBottom: '1px solid #f3f4f6'
                            }}>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                                Show in Map:
                              </div>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {!flowData.isSelfLoop && (
                                  <>
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px',
                                      color: moveInPassesThreshold ? '#374151' : '#9ca3af',
                                      cursor: moveInPassesThreshold ? 'pointer' : 'not-allowed'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={visibility.moveIn}
                                        disabled={!moveInPassesThreshold}
                                        onChange={(e) => {
                                          if (onFlowVisibilityChange) {
                                            const newVisibility = {
                                              ...flowVisibility,
                                              [flowKey]: {
                                                ...flowVisibility[flowKey],
                                                moveIn: e.target.checked
                                              }
                                            };
                                            onFlowVisibilityChange(newVisibility);
                                          }
                                        }}
                                        style={{
                                          cursor: moveInPassesThreshold ? 'pointer' : 'not-allowed'
                                        }}
                                      />
                                      Move In ({flowData.flowCount.toLocaleString()})
                                    </label>
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px',
                                      color: moveOutPassesThreshold ? '#374151' : '#9ca3af',
                                      cursor: moveOutPassesThreshold ? 'pointer' : 'not-allowed'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={visibility.moveOut}
                                        disabled={!moveOutPassesThreshold}
                                        onChange={(e) => {
                                          if (onFlowVisibilityChange) {
                                            const newVisibility = {
                                              ...flowVisibility,
                                              [flowKey]: {
                                                ...flowVisibility[flowKey],
                                                moveOut: e.target.checked
                                              }
                                            };
                                            onFlowVisibilityChange(newVisibility);
                                          }
                                        }}
                                        style={{
                                          cursor: moveOutPassesThreshold ? 'pointer' : 'not-allowed'
                                        }}
                                      />
                                      Move Out ({flowData.returnFlowCount.toLocaleString()})
                                    </label>
                                  </>
                                )}
                                {flowData.isSelfLoop && (
                                  <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    color: moveInPassesThreshold ? '#374151' : '#9ca3af',
                                    cursor: moveInPassesThreshold ? 'pointer' : 'not-allowed'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={visibility.moveIn}
                                      disabled={!moveInPassesThreshold}
                                      onChange={(e) => {
                                        if (onFlowVisibilityChange) {
                                          const newVisibility = {
                                            ...flowVisibility,
                                            [flowKey]: {
                                              ...flowVisibility[flowKey],
                                              moveIn: e.target.checked
                                            }
                                          };
                                          onFlowVisibilityChange(newVisibility);
                                        }
                                      }}
                                      style={{
                                        cursor: moveInPassesThreshold ? 'pointer' : 'not-allowed'
                                      }}
                                    />
                                    Internal Flow ({flowData.flowCount.toLocaleString()})
                                  </label>
                                )}
                              </div>
                            </div>
                            
                            {/* Migration Flow Diagram */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              <MigrationFlowDiagram
                                fromLocation={flowData.isSelfLoop ? flowData.location : flowData.fromLocation}
                                toLocation={flowData.isSelfLoop ? flowData.location : flowData.toLocation}
                                flowCount={flowData.flowCount}
                                returnFlowCount={flowData.isSelfLoop ? undefined : flowData.returnFlowCount}
                                units={selectedUnits}
                                width={430}
                                height={90}
                                isSelfLoop={flowData.isSelfLoop}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                    </Box>
                  </Box>
              </Paper>
            )}
          </div>
      </div>
    </div>
  );
};

export default NodeFlowAnimation;