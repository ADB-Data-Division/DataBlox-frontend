'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import { fetchCoastalCountries } from '@/services/coastalService';
import type { CoastalCountry } from '@/types/coastal';

interface CountrySelectorProps {
  selectedIso?: string | null;
  onSelect: (country: CoastalCountry) => void;
}

type SelectorStatus = 'loading' | 'error' | 'ready';

function resolveIso(country: CoastalCountry): string {
  return (country.iso || country.country_iso || '').toUpperCase();
}

export function FlagBadge({ iso }: { iso: string }) {
  if (iso === 'BGD') {
    return (
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 22,
          flexShrink: 0,
          borderRadius: 0.5,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#006A4E',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '38%',
            transform: 'translate(-50%, -50%)',
            width: 11,
            height: 11,
            borderRadius: '50%',
            backgroundColor: '#F42A41',
          }}
        />
      </Box>
    );
  }

  if (iso === 'IDN') {
    return (
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 22,
          flexShrink: 0,
          borderRadius: 0.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ height: '50%', backgroundColor: '#CE1126' }} />
        <Box sx={{ height: '50%', backgroundColor: '#FFFFFF' }} />
      </Box>
    );
  }

  if (iso === 'PHL') {
    return (
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 22,
          flexShrink: 0,
          borderRadius: 0.5,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ height: '50%', backgroundColor: '#0038A8' }} />
        <Box sx={{ height: '50%', backgroundColor: '#CE1126' }} />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '55%',
            height: '100%',
            backgroundColor: '#FFFFFF',
            clipPath: 'polygon(0 0, 62% 50%, 0 100%)',
          }}
        />
      </Box>
    );
  }

  if (iso === 'THA') {
    return (
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 22,
          flexShrink: 0,
          borderRadius: 0.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          backgroundImage:
            'linear-gradient(to bottom, #A51931 16.6%, #F4F5F8 16.6% 33.3%, #2D2A4A 33.3% 66.6%, #F4F5F8 66.6% 83.3%, #A51931 83.3%)',
        }}
      />
    );
  }

  return (
    <Box
      aria-hidden
      sx={{
        width: 34,
        height: 22,
        flexShrink: 0,
        borderRadius: 0.5,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.200',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.secondary' }}>
        {iso}
      </Typography>
    </Box>
  );
}

export default function CountrySelector({ selectedIso, onSelect }: CountrySelectorProps) {
  const theme = useTheme();
  const [countries, setCountries] = useState<CoastalCountry[]>([]);
  const [status, setStatus] = useState<SelectorStatus>('loading');

  const runFetch = useCallback(
    () =>
      fetchCoastalCountries()
        .then((data) => {
          setCountries(data);
          setStatus('ready');
        })
        .catch(() => {
          setStatus('error');
        }),
    []
  );

  const retryLoad = useCallback(() => {
    setStatus('loading');
    runFetch();
  }, [runFetch]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      ),
    [countries]
  );

  const cardSx = (isSelected: boolean) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    px: 2,
    py: 1.75,
    borderRadius: 2,
    backgroundColor: 'background.paper',
    border: '2px solid',
    borderColor: isSelected ? '#1E88E5' : 'divider',
    boxShadow: isSelected ? '0 0 0 4px rgba(30, 136, 229, 0.12)' : 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ...(isSelected
      ? {}
      : {
          '&:hover': {
            borderColor: theme.palette.error.main,
          },
        }),
  });

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 560 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" sx={{ width: 168, height: 56, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ maxWidth: 560 }}>
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          Could not load countries.
        </Alert>
        <Button
          variant="outlined"
          onClick={retryLoad}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (sortedCountries.length === 0) {
    return (
      <Box sx={{ maxWidth: 560 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No countries are available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 560 }}>
      {sortedCountries.map((country) => {
        const iso = resolveIso(country);
        const isSelected = Boolean(selectedIso) && selectedIso === iso;
        return (
          <ButtonBase
            key={country.id || iso || country.name}
            onClick={() => onSelect(country)}
            focusRipple
            aria-pressed={isSelected}
            aria-label={`Select ${country.name}`}
            sx={{
              display: 'block',
              width: 168,
              textAlign: 'left',
              borderRadius: 2,
              '&:focus-visible .country-card, &.Mui-focusVisible .country-card': {
                borderColor: '#1E88E5',
                boxShadow: '0 0 0 4px rgba(30, 136, 229, 0.12)',
              },
            }}
          >
            <Box className="country-card" sx={cardSx(isSelected)}>
              <FlagBadge iso={iso} />
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: isSelected ? '#1E88E5' : 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {country.name}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
