'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, Stack, Typography } from '@mui/material';
import CountrySelector, { FlagBadge } from './components/CountrySelector';
import { LocationSearch } from './components/LocationSearch';
import type { CoastalCountry } from '@/types/coastal';

function resolveIso(country: CoastalCountry | null): string {
  return country ? country.iso || country.country_iso || '' : '';
}

export default function CoastalPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<CoastalCountry | null>(null);
  const iso = resolveIso(selectedCountry);

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
            Select a Country
          </Typography>
          <CountrySelector selectedIso={iso || null} onSelect={setSelectedCountry} />
        </Box>
        <Paper
          variant="outlined"
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            minHeight: 300,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedCountry ? (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <FlagBadge iso={iso} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {selectedCountry.name}
                </Typography>
              </Stack>
              <LocationSearch
                countryIso={iso}
                onSubmit={(locations) => {
                  const aoiIds = locations.map((location) => location.aoi_id);
                  const params = new URLSearchParams();
                  params.set('country', iso);
                  params.set('aois', aoiIds.join(','));
                  router.push(`/coastal/indicators?${params.toString()}`);
                }}
              />
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="text.secondary">
                Select a <Box component="span" sx={{ fontWeight: 700 }}>country</Box> to proceed
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
