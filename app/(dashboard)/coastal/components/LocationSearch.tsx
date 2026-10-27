'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchNearbyCoastalProvinces } from '@/services/coastalService';
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

interface NearbyProvinceResult {
  countryIso: string;
  provinceName: string;
  names: string[];
}

interface LocationSearchProps {
  countryIso: string;
  initialAoiIds?: string[];
  onSubmit?: (locations: CoastalLocation[]) => void;
}

export function LocationSearch({ countryIso, initialAoiIds = [], onSubmit }: LocationSearchProps) {
  const { locations, provinces, loading, error, refetch } = useCoastalLocations(countryIso);
  const [selected, setSelected] = useState<CoastalLocation[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [recents, setRecents] = useState<CoastalRecentSearchEntry[]>([]);
  const [nearbyProvinceResult, setNearbyProvinceResult] = useState<NearbyProvinceResult | null>(null);
  const [nearbySource, setNearbySource] = useState<{
    countryIso: string;
    aoiId: string;
  } | null>(null);
  const [nearbySuggestionsConsumed, setNearbySuggestionsConsumed] = useState(false);
  const restoredScope = useRef<string | null>(null);

  useEffect(() => {
    setSelected([]);
    setInputValue('');
    setRecents(loadCoastalRecentSearches(countryIso));
    setNearbySource(null);
    setNearbySuggestionsConsumed(false);
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

  useEffect(() => {
    const selectedProvince =
      selected.length === 1 &&
      selected[0].type === 'province' &&
      selected[0].aoi_id === nearbySource?.aoiId
        ? selected[0]
        : null;
    if (
      nearbySuggestionsConsumed ||
      !nearbySource ||
      nearbySource.countryIso !== countryIso.toUpperCase() ||
      !selectedProvince
    ) {
      return;
    }

    let active = true;
    void fetchNearbyCoastalProvinces(nearbySource.countryIso, selectedProvince.name)
      .then((response) => {
        if (active) {
          setNearbyProvinceResult({
            countryIso: nearbySource.countryIso,
            provinceName: selectedProvince.name,
            names: response.suggestions,
          });
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [countryIso, nearbySource, nearbySuggestionsConsumed, selected]);

  const nearbySuggestions = useMemo(() => {
    const selectedProvince =
      selected.length === 1 &&
      selected[0].type === 'province' &&
      selected[0].aoi_id === nearbySource?.aoiId
        ? selected[0]
        : null;
    if (
      nearbySuggestionsConsumed ||
      !nearbySource ||
      nearbySource.countryIso !== countryIso.toUpperCase() ||
      !selectedProvince ||
      nearbyProvinceResult?.countryIso !== nearbySource.countryIso ||
      nearbyProvinceResult?.provinceName !== selectedProvince.name
    ) {
      return [];
    }
    return nearbyProvinceResult.names.filter(
      (name) =>
        allLocations.some((location) => location.type === 'province' && location.name === name) &&
        !selected.some((location) => location.type === 'province' && location.name === name)
    );
  }, [allLocations, countryIso, nearbyProvinceResult, nearbySource, nearbySuggestionsConsumed, selected]);

  const initialScopeKey = `${countryIso.toUpperCase()}|${initialAoiIds.join(',')}`;
  useEffect(() => {
    if (loading || restoredScope.current === initialScopeKey) return;
    setSelected(mapAoiIdsToLocations(initialAoiIds, allLocations));
    restoredScope.current = initialScopeKey;
  }, [allLocations, initialAoiIds, initialScopeKey, loading]);

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
      const isSelected = selected.some((item) => item.aoi_id === aoiId);
      if (isSelected) {
        setSelected((current) => current.filter((item) => item.aoi_id !== aoiId));
        if (aoiId === nearbySource?.aoiId) {
          setNearbySuggestionsConsumed(true);
        }
      } else {
        setSelected((current) => [...current, option.location]);
        if (
          selected.length === 0 &&
          option.location.type === 'province' &&
          !nearbySource &&
          !nearbySuggestionsConsumed
        ) {
          setNearbySource({ countryIso: countryIso.toUpperCase(), aoiId });
        } else if (nearbySource) {
          setNearbySuggestionsConsumed(true);
        }
      }
      setInputValue('');
      return;
    }
    if (option.kind === 'recent') {
      setSelected(mapAoiIdsToLocations(option.entry.aoi_ids, allLocations));
      setInputValue('');
      setNearbySource(null);
      setNearbySuggestionsConsumed(true);
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
    setNearbySuggestionsConsumed(true);
  };

  const handleRemoveChip = (aoiId: string) => {
    setSelected((current) => current.filter((item) => item.aoi_id !== aoiId));
    if (aoiId === nearbySource?.aoiId) {
      setNearbySuggestionsConsumed(true);
    }
  };

  const handleAddNearbyProvince = (provinceName: string) => {
    const province = allLocations.find(
      (location) => location.type === 'province' && location.name === provinceName
    );
    if (!province) {
      setNearbySuggestionsConsumed(true);
      return;
    }

    setSelected((current) =>
      current.some((location) => location.aoi_id === province.aoi_id)
        ? current
        : [...current, province]
    );
    setNearbySuggestionsConsumed(true);
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
                subText =
                  typeof prov?.total_hexagons === 'number'
                    ? `${prov.total_hexagons} hexagons`
                    : 'Province';
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

      {nearbySuggestions.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
            mt: 1.25,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.25 }}>
            Nearby provinces
          </Typography>
          {nearbySuggestions.map((name) => (
            <Chip
              key={name}
              aria-label={`Add nearby province ${name}`}
              icon={<MapPinIcon size={14} />}
              label={name}
              size="small"
              variant="outlined"
              clickable
              onClick={() => handleAddNearbyProvince(name)}
              sx={{
                borderRadius: '9px',
                fontWeight: 600,
                color: 'primary.main',
                borderColor: 'primary.light',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

