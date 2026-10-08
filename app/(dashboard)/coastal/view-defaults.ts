import type { SpatialStatus } from './spatial-status';

export type IndicatorsView = 'timeline' | 'map';

/** The map is the landing view; `?view=timeline` opts out. */
export function resolveInitialView(viewParam?: string | null): IndicatorsView {
  return viewParam === 'timeline' ? 'timeline' : 'map';
}

export const NATION_LOAD_NOTE =
  'Nationwide maps take a few seconds to load because every hex cell in the country is fetched for each time period.';

/** Nation-level queries carry no AOI filter; the note only matters while waiting. */
export function showNationLoadNote(aoiId: string | undefined, status: SpatialStatus): boolean {
  return !aoiId && status === 'loading';
}

/** Indicators the right-hand panel can show: selected, map-capable, not the left layer. */
export function compareCandidates(
  selected: string[],
  left: string,
  isMapCapable: (id: string) => boolean
): string[] {
  return selected.filter((id) => id !== left && id !== 'vessels' && isMapCapable(id));
}

/** Keep the requested right layer when still valid, else the first candidate. */
export function resolveCompareIndicator(candidates: string[], requested?: string | null): string | null {
  if (requested && candidates.includes(requested)) return requested;
  return candidates[0] ?? null;
}
