"use client"
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Box, Slider, Typography, Button, Snackbar, Alert } from '@mui/material';
import { ContentCopy, Share } from '@mui/icons-material';
import { 
  generateThailandHexagonsFromCoordinates, 
  REGION_COLORS} from './thailand-map-data';
import { 
  generateNodesFromAdministrativeUnits} from './thailand-map-utils';
import { 
  loadAdministrativeData, 
  type ProcessedAdministrativeData 
} from '@/app/services/data-loader/thailand-administrative-data';
import type { MigrationResponse } from '@/app/services/api';
import MigrationFlowDiagram from '@/components/migration-flow-diagram';
import CitationFooter from '../citation-footer/citation-footer';

// Default transform constants
const DEFAULT_TRANSFORM_SCALE = 2;
const DEFAULT_TRANSFORM_X = 175.8644263369394;
const DEFAULT_TRANSFORM_Y = 147.29254719698156;

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
  apiResponse?: MigrationResponse | null; // Add apiResponse prop for table data
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
  onPeriodChange,
  apiResponse
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for administrative data
  const [administrativeData, setAdministrativeData] = useState<ProcessedAdministrativeData | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // State for units selection
  const [selectedUnits, setSelectedUnits] = useState<'thousands' | 'units'>('thousands');

  // State for node click interaction
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // State for zoom level to dynamically size nodes (for initial render only)
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(DEFAULT_TRANSFORM_SCALE);

  // State to track current transform (to make it persistent)
  const [currentTransform, setCurrentTransform] = useState<d3.ZoomTransform | null>(null);

  // Ref to avoid dependency issues in useEffect
  const selectedNodeIdRef = useRef<string | null>(null);
  
  // Ref to track if initial transform has been applied
  const initialTransformApplied = useRef<boolean>(false);
  
  // Update ref when selectedNodeId changes
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

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


  // Use container size if no width/height provided
  const containerSize = useContainerSize(containerRef);
  const width = propWidth || containerSize.width;
  const height = propHeight || containerSize.height;

  // Calculate center position for Thailand map
  // Approximate Thailand map bounds (based on hexagon layout)
  const mapWidth = 200; // Approximate width of Thailand hexagon layout
  const mapHeight = 300; // Approximate height of Thailand hexagon layout
  
  // Center the map in the container
  const centerX = 100 ; // Center the map
  const centerY = 0;

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
  const activeConnections = connections || [];

  // Helper function to determine if an edge should be visible based on selected node
  const isEdgeVisible = (connection: Connection, selectedNodeId: string | null): boolean => {
    if (!selectedNodeId) return true; // Show all edges when no node is selected
    return connection.fromNodeId === selectedNodeId || connection.toNodeId === selectedNodeId;
  };

  // Function to calculate dynamic node size based on zoom level
  const getDynamicNodeSize = useCallback((baseSize: number, zoomLevel: number): number => {
    // As zoom increases, make nodes smaller to prevent them from covering edges
    // Use more aggressive inverse relationship with a minimum size limit
    const scaleFactor = Math.max(0.2, 1 / zoomLevel); // Minimum 20% of original size, more aggressive scaling
    return baseSize * scaleFactor;
  }, []);

  // Function to update edge visibility based on selected node
  const updateEdgeVisibility = useCallback((selectedNodeId: string | null) => {
    if (!selectedNodeId) {
      // Show all edges when no node is selected
      d3.selectAll('.flowline-to, .flowline-from').style('opacity', 0.7);
      return;
    }

    // Get the selected node's title for comparison
    const selectedNode = activeNodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    // Update "to" paths
    d3.selectAll('.flowline-to').style('opacity', function() {
      const fromNode = d3.select(this).attr('data-from-node');
      const toNode = d3.select(this).attr('data-to-node');
      const isRelated = fromNode === selectedNode.title || toNode === selectedNode.title;
      return isRelated ? 0.7 : 0.1;
    });

    // Update "from" paths  
    d3.selectAll('.flowline-from').style('opacity', function() {
      const fromNode = d3.select(this).attr('data-from-node');
      const toNode = d3.select(this).attr('data-to-node');
      const isRelated = fromNode === selectedNode.title || toNode === selectedNode.title;
      return isRelated ? 0.7 : 0.1;
    });
  }, [activeNodes]);



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
      .scaleExtent([2, 10]) // Allow zoom from 70% to 1000% (prevents map from being too small)
      .translateExtent([[-500, -200], [width, height + 100]]) // Pan boundaries (with padding)
      .on('zoom', function(event) {
        mainContainer.attr('transform', event.transform);
        console.log("zoom: ", event.transform);
        
        // Save current transform to state (for persistence)
        setCurrentTransform(event.transform);
        
        // Update node sizes directly without React state updates
        const zoomLevel = event.transform.k;
        
        // Update node sizes based on zoom level with more aggressive scaling
        d3.selectAll('.node').attr('r', function() {
          const element = this as Element;
          const parentElement = element.parentNode as SVGGElement;
          if (!parentElement) return 20; // fallback size
          const nodeGroup = d3.select(parentElement);
          const nodeId = nodeGroup.attr('data-node-id');
          const node = activeNodes.find(n => n.id === nodeId);
          if (!node) return 20; // fallback size
          const scaleFactor = Math.max(0.2, 1 / zoomLevel); // More aggressive scaling, minimum 20%
          return (node.size * 2) * scaleFactor;
        });

        // Update text size to scale more aggressively with zoom
        d3.selectAll('.node-title').style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = Math.max(0.4, 1 / zoomLevel); // More aggressive scaling, minimum 40%
          return `${baseFontSize * scaleFactor}px`;
        });

        // Update border thickness based on zoom level
        d3.selectAll('.node').style('stroke-width', function() {
          const baseStrokeWidth = 3;
          const scaleFactor = Math.max(0.3, 1 / zoomLevel); // Scale border thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow line thickness based on zoom level
        d3.selectAll('.flowline-to, .flowline-from').style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const scaleFactor = Math.max(0.3, 1 / zoomLevel); // Scale line thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow marker sizes based on zoom level
        const arrowScaleFactor = Math.max(0.3, 1 / zoomLevel);
        d3.selectAll('#arrow-to, #arrow-from')
          .attr('markerWidth', 4 * arrowScaleFactor)
          .attr('markerHeight', 4 * arrowScaleFactor);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Map dimensions and centering (already calculated above for node generation)
    
    // Set initial zoom to use the specified default transform (only once)
    if (!initialTransformApplied.current) {
      const initialTransform = d3.zoomIdentity
        .translate(DEFAULT_TRANSFORM_X, DEFAULT_TRANSFORM_Y)
        .scale(DEFAULT_TRANSFORM_SCALE);

      svg.call(zoom.transform, initialTransform);
      initialTransformApplied.current = true;
    }

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
      // Draw "to" paths (blue, with negative flow rates)
      activeConnections.forEach(conn => {
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
        const toNode = activeNodes.find(n => n.id === conn.toNodeId);
        
        // Skip if either node is not found (e.g., "Other Provinces" aggregated data)
        if (!fromNode || !toNode) {
          console.log(`Skipping connection visualization: ${conn.fromNodeId} -> ${conn.toNodeId} (missing node data)`);
          return;
        }
        
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
        const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
        const toNode = activeNodes.find(n => n.id === conn.toNodeId);
        
        // Skip if either node is not found (e.g., "Other Provinces" aggregated data)
        if (!fromNode || !toNode) {
          return;
        }
        
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
          .attr('data-node-id', node.id)
          .attr('transform', `translate(${node.x}, ${node.y})`)
          .style('cursor', 'pointer');

        // Node circle
        nodeGroup.append('circle')
          .attr('class', 'node')
          .attr('r', getDynamicNodeSize(node.size * 2, currentZoomLevel));

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
              
              // Reset node appearance
              d3.select(this).select('.node')
                .style('fill', '#f3f4f6')
                .style('stroke', '#6b7280')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 3;
                  const scaleFactor = Math.max(0.3, 1 / currentZoomLevel);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
            } else {
              // Select new node
              setSelectedNodeId(node.id);
              
              // Reset all other nodes first
              d3.selectAll('.node')
                .style('fill', '#f3f4f6')
                .style('stroke', '#6b7280')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 3;
                  const scaleFactor = Math.max(0.3, 1 / currentZoomLevel);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
              
              // Highlight the selected node
              d3.select(this).select('.node')
                .style('fill', '#dbeafe')
                .style('stroke', '#2563eb')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 3; // Same thickness as unselected nodes
                  const scaleFactor = Math.max(0.3, 1 / currentZoomLevel);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
            }
          });
      });
      
      // Apply styles directly to D3 elements
      d3.selectAll('.node')
        .style('fill', '#f3f4f6')
        .style('stroke', '#6b7280')
        .style('stroke-width', function() {
          const baseStrokeWidth = 3;
          const scaleFactor = Math.max(0.3, 1 / currentZoomLevel); // Scale border thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        });

      d3.selectAll('.node-title')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = Math.max(0.4, 1 / currentZoomLevel); // More aggressive scaling, minimum 40%
          return `${baseFontSize * scaleFactor}px`;
        })
        .style('font-weight', 'bold')
        .style('fill', '#374151')
        .style('pointer-events', 'none');

      // Style "to" direction paths (blue)
      d3.selectAll('.flowline-to')
        .style('fill', 'none')
        .style('stroke', '#2563eb')
        .style('opacity', '0.7')
        .style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const scaleFactor = Math.max(0.3, 1 / currentZoomLevel); // Scale line thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        })
        .style('stroke-dasharray', '8, 4');

      // Style "from" direction paths (red)
      d3.selectAll('.flowline-from')
        .style('fill', 'none')
        .style('stroke', '#888888')
        .style('opacity', '0.7')
        .style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const scaleFactor = Math.max(0.3, 1 / currentZoomLevel); // Scale line thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        })
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

      // Add A events to paths
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
    svg.append('text')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, activeNodes, activeConnections, curved, getDynamicNodeSize]);

  // Separate useEffect for handling node selection changes (without resetting the visualization)
  useEffect(() => {
    if (selectedNodeId) {
      updateEdgeVisibility(selectedNodeId);
    } else {
      updateEdgeVisibility(null);
    }
  }, [selectedNodeId, updateEdgeVisibility]);

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
            flex: '1',
            height: '700px',
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
            id="table-container"  
            className="table-container"
            style={{
              flex: '1',
              height  : '700px',
              overflowY: 'unset'
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

            {/* Migration Flow Data - Visual Diagrams */}
            {apiResponse && apiResponse.flows && (
              <>
            <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                      margin: 0,
                color: '#374151'
              }}>
                Migration Flow Data
              </h3>
                    
                    {/* Units Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>Display as:</span>
                      <select
                        value={selectedUnits}
                        onChange={(e) => setSelectedUnits(e.target.value as 'thousands' | 'units')}
                        style={{
                          padding: '4px 8px',
                fontSize: '14px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="thousands">Thousands (K)</option>
                        <option value="units">Raw Units</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
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
                        <span>📍 Showing flows involving: <strong>{selectedNode.title}</strong></span>
                        <button
                          onClick={() => {
                            setSelectedNodeId(null);
                            // Reset all node appearances
                            d3.selectAll('.node')
                              .style('fill', '#f3f4f6')
                              .style('stroke', '#6b7280')
                              .style('stroke-width', function() {
                                const baseStrokeWidth = 3;
                                const scaleFactor = Math.max(0.3, 1 / currentZoomLevel);
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
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(470px, 100%), 1fr))',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    height: '400px',
                    overflowY: 'auto'
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
                            flow.origin.name === selectedNode.title || 
                            flow.destination.name === selectedNode.title
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

                      return allFlows.map((flowData, index) => (
                        <div 
                          key={flowData.key}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            padding: '8px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <MigrationFlowDiagram
                            fromLocation={flowData.isSelfLoop ? flowData.location : flowData.fromLocation}
                            toLocation={flowData.isSelfLoop ? flowData.location : flowData.toLocation}
                            flowCount={flowData.flowCount}
                            returnFlowCount={flowData.isSelfLoop ? undefined : flowData.returnFlowCount}
                            units={selectedUnits}
                            width={450}
                            height={90}
                            isSelfLoop={flowData.isSelfLoop}
                          />
            </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
    </div>
  );
};

export default NodeFlowAnimation;