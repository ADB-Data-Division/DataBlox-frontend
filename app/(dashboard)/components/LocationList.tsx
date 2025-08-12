'use client';

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import {
  MapPinAreaIcon,
  MapPinSimpleIcon,
  TrainRegionalIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Location } from '../helper';
import { canAddMoreLocations } from '../constraints';

interface LocationSectionProps {
  title: string;
  locations: Location[];
  icon: React.ReactNode;
  selectedLocationsCount: number;
  onLocationSelect: (location: Location) => void;
}

function LocationSection({ 
  title, 
  locations, 
  icon, 
  selectedLocationsCount, 
  onLocationSelect 
}: LocationSectionProps) {
  const theme = useTheme();

  if (locations.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ 
          mb: 2, 
          fontWeight: 'bold', 
          textTransform: 'uppercase',
          letterSpacing: 1
        }}
      >
        {title}
      </Typography>
      <List disablePadding>
        {locations.map((location, index) => (
          <React.Fragment key={location.id}>
            <ListItem
              onClick={canAddMoreLocations(selectedLocationsCount) ? () => onLocationSelect(location) : undefined}
              sx={{
                px: 0,
                py: 1.5,
                cursor: canAddMoreLocations(selectedLocationsCount) ? 'pointer' : 'not-allowed',
                opacity: canAddMoreLocations(selectedLocationsCount) ? 1 : 0.5,
                backgroundColor: canAddMoreLocations(selectedLocationsCount) ? 'inherit' : theme.palette.action.disabled,
                '&:hover': canAddMoreLocations(selectedLocationsCount) ? {
                  backgroundColor: theme.palette.action.hover,
                  borderRadius: 1
                } : {},
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" fontWeight="medium">
                    {location.name}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {location.description}
                  </Typography>
                }
              />
            </ListItem>
            {index < locations.length - 1 && (
              <Divider sx={{ ml: 4.5 }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}

interface LocationListProps {
  filteredProvinces: Location[];
  filteredDistricts: Location[];
  filteredSubDistricts: Location[];
  selectedLocationsCount: number;
  onLocationSelect: (location: Location) => void;
}

export function LocationList({
  filteredProvinces,
  filteredDistricts,
  filteredSubDistricts,
  selectedLocationsCount,
  onLocationSelect
}: LocationListProps) {
  const theme = useTheme();

  return (
    <>
      <LocationSection
        title="PROVINCE"
        locations={filteredProvinces}
        icon={<TrainRegionalIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
      />

      <LocationSection
        title="DISTRICT"
        locations={filteredDistricts}
        icon={<MapPinAreaIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
      />

      <LocationSection
        title="SUB DISTRICT"
        locations={filteredSubDistricts}
        icon={<MapPinSimpleIcon size={20} color={theme.palette.text.primary} />}
        selectedLocationsCount={selectedLocationsCount}
        onLocationSelect={onLocationSelect}
      />
    </>
  );
}