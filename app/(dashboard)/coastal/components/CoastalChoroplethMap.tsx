import React, { useMemo, useState } from 'react';
import { Box, Typography, Tooltip, CircularProgress, Paper } from '@mui/material';

export interface CoastalChoroplethMapProps {
  country: string;
  activeIndicator: string;
  overlayVessels?: boolean;
  spatialSlice?: Record<string, any>;
  selectedCellId?: string | null;
  onSelectCell: (cellId: string) => void;
  loading?: boolean;
}

const HEX_RADIUS = 30;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;

// Generates a hexagon path
const getHexagonPath = (x: number, y: number, radius: number) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i - 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    points.push(`${x + radius * Math.cos(angle_rad)},${y + radius * Math.sin(angle_rad)}`);
  }
  return `M ${points.join(' L ')} Z`;
};

// Fallback grid generation
const generateFallbackGrid = () => {
  const grid: Record<string, any> = {};
  const rows = 5;
  const cols = 8;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `fallback_hex_${r}_${c}`;
      const x = c * HEX_WIDTH + (r % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2;
      const y = r * (HEX_HEIGHT * 0.75) + HEX_HEIGHT / 2;
      
      grid[id] = {
        id,
        x,
        y,
        chlor_a: Math.random() * 20,
        sst: 290 + Math.random() * 20,
        vessels: Math.floor(Math.random() * 100),
      };
    }
  }
  return grid;
};

// Color scales
const getChlorophyllColor = (value: number) => {
  if (value < 0) value = 0;
  if (value > 20) value = 20;
  
  // 0 to 10: green (#22c55e) to yellow (#eab308)
  // 10 to 20: yellow (#eab308) to red (#ef4444)
  if (value <= 10) {
    const t = value / 10;
    return interpolateColor('#22c55e', '#eab308', t);
  } else {
    const t = (value - 10) / 10;
    return interpolateColor('#eab308', '#ef4444', t);
  }
};

const getSSTColor = (value: number) => {
  if (value < 290) value = 290;
  if (value > 310) value = 310;
  
  const t = (value - 290) / 20;
  return interpolateColor('#a855f7', '#ef4444', t);
};

// Helper to interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
  const hex1 = color1.substring(1);
  const hex2 = color2.substring(1);
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export default function CoastalChoroplethMap({
  country,
  activeIndicator,
  overlayVessels = false,
  spatialSlice,
  selectedCellId,
  onSelectCell,
  loading = false,
}: CoastalChoroplethMapProps) {
  
  const cells = useMemo(() => {
    if (spatialSlice && Object.keys(spatialSlice).length > 0) {
      return spatialSlice;
    }
    return generateFallbackGrid();
  }, [spatialSlice]);

  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  const svgWidth = 8 * HEX_WIDTH + HEX_WIDTH;
  const svgHeight = 5 * (HEX_HEIGHT * 0.75) + HEX_HEIGHT;

  return (
    <Box position="relative" width="100%" display="flex" justifyContent="center" sx={{ overflow: 'hidden' }}>
      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        style={{ width: '100%', height: 'auto', maxWidth: '800px' }}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        <g>
          {Object.entries(cells).map(([id, cellData]: [string, any]) => {
            const isSelected = selectedCellId === id;
            
            let fillColor = '#cccccc';
            if (activeIndicator.toLowerCase().includes('chlorophyll')) {
              fillColor = getChlorophyllColor(cellData.chlor_a || 0);
            } else if (activeIndicator.toLowerCase().includes('surface') || activeIndicator.toLowerCase().includes('sst')) {
              fillColor = getSSTColor(cellData.sst || 290);
            }
            
            const cellPath = getHexagonPath(cellData.x, cellData.y, HEX_RADIUS);

            const tooltipContent = (
              <Box p={1}>
                <Typography variant="body2" fontWeight="bold">Hex: {id}</Typography>
                <Typography variant="caption" display="block">Resolution: 7</Typography>
                <Typography variant="caption" display="block">Area: 4.5 km²</Typography>
                <Typography variant="caption" display="block">Total Vessels: {cellData.vessels || 0}</Typography>
                <Typography variant="caption" display="block">Chlor_a (Avg.): {Number(cellData.chlor_a || 0).toFixed(2)} mg/m³</Typography>
                <Typography variant="caption" display="block">Sea Surface Temp (Avg.): {Number(cellData.sst || 290).toFixed(1)} K</Typography>
              </Box>
            );

            return (
              <Tooltip 
                key={id} 
                title={tooltipContent} 
                arrow 
                placement="top"
              >
                <g 
                  onClick={() => onSelectCell(id)}
                  onMouseEnter={() => setHoveredCell(id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={cellPath}
                    fill={fillColor}
                    stroke={isSelected ? '#ef4444' : '#ffffff'}
                    strokeWidth={isSelected ? 3 : 1}
                    opacity={hoveredCell && hoveredCell !== id ? 0.7 : 1}
                    style={{ transition: 'all 0.2s ease-in-out' }}
                  />
                  {overlayVessels && (
                    <text
                      x={cellData.x}
                      y={cellData.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#000000"
                      fontSize="14px"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {cellData.vessels || 0}
                    </text>
                  )}
                </g>
              </Tooltip>
            );
          })}
        </g>
      </svg>
    </Box>
  );
}
