'use client';

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import CoastalChoroplethMap from './CoastalChoroplethMap';

export interface VesselSpatialMapProps {
  country: string;
  locationName: string;
  aoiIds?: string[];
  spatialSlice?: Record<string, any>;
  selectedCellId?: string | null;
  onSelectCell?: (cellId: string) => void;
  loading?: boolean;
  periodLabel?: string;
}

export const VesselSpatialMap: React.FC<VesselSpatialMapProps> = ({
  country,
  locationName,
  aoiIds,
  spatialSlice,
  selectedCellId,
  onSelectCell,
  loading = false,
  periodLabel,
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
          height: 440,
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
          spatialSlice={spatialSlice}
          selectedCellId={selectedCellId}
          onSelectCell={(id) => onSelectCell?.(id)}
          loading={loading}
          periodLabel={periodLabel}
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
