import {
  shouldShowVesselCountLabels,
  VESSEL_LABEL_MIN_ZOOM,
} from '@/app/(dashboard)/coastal/components/vessel-count-labels';

describe('vessel count label zoom threshold', () => {
  it('waits for a closer zoom than the previous level 8 threshold', () => {
    expect(VESSEL_LABEL_MIN_ZOOM).toBeGreaterThan(8);
    expect(shouldShowVesselCountLabels(9.99)).toBe(false);
    expect(shouldShowVesselCountLabels(VESSEL_LABEL_MIN_ZOOM)).toBe(true);
  });

  it('does not show labels for invalid zoom values', () => {
    expect(shouldShowVesselCountLabels(Number.NaN)).toBe(false);
  });
});
