import type { CoastalCountry } from '@/types/coastal';

export interface CoastalSearchRouteState {
  countryIso: string | null;
  aoiIds: string[];
  target: 'indicators' | 'vessels';
}

export function readCoastalSearchRouteState(params: URLSearchParams): CoastalSearchRouteState {
  const target = params.get('target');
  return {
    countryIso: params.get('country')?.trim().toUpperCase() || null,
    aoiIds: (params.get('aois') || '').split(',').map((id) => id.trim()).filter(Boolean),
    target: target === 'vessels' ? 'vessels' : 'indicators',
  };
}

export function findCoastalCountry(countries: CoastalCountry[], iso: string | null): CoastalCountry | undefined {
  const normalizedIso = iso?.trim().toUpperCase();
  if (!normalizedIso) return undefined;
  return countries.find((country) => (country.iso || country.country_iso || '').toUpperCase() === normalizedIso);
}

export function buildCoastalSearchParams(
  existing: URLSearchParams,
  countryIso: string,
  aoiIds: string[],
  names: string[],
  target: 'indicators' | 'vessels',
): URLSearchParams {
  const next = new URLSearchParams(existing.toString());
  next.set('country', countryIso);
  next.set('target', target);
  if (aoiIds.length > 0) next.set('aois', aoiIds.join(','));
  else next.delete('aois');
  if (names.length > 0) next.set('names', names.join(','));
  else next.delete('names');
  return next;
}
