import React, { useState } from 'react';
import { Box, Typography, Tooltip, Paper, CircularProgress } from '@mui/material';

export interface VesselSpatialMapProps {
  country: string;
  locationName: string;
  selectedCellId?: string | null;
  onSelectCell?: (cellId: string) => void;
  loading?: boolean;
}

interface HexagonData {
  id: string;
  q: number;
  r: number;
  totalVessels: number;
  cargo: number;
  tanker: number;
  avgDuration: string;
}

// Dummy data for demonstration purposes
const DUMMY_HEXAGONS: HexagonData[] = [
  { id: '878db5169ffffff', q: 0, r: 0, totalVessels: 49, cargo: 38, tanker: 11, avgDuration: '14.2 hours' },
  { id: '878db516affffff', q: 1, r: -1, totalVessels: 25, cargo: 21, tanker: 4, avgDuration: '72.2 hours' },
  { id: '878db516bffffff', q: -1, r: 1, totalVessels: 5, cargo: 3, tanker: 2, avgDuration: '5.5 hours' },
  { id: '878db516cffffff', q: 1, r: 0, totalVessels: 12, cargo: 10, tanker: 2, avgDuration: '10.0 hours' },
  { id: '878db516dffffff', q: -1, r: 0, totalVessels: 0, cargo: 0, tanker: 0, avgDuration: '0 hours' },
];

export const VesselSpatialMap: React.FC<VesselSpatialMapProps> = ({
  country,
  locationName,
  selectedCellId,
  onSelectCell,
  loading = false,
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Hexagon grid parameters
  const hexRadius = 40;
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = 2 * hexRadius;
  const xOffset = hexWidth;
  const yOffset = hexHeight * 0.75;

  // Calculate hexagon points
  const getHexPoints = (cx: number, cy: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(`${cx + hexRadius * Math.cos(angle)},${cy + hexRadius * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  // Interpolate color from light blue (#e0f2fe) to dark red (#ef4444) based on density
  const getColor = (density: number) => {
    const maxDensity = 50;
    const clampedDensity = Math.min(Math.max(density, 0), maxDensity);
    const ratio = clampedDensity / maxDensity;
    
    // Light blue: RGB(224, 242, 254)
    // Dark red: RGB(239, 68, 68)
    const r = Math.round(224 + (239 - 224) * ratio);
    const g = Math.round(242 + (68 - 242) * ratio);
    const b = Math.round(254 + (68 - 254) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const renderTooltipContent = (hex: HexagonData) => (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        Hex: {hex.id}
      </Typography>
      <Typography variant="body2">Resolution: 7</Typography>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
        Total: {hex.totalVessels} vessels
      </Typography>
      <Typography variant="body2">Cargo: {hex.cargo} vessels</Typography>
      <Typography variant="body2">Tanker: {hex.tanker} vessels</Typography>
      <Typography variant="body2">Port Call Duration (Avg.): {hex.avgDuration}</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Vessel Count By Type (Monthly) in {locationName}, {country}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Map Area */}
          <Paper
            sx={{
              flex: 1,
              height: 400,
              position: 'relative',
              overflow: 'hidden',
              bgcolor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="100%" height="100%" viewBox="-200 -200 400 400">
              {DUMMY_HEXAGONS.map((hex) => {
                const cx = hex.q * xOffset + (hex.r % 2 !== 0 ? xOffset / 2 : 0);
                const cy = hex.r * yOffset;
                const isSelected = selectedCellId === hex.id;
                const isHovered = hoveredCell === hex.id;

                return (
                  <Tooltip
                    key={hex.id}
                    title={renderTooltipContent(hex)}
                    arrow
                    placement="top"
                  >
                    <polygon
                      points={getHexPoints(cx, cy)}
                      fill={getColor(hex.totalVessels)}
                      stroke={isSelected ? '#000' : '#cbd5e1'}
                      strokeWidth={isSelected ? 3 : 1}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isHovered || isSelected ? 1 : 0.85,
                      }}
                      onClick={() => onSelectCell?.(hex.id)}
                      onMouseEnter={() => setHoveredCell(hex.id)}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  </Tooltip>
                );
              })}
            </svg>
          </Paper>

          {/* Legend Area */}
          <Paper sx={{ width: 250, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Legend
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Vessel Count
            </Typography>
            
            <Box
              sx={{
                height: 12,
                width: '100%',
                background: 'linear-gradient(to right, rgb(224, 242, 254), rgb(239, 68, 68))',
                borderRadius: 1,
                mb: 1,
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>0</Typography>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>50</Typography>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};
