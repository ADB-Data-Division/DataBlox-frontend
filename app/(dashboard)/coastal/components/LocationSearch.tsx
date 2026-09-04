'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TagIcon,
  XIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getCommandKey } from '@/src/utils/search';
import { CoastalLocation } from '@/types/coastal';
import {
  CoastalRecentSearchEntry,
  buildRecentSearchEntry,
  clearCoastalRecentSearches,
  filterCoastalLocations,
  formatRelativeTime,
  formatSelectionCount,
  loadCoastalRecentSearches,
  mapAoiIdsToLocations,
  saveCoastalRecentSearches,
  upsertRecentSearch,
  useCoastalLocations,
} from '../hooks/useCoastalLocations';

type SearchOption =
  | { kind: 'location'; location: CoastalLocation }
  | { kind: 'recent'; entry: CoastalRecentSearchEntry }
  | { kind: 'clear-recents' };

interface LocationSearchProps {
  countryIso: string;
  onSubmit?: (locations: CoastalLocation[]) => void;
}

export function LocationSearch({ countryIso, onSubmit }: LocationSearchProps) {
  const { locations, provinces, loading, error, refetch } = useCoastalLocations(countryIso);
  const [selected, setSelected] = useState<CoastalLocation[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [recents, setRecents] = useState<CoastalRecentSearchEntry[]>([]);

  useEffect(() => {
    setSelected([]);
    setInputValue('');
    setRecents(loadCoastalRecentSearches(countryIso));
  }, [countryIso]);

  const query = inputValue.trim().toLowerCase();

  const allLocations = useMemo<CoastalLocation[]>(() => {
    const pseudoProvinces: CoastalLocation[] = provinces.map((p) => ({
      aoi_id: `prov:${p.name}`,
      name: p.name,
      display_name: p.name,
      country_iso: p.country_iso || p.countryIso || countryIso,
      type: 'province',
    }));
    return [...pseudoProvinces, ...locations.map(l => ({ ...l, type: 'port' }))];
  }, [provinces, locations, countryIso]);

  const options = useMemo<SearchOption[]>(() => {
    if (query.length === 0) {
      if (recents.length === 0) {
        return [];
      }
      return [
        ...recents.map((entry) => ({ kind: 'recent' as const, entry })),
        { kind: 'clear-recents' as const },
      ];
    }
    return filterCoastalLocations(allLocations, inputValue).map((location) => ({
      kind: 'location' as const,
      location,
    }));
  }, [query, recents, allLocations, inputValue]);

  const handleOptionChange = (_event: React.SyntheticEvent, option: SearchOption | null) => {
    if (!option) {
      return;
    }
    if (option.kind === 'location') {
      const aoiId = option.location.aoi_id;
      setSelected((current) =>
        current.some((item) => item.aoi_id === aoiId)
          ? current.filter((item) => item.aoi_id !== aoiId)
          : [...current, option.location]
      );
      setInputValue('');
      return;
    }
    if (option.kind === 'recent') {
      setSelected(mapAoiIdsToLocations(option.entry.aoi_ids, allLocations));
      setInputValue('');
      return;
    }
    clearCoastalRecentSearches(countryIso);
    setRecents([]);
  };

  const handleSubmit = () => {
    if (selected.length === 0 || loading) {
      return;
    }
    const entry = buildRecentSearchEntry(countryIso, selected);
    const nextRecents = upsertRecentSearch(recents, entry);
    setRecents(nextRecents);
    saveCoastalRecentSearches(countryIso, nextRecents);
    onSubmit?.(selected);
    setInputValue('');
  };

  const handleRemoveChip = (aoiId: string) => {
    setSelected((current) => current.filter((item) => item.aoi_id !== aoiId));
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
        >
          Could not load locations.
        </Alert>
      )}

      {selected.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {formatSelectionCount(selected.length)}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {selected.map((location) => {
              const label = location.name;
              return (
                <Chip
                  key={location.aoi_id}
                  icon={<TagIcon size={13} />}
                  label={label}
                  size="small"
                  onDelete={() => handleRemoveChip(location.aoi_id)}
                  deleteIcon={<XIcon size={13} />}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: '9px',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'primary.contrastText' },
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255, 255, 255, 0.85)',
                      '&:hover': { color: '#fff' },
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Autocomplete
          fullWidth
          value={null}
          options={options}
          openOnFocus
          filterOptions={(opts) => opts}
          getOptionLabel={(option) =>
            option.kind === 'location'
              ? option.location.name
              : option.kind === 'recent'
                ? option.entry.label
                : ''
          }
          isOptionEqualToValue={() => false}
          noOptionsText={
            query.length === 0 ? 'No recent searches.' : 'No locations match your search.'
          }
          onChange={handleOptionChange}
          onInputChange={(event, value, reason) => {
            if (reason === 'input') {
              setInputValue(value);
            }
          }}
          slotProps={{
            paper: {
              elevation: 0,
              sx: {
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                boxShadow: 3,
                mt: 0.5,
              },
            },
          }}
          renderOption={(props, option) => {
            const { key, ...restProps } = props as typeof props & { key?: string };
            if (option.kind === 'location') {
              const isProv = option.location.type === 'province';
              const name = option.location.name;
              
              let subText = '';
              if (isProv) {
                const prov = provinces.find((p) => p.name === name);
                subText = prov ? `${prov.aois.length} Coastal AOIs` : 'Province';
              } else {
                subText = option.location.province || String(option.location.aoi_id).toUpperCase();
              }
              
              const badgeLabel = isProv ? 'PROVINCE' : 'PORT';
              
              return (
                <li {...restProps} key={`loc-${option.location.aoi_id}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <MapPinIcon size={18} style={{ color: 'text.secondary', flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                      {name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {subText}
                    </Typography>
                  </Box>
                  <Chip
                    label={badgeLabel}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: isProv ? 'primary.50' : 'grey.100',
                      color: isProv ? 'primary.700' : 'text.secondary',
                    }}
                  />
                </li>
              );
            }
            if (option.kind === 'recent') {
              return (
                <li
                  {...restProps}
                  key={`recent-${option.entry.id}`}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                >
                  <ClockIcon size={18} style={{ color: 'text.secondary', flexShrink: 0, marginTop: 3 }} />
                  <Box>
                    <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                      {option.entry.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={`${option.entry.aoi_ids.length} location${option.entry.aoi_ids.length !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatRelativeTime(option.entry.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              );
            }
            return (
              <li
                {...restProps}
                key="clear-recents"
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px 0' }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: 'error.main', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Clear all recent searches
                </Typography>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for provinces or ports"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <MagnifyingGlassIcon size={20} color="text.secondary" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {loading && <CircularProgress size={18} sx={{ mr: 2 }} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />

        <IconButton
          aria-label="Submit selected locations"
          onClick={handleSubmit}
          disabled={selected.length === 0 || loading}
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            border: '1px solid',
            borderColor: selected.length > 0 ? 'primary.main' : 'divider',
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          <ArrowRightIcon size={22} />
        </IconButton>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        Press Enter to select. {getCommandKey()}+/ for help.
      </Typography>
    </Box>
  );
}

