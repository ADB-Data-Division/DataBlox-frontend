import {
  resolveInitialView,
  showNationLoadNote,
  NATION_LOAD_NOTE,
  compareCandidates,
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

  it('lists other selected map-capable layers, including Vessel Count', () => {
    expect(compareCandidates(['chlor_a', 'sst', 'vessels', 'port_calls'], 'chlor_a', capable)).toEqual(['sst', 'vessels']);
  });

  it('offers Vessel Count when it is not the left layer', () => {
    expect(compareCandidates(['vessels', 'chlor_a'], 'vessels', capable)).toEqual(['chlor_a']);
  });

  it('is empty with a single map layer so the switch stays hidden', () => {
    expect(compareCandidates(['chlor_a'], 'chlor_a', capable)).toEqual([]);
  });
});
