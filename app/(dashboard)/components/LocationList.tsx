'use client';

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  useTheme
} from '@mui/material';
import {
  MapPinAreaIcon,
  MapPinSimpleIcon,
  TrainRegionalIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';
import { ThailandRegion, getRegionDisplayName } from '../../services/api/province-regions';

interface LocationSectionProps {
  title: string;
  locations: Location[];
  icon: React.ReactNode;
  selectedLocationsCount: number;
  onLocationSelect: (location: Location) => void;
  maxLocations?: number;
}

function LocationSection({ 
  title, 
  locations, 
  icon, 
  selectedLocationsCount, 
  onLocationSelect,
  maxLocations
}: LocationSectionProps) {
  const theme = useTheme();

  if (locations.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography 
        variant="overline"
        sx={{ 
          display: 'block',
          mb: 2, 
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'text.secondary',
          letterSpacing: 1.2
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {locations.map((location) => (
          <Paper
            key={location.id}
            elevation={0}
            onClick={canAddMoreLocations(selectedLocationsCount, maxLocations) ? () => onLocationSelect(location) : undefined}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              cursor: canAddMoreLocations(selectedLocationsCount, maxLocations) ? 'pointer' : 'not-allowed',
              opacity: canAddMoreLocations(selectedLocationsCount, maxLocations) ? 1 : 0.5,
              backgroundColor: canAddMoreLocations(selectedLocationsCount, maxLocations) ? 'background.paper' : 'action.disabledBackground',
              transition: 'all 0.2s ease-in-out',
              '&:hover': canAddMoreLocations(selectedLocationsCount, maxLocations) ? {
                backgroundColor: 'action.hover',
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
                boxShadow: 2
              } : {},
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                mt: 0.5,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center'
              }}>
                {icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                  {location.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  {location.description}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

interface LocationListProps {
  filteredProvinces: Location[];
  filteredDistricts: Location[];
  filteredSubDistricts: Location[];
  selectedLocationsCount: number;
  searchedRegion?: ThailandRegion | null;
  onLocationSelect: (location: Location) => void;
  maxLocations?: number;
}

export function LocationList({
  filteredProvinces,
  filteredDistricts,
  filteredSubDistricts,
  selectedLocationsCount,
  searchedRegion,
  onLocationSelect,
  maxLocations
}: LocationListProps) {
  const theme = useTheme();

  const getProvinceSectionTitle = () => {
    if (searchedRegion) {
      const regionName = getRegionDisplayName(searchedRegion);
      return `PROVINCES IN ${regionName.toUpperCase()}`;
    }
    return 'PROVINCE';
  };

  return (
    <>
      <LocationSection
        title={getProvinceSectionTitle()}
        locations={filteredProvinces}
        icon={<TrainRegionalIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
        maxLocations={maxLocations}
      />

      <LocationSection
        title="DISTRICT"
        locations={filteredDistricts}
        icon={<MapPinAreaIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
        maxLocations={maxLocations}
      />

      <LocationSection
        title="SUB DISTRICT"
        locations={filteredSubDistricts}
        icon={<MapPinSimpleIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
        maxLocations={maxLocations}
      />
    </>
  );
}