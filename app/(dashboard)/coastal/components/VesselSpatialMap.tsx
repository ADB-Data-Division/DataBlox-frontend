'use client';

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import CoastalChoroplethMap from './CoastalChoroplethMap';
import type { SpatialStatus } from '../spatial-status';

export interface VesselSpatialMapProps {
  country: string;
  locationName: string;
  aoiIds?: string[];
  spatialSlice?: Record<string, any>;
  selectedCellIds?: string[];
  onSelectCell?: (cellId: string) => void;
  onClearSelection?: () => void;
  loading?: boolean;
  spatialStatus?: SpatialStatus;
  onRetrySpatial?: () => void;
  periodLabel?: string;
  height?: number | string;
}

export const VesselSpatialMap: React.FC<VesselSpatialMapProps> = ({
  country,
  locationName,
  aoiIds,
  spatialSlice,
  selectedCellIds = [],
  onSelectCell,
  onClearSelection,
  loading = false,
  spatialStatus,
  onRetrySpatial,
  periodLabel,
  height,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
      }}
    >
      {/* Map Area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 420,
          height: height ?? 440,
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <CoastalChoroplethMap
          country={country}
          locationName={locationName}
          aoiIds={aoiIds}
          activeIndicator="vessels"
          overlayVessels
          indicators={['vessels']}
          spatialSlice={spatialSlice}
          selectedCellIds={selectedCellIds}
          onSelectCell={(id) => onSelectCell?.(id)}
          onClearSelection={onClearSelection}
          loading={loading}
          spatialStatus={spatialStatus}
          onRetrySpatial={onRetrySpatial}
          periodLabel={periodLabel}
          height={height ?? 420}
        />
      </Box>

      {/* Right Legend Area */}
      <Card
        variant="outlined"
        sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0, borderRadius: 2 }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
            Legend
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}
          >
            Vessel Count
          </Typography>

          <Box
            sx={{
              height: 12,
              width: '100%',
              background:
                'linear-gradient(to right, rgb(254, 226, 226), rgb(153, 27, 27))',
              borderRadius: 1,
              mb: 1,
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              0
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              50+
            </Typography>
          </Box>

          <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Resolution: 7
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Cell Area: 4.5 km²
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VesselSpatialMap;
