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

const FLAG_EMOJI: Record<string, string> = {
  BGD: '🇧🇩',
  FJI: '🇫🇯',
  IDN: '🇮🇩',
  IND: '🇮🇳',
  LKA: '🇱🇰',
  MYS: '🇲🇾',
  PHL: '🇵🇭',
  SGP: '🇸🇬',
  THA: '🇹🇭',
};

export function FlagBadge({ iso }: { iso: string }) {
  const emoji = FLAG_EMOJI[iso];

  return (
    <Box
      aria-hidden
      sx={{
        width: 34,
        height: 22,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {emoji ? (
        <Typography sx={{ fontSize: '1.3rem', lineHeight: 1 }}>{emoji}</Typography>
      ) : (
        <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.secondary' }}>
          {iso}
        </Typography>
      )}
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
        {Array.from({ length: 9 }).map((_, index) => (
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
