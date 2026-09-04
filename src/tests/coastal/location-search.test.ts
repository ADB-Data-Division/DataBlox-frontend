import {
  CoastalRecentSearchEntry,
  MAX_RECENT_SEARCHES,
  buildRecentSearchEntry,
  createSearchSignature,
  dedupeSelections,
  filterCoastalLocations,
  formatRelativeTime,
  formatSelectionCount,
  mapAoiIdsToLocations,
  upsertRecentSearch,
} from '@/app/(dashboard)/coastal/hooks/useCoastalLocations';
import { CoastalLocation } from '@/types/coastal';

function makeLocation(aoiId: string, name: string, displayName?: string): CoastalLocation {
  return {
    aoi_id: aoiId,
    name,
    display_name: displayName,
    country_iso: 'THA',
  };
}

function makeEntry(
  id: string,
  aoiIds: string[],
  timestamp: number,
  label = 'Label'
): CoastalRecentSearchEntry {
  return {
    id,
    country_iso: 'THA',
    aoi_ids: aoiIds,
    label,
    timestamp,
  };
}

describe('dedupeSelections', () => {
  it('removes duplicate aoi_id entries and keeps first occurrence order', () => {
    const selections = [
      makeLocation('THA_01', 'Bangkok'),
      makeLocation('THA_02', 'Chonburi'),
      makeLocation('THA_01', 'Bangkok Duplicate'),
    ];

    const result = dedupeSelections(selections);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.aoi_id)).toEqual(['THA_01', 'THA_02']);
    expect(result[0].name).toBe('Bangkok');
  });

  it('drops entries without an aoi_id', () => {
    const result = dedupeSelections([
      makeLocation('', 'No Id'),
      makeLocation('THA_01', 'Bangkok'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].aoi_id).toBe('THA_01');
  });
});

describe('filterCoastalLocations', () => {
  const locations = [
    makeLocation('THA_BKK', 'Bangkok'),
    makeLocation('THA_CMI', 'Chiang Mai'),
    makeLocation('THA_BUR', 'Buri Ram', 'Buriram Province'),
  ];

  it('returns all deduped locations when query is blank', () => {
    const input = [...locations, makeLocation('THA_BKK', 'Bangkok Copy')];

    expect(filterCoastalLocations(input, '   ')).toHaveLength(3);
  });

  it('matches by name case-insensitively', () => {
    const result = filterCoastalLocations(locations, 'bAnGk');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bangkok');
  });

  it('matches by display_name', () => {
    const result = filterCoastalLocations(locations, 'buriram province');

    expect(result).toHaveLength(1);
    expect(result[0].aoi_id).toBe('THA_BUR');
  });

  it('matches by aoi_id', () => {
    const result = filterCoastalLocations(locations, 'tha_cmi');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Chiang Mai');
  });

  it('returns empty array when nothing matches', () => {
    expect(filterCoastalLocations(locations, 'krabi')).toEqual([]);
  });
});

describe('createSearchSignature', () => {
  it('is order independent and ignores duplicates', () => {
    expect(createSearchSignature(['B', 'A', 'B'])).toBe(createSearchSignature(['A', 'B']));
  });

  it('joins sorted ids with a separator', () => {
    expect(createSearchSignature(['C', 'A'])).toBe('A|C');
  });
});

describe('upsertRecentSearch', () => {
  it('prepends the new entry', () => {
    const existing = [makeEntry('A', ['A'], 100), makeEntry('B', ['B'], 50)];
    const incoming = makeEntry('C', ['C'], 200);

    const result = upsertRecentSearch(existing, incoming);

    expect(result.map((entry) => entry.id)).toEqual(['C', 'A', 'B']);
  });

  it('replaces an entry with the same signature instead of duplicating it', () => {
    const existing = [makeEntry('A', ['A'], 100), makeEntry('B', ['B'], 50)];
    const incoming = makeEntry('A', ['A'], 300);

    const result = upsertRecentSearch(existing, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('A');
    expect(result[0].timestamp).toBe(300);
  });

  it('caps the list at the configured maximum', () => {
    const existing = [
      makeEntry('A', ['A'], 100),
      makeEntry('B', ['B'], 90),
      makeEntry('C', ['C'], 80),
      makeEntry('D', ['D'], 70),
      makeEntry('E', ['E'], 60),
    ];
    const incoming = makeEntry('F', ['F'], 200);

    const result = upsertRecentSearch(existing, incoming);

    expect(result).toHaveLength(MAX_RECENT_SEARCHES);
    expect(result.map((entry) => entry.id)).toEqual(['F', 'A', 'B', 'C', 'D']);
  });
});

describe('buildRecentSearchEntry', () => {
  it('builds a signature based id and joined label', () => {
    const selections = [
      makeLocation('THA_02', 'Chonburi'),
      makeLocation('THA_01', 'Bangkok'),
    ];

    const entry = buildRecentSearchEntry('THA', selections, 1234567890);

    expect(entry.country_iso).toBe('THA');
    expect(entry.timestamp).toBe(1234567890);
    expect(entry.aoi_ids).toEqual(['THA_02', 'THA_01']);
    expect(entry.label).toBe('Chonburi, Bangkok');
    expect(entry.id).toBe(createSearchSignature(['THA_02', 'THA_01']));
  });

  it('truncates long labels with an ellipsis suffix', () => {
    const longName = 'A'.repeat(40);
    const entry = buildRecentSearchEntry(
      'THA',
      [makeLocation('X1', longName), makeLocation('X2', longName)],
      1
    );

    expect(entry.label.length).toBeLessThanOrEqual(60);
    expect(entry.label.endsWith('...')).toBe(true);
  });
});

describe('formatSelectionCount', () => {
  it('uses singular wording for one selection like the mockup counter line', () => {
    expect(formatSelectionCount(1)).toBe('Selected province (1)');
  });

  it('uses plural wording for multiple selections', () => {
    expect(formatSelectionCount(3)).toBe('Selected provinces (3)');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-08-23T12:00:00Z');

  it('shows Just now under one minute', () => {
    expect(formatRelativeTime(now - 30 * 1000, now)).toBe('Just now');
  });

  it('shows minutes ago below one hour', () => {
    expect(formatRelativeTime(now - 8 * 60 * 1000, now)).toBe('8m ago');
  });

  it('shows hours ago below one day', () => {
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000, now)).toBe('3h ago');
  });

  it('shows days ago below one week', () => {
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000, now)).toBe('2d ago');
  });
});

describe('mapAoiIdsToLocations', () => {
  const locations = [
    makeLocation('THA_01', 'Bangkok'),
    makeLocation('THA_02', 'Chonburi'),
  ];

  it('resolves ids in entry order and drops unknown ids', () => {
    const result = mapAoiIdsToLocations(['THA_02', 'MISSING', 'THA_01'], locations);

    expect(result.map((item) => item.aoi_id)).toEqual(['THA_02', 'THA_01']);
  });

  it('returns empty array when no ids resolve', () => {
    expect(mapAoiIdsToLocations(['NOPE'], locations)).toEqual([]);
  });
});
