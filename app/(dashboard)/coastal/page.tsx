'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import CountrySelector, { FlagBadge } from './components/CountrySelector';
import { LocationSearch } from './components/LocationSearch';
import type { CoastalCountry } from '@/types/coastal';
import { resolveCoastalLocations } from './data/provinces';

function resolveIso(country: CoastalCountry | null): string {
  return country ? country.iso || country.country_iso || '' : '';
}

function CoastalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetParam = searchParams.get('target');

  const [selectedCountry, setSelectedCountry] = useState<CoastalCountry | null>(null);
  const [dashboardTarget, setDashboardTarget] = useState<'indicators' | 'vessels'>(
    targetParam === 'vessels' ? 'vessels' : 'indicators'
  );

  useEffect(() => {
    if (targetParam === 'vessels' || targetParam === 'indicators') {
      setDashboardTarget(targetParam);
    }
  }, [targetParam]);

  const iso = resolveIso(selectedCountry);

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Coastal Waters Analysis
        </Typography>
        <Tabs
          value={dashboardTarget}
          onChange={(_, val) => setDashboardTarget(val)}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.5,
              px: 2,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '14px',
            },
          }}
        >
          <Tab value="indicators" label="Indicators Analysis" />
          <Tab value="vessels" label="Vessel Types" />
        </Tabs>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
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
                  const { aoiIds, names } = resolveCoastalLocations(locations, iso);
                  const params = new URLSearchParams();
                  params.set('country', iso);
                  params.set('aois', aoiIds.join(','));
                  params.set('names', names.join(','));
                  const targetRoute = dashboardTarget === 'vessels' ? '/coastal/vessels' : '/coastal/indicators';
                  router.push(`${targetRoute}?${params.toString()}`);
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

export default function CoastalPage() {
  return (
    <Suspense fallback={null}>
      <CoastalPageContent />
    </Suspense>
  );
}

