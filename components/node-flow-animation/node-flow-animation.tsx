"use client"
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Button } from '@mui/material';
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

// // Default transform constants
// const DEFAULT_TRANSFORM_SCALE = 2;
// const DEFAULT_TRANSFORM_X = 175.8644263369394;
// const DEFAULT_TRANSFORM_Y = 147.29254719698156;

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
  selectedPeriod?: string;
  onPeriodChange?: (period: string, startDate: string, endDate: string) => void;
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

  // Ref to avoid dependency issues in useEffect
  const selectedNodeIdRef = useRef<string | null>(null);
  
  // Update ref when selectedNodeId changes
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);



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
  
  


  // Function to calculate dynamic node size based on zoom level
  const getDynamicNodeSize = useCallback((baseSize: number, zoomLevel?: number): number => {
    // Use current zoom level if not provided
    const currentZoom = zoomLevel ?? 2;
    // As zoom increases, make nodes smaller to prevent them from covering edges
    // Use more aggressive inverse relationship with a minimum size limit
    const scaleFactor = Math.max(0.2, 1 / currentZoom); // Minimum 20% of original size, more aggressive scaling
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
    const activeConnections = connections || [];

    // Create main container group for zoom functionality
    const mainContainer = svg.append('g')
      .attr('class', 'main-container');

    // Set up zoom behavior with pan constraints
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([2, 4.25]) // Allow zoom from 70% to 1000% (prevents map from being too small)
      .translateExtent([[0, -80], [500, 500]]) // Pan boundaries (with padding)
      .on('zoom', function(event) {
        mainContainer.attr('transform', event.transform);
        console.log("zoom: ", event.transform);
        const zoomLevel = event.transform.k;
        
        // Create consistent scaling functions available in this scope
        const getScaleFactor = (minScale: number) => Math.max(minScale, 1 / zoomLevel);
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

        // Update text size using consistent scaling
        d3.selectAll('.node-title').style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = getScaleFactor(0.4); // Minimum 40% scale
          return `${baseFontSize * scaleFactor}px`;
        });

        // Update border thickness using consistent scaling
        d3.selectAll('.node').style('stroke-width', function() {
          const baseStrokeWidth = 3;
          const scaleFactor = getScaleFactor(0.3); // Minimum 30% scale
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow line thickness using consistent scaling
        d3.selectAll('.flowline-to, .flowline-from').style('stroke-width', function() {
          const baseStrokeWidth = 5;
          const scaleFactor = getScaleFactor(0.3); // Minimum 30% scale
          return `${baseStrokeWidth * scaleFactor}px`;
        });

        // Update arrow marker sizes using consistent scaling
        const arrowScaleFactor = getScaleFactor(0.3);
        d3.selectAll('#arrow-to, #arrow-from')
          .attr('markerWidth', 4 * arrowScaleFactor)
          .attr('markerHeight', 4 * arrowScaleFactor);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom);

    svg.call(zoom.transform, d3.zoomIdentity.scale(2).translate(0, 0));

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
          .attr('r', getDynamicNodeSize(node.size * 2, 2));

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
                  const scaleFactor = Math.max(0.3, 1 / 2);
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
                  const scaleFactor = Math.max(0.3, 1 / 2);
                  return `${baseStrokeWidth * scaleFactor}px`;
                });
              
              // Highlight the selected node
              d3.select(this).select('.node')
                .style('fill', '#dbeafe')
                .style('stroke', '#2563eb')
                .style('stroke-width', function() {
                  const baseStrokeWidth = 3; // Same thickness as unselected nodes
                  const scaleFactor = Math.max(0.3, 1 / 2);
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
          const scaleFactor = Math.max(0.3, 1 / 2); // Scale border thickness, minimum 30%
          return `${baseStrokeWidth * scaleFactor}px`;
        });

      d3.selectAll('.node-title')
        .style('font-family', 'Arial, sans-serif')
        .style('font-size', function() {
          const baseFontSize = 12;
          const scaleFactor = Math.max(0.4, 1 / 2); // More aggressive scaling, minimum 40%
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
          const scaleFactor = Math.max(0.3, 1 / 2); // Scale line thickness, minimum 30%
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
          const scaleFactor = Math.max(0.3, 1 / 2); // Scale line thickness, minimum 30%
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
  }, [width, height, activeNodes, curved, getDynamicNodeSize, connections]);

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
            {/* Migration Analysis Period Component */}
            <MigrationAnalysisPeriod
              selectedPeriod={selectedPeriod}
              onPeriodChange={(periodId, startDate, endDate) => {
                console.log('Period changed:', { periodId, startDate, endDate });
                if (onPeriodChange) {
                  onPeriodChange(periodId, startDate, endDate);
                }
              }}
            />

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
                                const scaleFactor = Math.max(0.3, 1 / 2);
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

                      return allFlows.map((flowData) => (
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