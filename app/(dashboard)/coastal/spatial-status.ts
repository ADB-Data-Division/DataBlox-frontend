/**
 * Pure status logic for the coastal choropleth pages. Loading, empty and
 * failed responses used to collapse into `spatialSlice === {}`, so the map
 * drew value-less hexes as data while the API was still working.
 */

export type SpatialStatus = 'loading' | 'ready' | 'empty' | 'error';

/** Debounce for scrub-tick slice fallbacks (unchanged from the scrub fix). */
export const SLICE_DEBOUNCE_MS = 150;

export type SpatialPhase =
  | { phase: 'request'; cached: boolean }
  | { phase: 'loaded'; cellCount: number }
  | { phase: 'failed' };

export function resolveSpatialStatus(p: SpatialPhase): SpatialStatus {
  if (p.phase === 'request') return p.cached ? 'ready' : 'loading';
  if (p.phase === 'loaded') return p.cellCount > 0 ? 'ready' : 'empty';
  return 'error';
}

/**
 * The first slice of a scope (nothing painted yet) fires immediately so the
 * map does not wait on the large series request; later scrub ticks debounce.
 */
export function sliceDelayMs(scopePainted: boolean): number {
  return scopePainted ? SLICE_DEBOUNCE_MS : 0;
}

/**
 * Once a scope has painted, a running series prefetch will feed the slider
 * cache, so scrub-tick slices wait for it. Before the first paint the slice
 * must not wait.
 */
export function shouldWaitForSeries(scopePainted: boolean, seriesInFlight: boolean): boolean {
  return scopePainted && seriesInFlight;
}
