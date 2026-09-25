import {
  buildSeriesInFlightKey,
  buildSpatialSliceCacheKey,
  normalizeAoiKey,
  normalizePeriodDay,
  shouldSkipSeriesFetch,
} from '../../../app/(dashboard)/coastal/vessels/spatial-cache';

describe('vessels spatial cache keys', () => {
  it('builds country_day_vessels_grain_aoi keys with explicit AOI', () => {
    const key = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      aoiId: 'PHL-123',
      periodStart: '2024-07-01',
    });
    expect(key).toBe('PHL_2024-07-01_vessels_weekly_PHL-123');
  });

  it('defaults missing AOI to "all" and trims blanks', () => {
    expect(
      buildSpatialSliceCacheKey({
        country: 'PHL',
        indicator: 'vessels',
        grain: 'weekly',
        aoiId: undefined,
        periodStart: '2024-07-01',
      })
    ).toBe('PHL_2024-07-01_vessels_weekly_all');
    expect(normalizeAoiKey('   ')).toBe('all');
    expect(normalizeAoiKey(null)).toBe('all');
  });

  it('differs per AOI so one AOI never serves another AOI slices', () => {
    const a = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      aoiId: 'AOI-A',
      periodStart: '2024-07-01',
    });
    const b = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      aoiId: 'AOI-B',
      periodStart: '2024-07-01',
    });
    const national = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      periodStart: '2024-07-01',
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(national);
    expect(b).not.toBe(national);
  });

  it('normalizes series timestamps to the scrubber day', () => {
    expect(normalizePeriodDay('2024-07-01 00:00:00')).toBe('2024-07-01');
    const fromSeries = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      aoiId: 'AOI-A',
      periodStart: '2024-07-01 00:00:00',
    });
    const fromScrubber = buildSpatialSliceCacheKey({
      country: 'PHL',
      indicator: 'vessels',
      grain: 'weekly',
      aoiId: 'AOI-A',
      periodStart: '2024-07-01',
    });
    expect(fromSeries).toBe(fromScrubber);
  });
});

describe('shouldSkipSeriesFetch', () => {
  const scope = { country: 'PHL', indicator: 'vessels', grain: 'weekly', aoiId: 'AOI-A' };
  const periods = [
    { start: '2024-07-01', end: '2024-07-07' },
    { start: '2024-07-08', end: '2024-07-14' },
  ];

  it('returns true when every period key for the scope is cached', () => {
    const cache = new Map<string, unknown>();
    for (const p of periods) {
      cache.set(buildSpatialSliceCacheKey({ ...scope, periodStart: p.start }), { cells: 1 });
    }
    expect(shouldSkipSeriesFetch(periods, scope, cache)).toBe(true);
  });

  it('returns false when any period key is missing', () => {
    const cache = new Map<string, unknown>();
    cache.set(buildSpatialSliceCacheKey({ ...scope, periodStart: periods[0].start }), { cells: 1 });
    expect(shouldSkipSeriesFetch(periods, scope, cache)).toBe(false);
  });

  it('returns false when cache holds another AOI but not this one', () => {
    const cache = new Map<string, unknown>();
    const otherScope = { ...scope, aoiId: 'AOI-B' };
    for (const p of periods) {
      cache.set(buildSpatialSliceCacheKey({ ...otherScope, periodStart: p.start }), { cells: 1 });
    }
    expect(shouldSkipSeriesFetch(periods, scope, cache)).toBe(false);
    expect(shouldSkipSeriesFetch(periods, otherScope, cache)).toBe(true);
  });
});

describe('buildSeriesInFlightKey', () => {
  it('derives one key per (country, indicator, grain, aoi) scope', () => {
    expect(
      buildSeriesInFlightKey({ country: 'PHL', indicator: 'vessels', grain: 'weekly', aoiId: 'AOI-A' })
    ).toBe('PHL_vessels_weekly_AOI-A');
    expect(
      buildSeriesInFlightKey({ country: 'PHL', indicator: 'vessels', grain: 'weekly' })
    ).toBe('PHL_vessels_weekly_all');
  });

  it('differs when country, grain, or AOI differ but not across periods', () => {
    const base = { country: 'PHL', indicator: 'vessels', grain: 'weekly', aoiId: 'AOI-A' };
    expect(buildSeriesInFlightKey({ ...base, aoiId: 'AOI-B' })).not.toBe(buildSeriesInFlightKey(base));
    expect(buildSeriesInFlightKey({ ...base, grain: 'monthly' })).not.toBe(buildSeriesInFlightKey(base));
    expect(buildSeriesInFlightKey({ ...base, country: 'IDN' })).not.toBe(buildSeriesInFlightKey(base));
    expect(buildSeriesInFlightKey(base)).toBe(buildSeriesInFlightKey({ ...base }));
  });
});
