import {
  buildSeriesInFlightKey,
  buildSpatialSliceCacheKey,
  normalizeAoiKey,
  normalizePeriodDay,
  shouldSkipSeriesFetch,
} from '../../../app/(dashboard)/coastal/indicators/spatial-cache';

const SCOPE = {
  country: 'PHL',
  indicator: 'chlor_a',
  grain: 'weekly',
} as const;

const PERIODS = [
  { start: '2024-01-01', end: '2024-01-07' },
  { start: '2024-01-08', end: '2024-01-14' },
  { start: '2024-01-15', end: '2024-01-21' },
];

function cacheFor(
  periods: typeof PERIODS,
  scope: Parameters<typeof shouldSkipSeriesFetch>[1]
): Map<string, Record<string, unknown>> {
  const cache = new Map<string, Record<string, unknown>>();
  for (const p of periods) {
    cache.set(buildSpatialSliceCacheKey({ ...scope, periodStart: p.start }), { cell: 1 });
  }
  return cache;
}

describe('spatial slice cache key (AOI correctness)', () => {
  it('builds keys in country_day_indicator_grain_aoi shape', () => {
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01', aoiId: 'aoi-1' })
    ).toBe('PHL_2024-01-01_chlor_a_weekly_aoi-1');
  });

  it('maps a missing AOI to the "all" segment', () => {
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01' })
    ).toBe('PHL_2024-01-01_chlor_a_weekly_all');
    expect(normalizeAoiKey(undefined)).toBe('all');
    expect(normalizeAoiKey(null)).toBe('all');
    expect(normalizeAoiKey('   ')).toBe('all');
  });

  it('produces a different key per AOI so AOIs never share cached slices', () => {
    const all = buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01' });
    const a = buildSpatialSliceCacheKey({
      ...SCOPE,
      periodStart: '2024-01-01',
      aoiId: 'aoi-1',
    });
    const b = buildSpatialSliceCacheKey({
      ...SCOPE,
      periodStart: '2024-01-01',
      aoiId: 'aoi-2',
    });
    expect(a).not.toBe(all);
    expect(a).not.toBe(b);
  });

  it('normalizes series timestamps to the scrubber day key', () => {
    expect(normalizePeriodDay('2024-01-01 00:00:00')).toBe('2024-01-01');
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01 00:00:00' })
    ).toBe(buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01' }));
  });

  it('differs per country, indicator, and grain', () => {
    const base = buildSpatialSliceCacheKey({ ...SCOPE, periodStart: '2024-01-01' });
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, country: 'THA', periodStart: '2024-01-01' })
    ).not.toBe(base);
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, indicator: 'sst', periodStart: '2024-01-01' })
    ).not.toBe(base);
    expect(
      buildSpatialSliceCacheKey({ ...SCOPE, grain: 'monthly', periodStart: '2024-01-01' })
    ).not.toBe(base);
  });
});

describe('shouldSkipSeriesFetch (scrub must not refetch)', () => {
  it('returns true when every period key for the scope is cached', () => {
    const cache = cacheFor(PERIODS, { ...SCOPE });
    expect(shouldSkipSeriesFetch(PERIODS, { ...SCOPE }, cache)).toBe(true);
  });

  it('returns false when any period key is missing', () => {
    const cache = cacheFor(PERIODS.slice(0, 2), { ...SCOPE });
    expect(shouldSkipSeriesFetch(PERIODS, { ...SCOPE }, cache)).toBe(false);
  });

  it('returns false when the cache was filled under a different AOI', () => {
    const cache = cacheFor(PERIODS, { ...SCOPE, aoiId: 'aoi-1' });
    expect(shouldSkipSeriesFetch(PERIODS, { ...SCOPE }, cache)).toBe(false);
    expect(
      shouldSkipSeriesFetch(PERIODS, { ...SCOPE, aoiId: 'aoi-1' }, cache)
    ).toBe(true);
  });

  it('returns false when the cache was filled under a different indicator', () => {
    const cache = cacheFor(PERIODS, { ...SCOPE, indicator: 'sst' });
    expect(shouldSkipSeriesFetch(PERIODS, { ...SCOPE }, cache)).toBe(false);
  });

  it('returns false for an empty cache', () => {
    expect(shouldSkipSeriesFetch(PERIODS, { ...SCOPE }, new Map())).toBe(false);
  });
});

describe('buildSeriesInFlightKey (slice fallback gating)', () => {
  it('is stable for the same scope', () => {
    expect(buildSeriesInFlightKey({ ...SCOPE })).toBe(
      buildSeriesInFlightKey({ ...SCOPE })
    );
  });

  it('derives a distinct key per country, grain, indicator, and AOI', () => {
    const base = buildSeriesInFlightKey({ ...SCOPE });
    expect(buildSeriesInFlightKey({ ...SCOPE, country: 'THA' })).not.toBe(base);
    expect(buildSeriesInFlightKey({ ...SCOPE, grain: 'monthly' })).not.toBe(base);
    expect(buildSeriesInFlightKey({ ...SCOPE, indicator: 'sst' })).not.toBe(base);
    expect(buildSeriesInFlightKey({ ...SCOPE, aoiId: 'aoi-1' })).not.toBe(base);
    expect(buildSeriesInFlightKey({ ...SCOPE, aoiId: 'aoi-1' })).not.toBe(
      buildSeriesInFlightKey({ ...SCOPE, aoiId: 'aoi-2' })
    );
  });

  it('treats a missing AOI as "all", matching the slice cache key suffix', () => {
    expect(buildSeriesInFlightKey({ ...SCOPE })).toBe('PHL_chlor_a_weekly_all');
    expect(buildSeriesInFlightKey({ ...SCOPE, aoiId: undefined })).toBe(
      buildSeriesInFlightKey({ ...SCOPE, aoiId: null })
    );
  });
});
