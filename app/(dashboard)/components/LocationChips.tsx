'use client';

import { Box, Typography, Chip, useTheme } from '@mui/material';
import { 
  MapPinAreaIcon,
  MapPinSimpleIcon,
  TrainRegionalIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Location, getLocationColor } from '../helper';
import { LOCATION_CONSTRAINTS, shouldShowWarning, getRemainingSlots } from '../constraints';

interface LocationChipsProps {
  selectedLocations: Location[];
  highlightedForDeletion: number | null;
  onLocationRemove: (locationId: number) => void;
  maxLocations?: number; // Optional custom max locations limit
}

export function LocationChips({ 
  selectedLocations, 
  highlightedForDeletion, 
  onLocationRemove,
  maxLocations 
}: LocationChipsProps) {
  const theme = useTheme();

  if (selectedLocations.length === 0) return null;

  // Use custom maxLocations or default to LOCATION_CONSTRAINTS
  const effectiveMaxLocations = maxLocations || LOCATION_CONSTRAINTS.MAX_TOTAL_LOCATIONS;
  const remainingSlots = Math.max(0, effectiveMaxLocations - selectedLocations.length);
  const shouldWarn = selectedLocations.length >= effectiveMaxLocations - 3; // Warn when 3 or fewer slots remain

  const getLocationIcon = (type: Location['type']) => {
    switch (type) {
      case 'province': return <TrainRegionalIcon size={16} />;
      case 'district': return <MapPinAreaIcon size={16} />;
      case 'subDistrict': return <MapPinSimpleIcon size={16} />;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
          Selected state{selectedLocations.length > 1 ? 's' : ''} ({selectedLocations.length})
        </Typography>
        <Typography 
          variant="caption" 
          color={shouldWarn ? "warning.main" : "text.secondary"}
          sx={{ fontWeight: 'medium' }}
        >
          {remainingSlots} remaining
        </Typography>
      </Box>
      {shouldWarn && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
          ⚠️ Approaching limit of {effectiveMaxLocations} locations
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {selectedLocations.map((location) => (
          <Chip
            key={location.id}
            icon={getLocationIcon(location.type)}
            label={location.name}
            color={getLocationColor(location.type)}
            onDelete={() => onLocationRemove(location.id)}
            size="medium"
            sx={{ 
              fontWeight: 'medium',
              ...(highlightedForDeletion === location.id && {
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.contrastText,
                '& .MuiChip-icon': {
                  color: theme.palette.error.contrastText,
                },
                '& .MuiChip-deleteIcon': {
                  color: theme.palette.error.contrastText,
                  '&:hover': {
                    color: theme.palette.error.dark,
                  }
                },
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                  '100%': { opacity: 1 },
                }
              })
            }}
          />
        ))}
      </Box>
    </Box>
  );
}