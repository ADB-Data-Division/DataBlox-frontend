import { viewsEqual } from '../../../app/(dashboard)/coastal/view-sync';

const v = { lat: 13.75, lng: 100.5, zoom: 9 };

describe('viewsEqual', () => {
  it('treats identical views as equal', () => {
    expect(viewsEqual(v, { ...v })).toBe(true);
  });

  it('ignores sub-pixel center drift between panels', () => {
    expect(viewsEqual(v, { ...v, lat: v.lat + 1e-5, lng: v.lng - 1e-5 })).toBe(true);
  });

  it('detects a real pan or zoom', () => {
    expect(viewsEqual(v, { ...v, lat: v.lat + 0.01 })).toBe(false);
    expect(viewsEqual(v, { ...v, zoom: 10 })).toBe(false);
  });

  it('handles missing views', () => {
    expect(viewsEqual(null, null)).toBe(true);
    expect(viewsEqual(v, null)).toBe(false);
  });
});
