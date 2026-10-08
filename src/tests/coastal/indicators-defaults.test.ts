import {
  resolveInitialView,
  showNationLoadNote,
  NATION_LOAD_NOTE,
  compareCandidates,
  resolveCompareIndicator,
} from '../../../app/(dashboard)/coastal/view-defaults';

describe('resolveInitialView', () => {
  it('opens the map when no view param is given', () => {
    expect(resolveInitialView(null)).toBe('map');
    expect(resolveInitialView(undefined)).toBe('map');
    expect(resolveInitialView('')).toBe('map');
  });

  it('keeps ?view=map on the map', () => {
    expect(resolveInitialView('map')).toBe('map');
  });

  it('opens the timeline only for ?view=timeline', () => {
    expect(resolveInitialView('timeline')).toBe('timeline');
  });

  it('falls back to the map for unknown values', () => {
    expect(resolveInitialView('table')).toBe('map');
  });
});

describe('showNationLoadNote', () => {
  it('shows for a nation-level query while loading', () => {
    expect(showNationLoadNote(undefined, 'loading')).toBe(true);
    expect(showNationLoadNote('', 'loading')).toBe(true);
  });

  it('hides once the map is ready, empty or failed', () => {
    expect(showNationLoadNote(undefined, 'ready')).toBe(false);
    expect(showNationLoadNote(undefined, 'empty')).toBe(false);
    expect(showNationLoadNote(undefined, 'error')).toBe(false);
  });

  it('hides for AOI-scoped queries', () => {
    expect(showNationLoadNote('bang_pu_mai', 'loading')).toBe(false);
  });

  it('uses the agreed copy', () => {
    expect(NATION_LOAD_NOTE).toBe(
      'Nationwide maps take a few seconds to load because every hex cell in the country is fetched for each time period.'
    );
  });
});

describe('side-by-side candidates', () => {
  const capable = (id: string) => id !== 'port_calls';

  it('lists other selected map-capable layers', () => {
    expect(compareCandidates(['chlor_a', 'sst', 'vessels', 'port_calls'], 'chlor_a', capable)).toEqual(['sst']);
  });

  it('is empty with a single map layer so the switch stays hidden', () => {
    expect(compareCandidates(['chlor_a', 'vessels'], 'chlor_a', capable)).toEqual([]);
  });

  it('keeps a valid request, else falls back to the first candidate', () => {
    expect(resolveCompareIndicator(['sst', 'kd490'], 'kd490')).toBe('kd490');
    expect(resolveCompareIndicator(['sst', 'kd490'], 'chlor_a')).toBe('sst');
    expect(resolveCompareIndicator([], 'sst')).toBeNull();
  });
});
