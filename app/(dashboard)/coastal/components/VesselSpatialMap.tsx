'use client';

import React from 'react';
import { Box } from '@mui/material';
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
  clustersEnabled?: boolean;
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
  clustersEnabled,
}) => {
  return (
    <Box
      sx={{
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
        clustersEnabled={clustersEnabled}
      />
    </Box>
  );
};

export default VesselSpatialMap;
