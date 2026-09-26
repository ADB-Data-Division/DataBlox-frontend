import {
  resolveSpatialStatus,
  shouldWaitForSeries,
  sliceDelayMs,
  SLICE_DEBOUNCE_MS,
} from '../../../app/(dashboard)/coastal/spatial-status';
import {
  buildSpatialSliceCacheKey,
  buildSeriesInFlightKey,
} from '../../../app/(dashboard)/coastal/vessels/spatial-cache';

const scope = { country: 'PHL', indicator: 'chlor_a', grain: 'monthly', aoiId: undefined };

describe('spatial status', () => {
  it('loading while slice pending and period not cached', () => {
    const cache = new Map<string, unknown>();
    const key = buildSpatialSliceCacheKey({ ...scope, periodStart: '2024-07-01' });
    expect(resolveSpatialStatus({ phase: 'request', cached: cache.has(key) })).toBe('loading');
  });

  it('ready when period already cached', () => {
    const cache = new Map<string, unknown>();
    const key = buildSpatialSliceCacheKey({ ...scope, periodStart: '2024-07-01 00:00:00' });
    cache.set(key, { h1: {} });
    const lookup = buildSpatialSliceCacheKey({ ...scope, periodStart: '2024-07-01' });
    expect(resolveSpatialStatus({ phase: 'request', cached: cache.has(lookup) })).toBe('ready');
  });

  it('ready when cells land, empty on zero cells', () => {
    expect(resolveSpatialStatus({ phase: 'loaded', cellCount: 3 })).toBe('ready');
    expect(resolveSpatialStatus({ phase: 'loaded', cellCount: 0 })).toBe('empty');
  });

  it('error on failed fetch', () => {
    expect(resolveSpatialStatus({ phase: 'failed' })).toBe('error');
  });

  it('scope change resets to loading and the first slice is immediate', () => {
    const cache = new Map<string, unknown>();
    cache.set(buildSpatialSliceCacheKey({ ...scope, periodStart: '2024-07-01' }), { h1: {} });
    const other = { ...scope, indicator: 'chlor_a,sst' };
    expect(buildSeriesInFlightKey(other)).not.toBe(buildSeriesInFlightKey(scope));
    const cached = cache.has(buildSpatialSliceCacheKey({ ...other, periodStart: '2024-07-01' }));
    expect(resolveSpatialStatus({ phase: 'request', cached })).toBe('loading');
    // New scope has not painted: no debounce, and it must not wait for the series.
    expect(sliceDelayMs(false)).toBe(0);
    expect(shouldWaitForSeries(false, true)).toBe(false);
  });

  it('cached scrub tick stays ready and never waits or debounces a fetch path', () => {
    const cache = new Map<string, unknown>();
    for (const d of ['2024-06-01', '2024-07-01']) {
      cache.set(buildSpatialSliceCacheKey({ ...scope, periodStart: d }), { h1: {} });
    }
    for (const d of ['2024-06-01', '2024-07-01', '2024-06-01']) {
      const cached = cache.has(buildSpatialSliceCacheKey({ ...scope, periodStart: d }));
      expect(resolveSpatialStatus({ phase: 'request', cached })).toBe('ready');
    }
    // Uncached tick after paint: debounced and waits for a running series.
    expect(sliceDelayMs(true)).toBe(SLICE_DEBOUNCE_MS);
    expect(shouldWaitForSeries(true, true)).toBe(true);
    expect(shouldWaitForSeries(true, false)).toBe(false);
  });
});
