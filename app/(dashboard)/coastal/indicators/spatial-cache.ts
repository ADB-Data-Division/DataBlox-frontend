/**
 * Pure cache-key helpers for the coastal indicators choropleth.
 *
 * Incident 2026-09-25: scrubbing the weekly time slider fired a full
 * `/spatial/series` prefetch per tick plus per-tick `/spatial/slice`
 * fallbacks (~57 series + 29 slice calls of 12-15s each), restarting the
 * API container. The series/slice effects in `page-content.tsx` now rely on
 * these helpers so that scrubbing serves slices from the batch cache while
 * country / grain / indicator / AOI changes still trigger exactly one fetch.
 *
 * Everything here is pure (no React, no fetch) so it is unit-testable in
 * isolation. See `src/tests/coastal/spatial-cache-indicators.test.ts`.
 */

export interface SpatialScope {
  country: string;
  indicator: string;
  grain: string;
  /** Raw `aoi_id` search param (`undefined` when no AOI is selected). */
  aoiId?: string | null;
}

export interface SpatialPeriod {
  start: string;
  end: string;
}

/** Minimal cache surface: anything with `has()` (Map, Set) works. */
export interface KeyedCache {
  has(key: string): boolean;
}

/**
 * Normalize the AOI segment of cache keys. `undefined`, `null` and blank
 * strings all mean "no AOI filter" and map to `"all"` so that country-wide
 * slices never collide with AOI-scoped slices (and vice versa).
 */
export function normalizeAoiKey(aoiId?: string | null): string {
  const trimmed = (aoiId ?? '').trim();
  return trimmed === '' ? 'all' : trimmed;
}

/**
 * Normalize a period key to its `YYYY-MM-DD` day. Series keys arrive with
 * timestamps (`'YYYY-MM-DD HH:MM:SS'`); the scrubber uses bare days. Slicing
 * to 10 chars makes both hit the same cache entry.
 */
export function normalizePeriodDay(periodStart: string): string {
  return String(periodStart).slice(0, 10);
}

/**
 * Cache key for one spatial slice (one period of one scope).
 * Shape: `country_day_indicator_grain_aoi`.
 */
export function buildSpatialSliceCacheKey(
  scope: SpatialScope & { periodStart: string }
): string {
  const aoi = normalizeAoiKey(scope.aoiId);
  return `${scope.country}_${normalizePeriodDay(scope.periodStart)}_${scope.indicator}_${scope.grain}_${aoi}`;
}

/**
 * Key identifying the in-flight `/spatial/series` prefetch for a scope.
 * The slice fallback effect compares this against `seriesInFlightRef` and
 * skips its own `/spatial/slice` fetch while the batch request is running;
 * on series success the cache path serves the slider instead.
 */
export function buildSeriesInFlightKey(scope: SpatialScope): string {
  return `${scope.country}_${scope.indicator}_${scope.grain}_${normalizeAoiKey(scope.aoiId)}`;
}

/**
 * True when every period of the scope is already in the slice cache, in
 * which case the series effect can skip its fetch entirely. This also guards
 * refetches caused by unrelated `periodItems` identity changes: same
 * content means same keys, so the predicate stays true across re-renders
 * (e.g. slider scrub ticks, which must issue 0 additional series calls).
 */
export function shouldSkipSeriesFetch(
  periodItems: SpatialPeriod[],
  scope: SpatialScope,
  cache: KeyedCache
): boolean {
  return periodItems.every((period) =>
    cache.has(buildSpatialSliceCacheKey({ ...scope, periodStart: period.start }))
  );
}
