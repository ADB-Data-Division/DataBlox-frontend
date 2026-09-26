import { buildSpatialIndicatorParam } from '../../../app/(dashboard)/coastal/indicators/spatial-indicator-ids';
import { buildSpatialSliceCacheKey } from '../../../app/(dashboard)/coastal/indicators/spatial-cache';

describe('spatial indicator id list', () => {
  it('single indicator for chlor_a view', () => {
    expect(buildSpatialIndicatorParam('chlor_a', ['chlor_a'])).toBe('chlor_a');
  });

  it('builds comma-joined indicator list for vessels view', () => {
    expect(buildSpatialIndicatorParam('vessels', ['vessels'])).toBe('vessels');
    // Overlay on a chlor_a map: tooltip rows plus vessel counts.
    expect(buildSpatialIndicatorParam('chlor_a', ['chlor_a', 'sst', 'vessels'])).toBe('chlor_a,sst,vessels');
  });

  it('is order independent, de-duplicated and skips unknown ids', () => {
    const known = (id: string) => id !== 'bogus';
    expect(buildSpatialIndicatorParam('sst', ['sst', 'chlor_a', 'bogus', 'chlor_a'], known)).toBe('chlor_a,sst');
  });

  it('cache key includes every requested id', () => {
    const key = (indicator: string) =>
      buildSpatialSliceCacheKey({ country: 'PHL', indicator, grain: 'monthly', aoiId: undefined, periodStart: '2024-07-01' });
    expect(key(buildSpatialIndicatorParam('chlor_a', ['chlor_a', 'sst']))).toBe('PHL_2024-07-01_chlor_a,sst_monthly_all');
    expect(key(buildSpatialIndicatorParam('chlor_a', ['chlor_a', 'sst']))).not.toBe(
      key(buildSpatialIndicatorParam('chlor_a', ['chlor_a']))
    );
  });
});
