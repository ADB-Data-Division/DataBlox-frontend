'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCoastalLocations } from '@/services/coastalService';
import { CoastalLocation } from '@/types/coastal';

export interface CoastalRecentSearchEntry {
  id: string;
  country_iso: string;
  aoi_ids: string[];
  label: string;
  timestamp: number;
}

const RECENT_SEARCH_KEY_PREFIX = 'datablox-coastal-recent-searches';
export const MAX_RECENT_SEARCHES = 5;

export function dedupeSelections(selections: CoastalLocation[]): CoastalLocation[] {
  const seen = new Set<string>();
  const result: CoastalLocation[] = [];
  for (const location of selections) {
    if (!location || typeof location.aoi_id !== 'string' || location.aoi_id.length === 0) {
      continue;
    }
    if (seen.has(location.aoi_id)) {
      continue;
    }
    seen.add(location.aoi_id);
    result.push(location);
  }
  return result;
}

export function filterCoastalLocations(
  locations: CoastalLocation[],
  query: string
): CoastalLocation[] {
  const unique = dedupeSelections(locations);
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return unique;
  }
  return unique.filter((location) => {
    const haystacks = [location.name, location.display_name, location.aoi_id];
    return haystacks.some(
      (field) => typeof field === 'string' && field.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function createSearchSignature(aoiIds: string[]): string {
  return Array.from(new Set(aoiIds))
    .filter((id) => typeof id === 'string' && id.length > 0)
    .sort()
    .join('|');
}

export function upsertRecentSearch(
  existing: CoastalRecentSearchEntry[],
  incoming: CoastalRecentSearchEntry,
  max: number = MAX_RECENT_SEARCHES
): CoastalRecentSearchEntry[] {
  const withoutDuplicate = existing.filter((entry) => entry.id !== incoming.id);
  return [incoming, ...withoutDuplicate].slice(0, Math.max(max, 0));
}

export function formatRecentSearchLabel(names: string[], maxLength: number = 60): string {
  const joined = names.filter((name) => typeof name === 'string').join(', ');
  if (joined.length > maxLength) {
    return `${joined.substring(0, maxLength - 3)}...`;
  }
  return joined;
}

export function buildRecentSearchEntry(
  countryIso: string,
  selections: CoastalLocation[],
  timestamp: number = Date.now()
): CoastalRecentSearchEntry {
  const deduped = dedupeSelections(selections);
  return {
    id: createSearchSignature(deduped.map((location) => location.aoi_id)),
    country_iso: countryIso,
    aoi_ids: deduped.map((location) => location.aoi_id),
    label: formatRecentSearchLabel(deduped.map((location) => location.name)),
    timestamp,
  };
}

export function formatSelectionCount(count: number): string {
  if (count === 1) {
    return 'Selected province (1)';
  }
  return `Selected provinces (${count})`;
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = Math.max(now - timestamp, 0);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function mapAoiIdsToLocations(
  aoiIds: string[],
  locations: CoastalLocation[]
): CoastalLocation[] {
  const byId = new Map<string, CoastalLocation>();
  for (const location of locations) {
    if (location && typeof location.aoi_id === 'string' && !byId.has(location.aoi_id)) {
      byId.set(location.aoi_id, location);
    }
  }
  const resolved: CoastalLocation[] = [];
  for (const id of aoiIds) {
    const location = byId.get(id);
    if (location) {
      resolved.push(location);
    }
  }
  return resolved;
}

function getRecentSearchStorageKey(countryIso: string): string {
  return `${RECENT_SEARCH_KEY_PREFIX}:${countryIso.toUpperCase()}`;
}

export function loadCoastalRecentSearches(countryIso: string): CoastalRecentSearchEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(getRecentSearchStorageKey(countryIso));
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const valid = parsed.filter((item): item is CoastalRecentSearchEntry => {
      const entry = item as CoastalRecentSearchEntry;
      return (
        !!entry &&
        typeof entry.id === 'string' &&
        entry.id.length > 0 &&
        entry.country_iso === countryIso &&
        Array.isArray(entry.aoi_ids) &&
        entry.aoi_ids.every((id) => typeof id === 'string' && id.length > 0) &&
        typeof entry.label === 'string' &&
        typeof entry.timestamp === 'number'
      );
    });
    return valid.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveCoastalRecentSearches(
  countryIso: string,
  entries: CoastalRecentSearchEntry[]
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      getRecentSearchStorageKey(countryIso),
      JSON.stringify(entries)
    );
  } catch {
    return;
  }
}

export function clearCoastalRecentSearches(countryIso: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(getRecentSearchStorageKey(countryIso));
  } catch {
    return;
  }
}

export interface UseCoastalLocationsResult {
  locations: CoastalLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCoastalLocations(countryIso: string): UseCoastalLocationsResult {
  const [locations, setLocations] = useState<CoastalLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    if (!countryIso) {
      setLocations([]);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchCoastalLocations(countryIso)
      .then((data) => {
        if (!active) {
          return;
        }
        setLocations(dedupeSelections(Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load locations.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryIso, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return useMemo(
    () => ({ locations, loading, error, refetch }),
    [locations, loading, error, refetch]
  );
}
