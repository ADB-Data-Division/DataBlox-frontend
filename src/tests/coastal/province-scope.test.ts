import {
  PROVINCE_SCOPE_PREFIX,
  parseScope,
  provinceScopeToken,
} from '@/src/utils/coastalScope';
import {
  formatDisplayName,
  resolveCoastalLocations,
} from '@/app/(dashboard)/coastal/data/provinces';
import {
  clearSpatialGridCache,
  fetchSpatialGrid,
} from '@/services/coastalService';
import type { GeoJSONFeatureCollection } from '@/types/coastal';

function feature(h3: string, aoi: string, province: string | null) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    properties: { h3_index: h3, aoi_id: aoi, province },
  };
}

// One AOI (X) spans two provinces, the way THA_kantang-tai_10km_24 spans Krabi and Phuket.
const GRID: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    feature('h1', 'THA_x_10km_1', 'Phuket'),
    feature('h2', 'THA_x_10km_1', 'Phuket'),
    feature('h3', 'THA_x_10km_1', 'Krabi'),
    feature('h4', 'THA_y_10km_2', 'Krabi'),
  ],
  metadata: { country_iso: 'THA', total_hexagons: 4 },
};

describe('province scope token', () => {
  it('builds and parses tokens next to plain AOI ids', () => {
    expect(PROVINCE_SCOPE_PREFIX).toBe('prov:');
    expect(provinceScopeToken('Phuket')).toBe('prov:Phuket');
    const { aois, provinces } = parseScope(['prov:Phuket', 'THA_y_10km_2', 'prov:Samar (Western Samar)']);
    expect([...aois]).toEqual(['THA_y_10km_2']);
    expect([...provinces]).toEqual(['Phuket', 'Samar (Western Samar)']);
  });

  it('ignores blanks and empty province names', () => {
    const { aois, provinces } = parseScope(['', '  ', 'prov:', 'THA_y_10km_2']);
    expect([...aois]).toEqual(['THA_y_10km_2']);
    expect(provinces.size).toBe(0);
  });
});

describe('resolveCoastalLocations', () => {
  it('sends a province as its token instead of expanding it to AOI ids', () => {
    const { aoiIds, names } = resolveCoastalLocations(
      [{ type: 'province', name: 'Phuket', aois: ['THA_kantang-tai_10km_24'] }],
      'THA'
    );
    expect(aoiIds).toEqual(['prov:Phuket']);
    expect(names).toEqual(['Phuket']);
  });

  it('keeps a port as its AOI id and mixes it with provinces in selection order', () => {
    const { aoiIds, names } = resolveCoastalLocations(
      [
        { type: 'province', name: 'Krabi' },
        { type: 'port', aoi_id: 'THA_pak-nam_10km_71', name: 'Pak Nam' },
      ],
      'THA'
    );
    expect(aoiIds).toEqual(['prov:Krabi', 'THA_pak-nam_10km_71']);
    expect(names).toEqual(['Krabi', 'Pak Nam']);
  });
});

describe('formatDisplayName', () => {
  it('shows a province token as the province name', () => {
    expect(formatDisplayName('prov:Phuket')).toBe('Phuket');
    expect(formatDisplayName('prov:Samar (Western Samar)')).toBe('Samar (Western Samar)');
  });

  it('still formats AOI ids as before', () => {
    expect(formatDisplayName('THA_kantang-tai_10km_24')).toBe('Kantang Tai');
  });
});

describe('fetchSpatialGrid with province tokens', () => {
  beforeEach(() => {
    clearSpatialGridCache();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => GRID,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const ids = async (scope: string[]) =>
    (await fetchSpatialGrid('THA', scope)).features.map((f) => f.properties.h3_index);

  it('returns only the hexes of the province, not the whole AOI that contains it', async () => {
    expect(await ids(['prov:Phuket'])).toEqual(['h1', 'h2']);
    expect(await ids(['prov:Krabi'])).toEqual(['h3', 'h4']);
  });

  it('keeps plain AOI selection returning the whole AOI', async () => {
    expect(await ids(['THA_x_10km_1'])).toEqual(['h1', 'h2', 'h3']);
  });

  it('unions a province with an AOI without repeating a hex', async () => {
    expect(await ids(['prov:Phuket', 'THA_y_10km_2'])).toEqual(['h1', 'h2', 'h4']);
    expect(await ids(['prov:Phuket', 'THA_x_10km_1'])).toEqual(['h1', 'h2', 'h3']);
  });

  it('matches nothing for an unknown province and updates the hexagon total', async () => {
    const none = await fetchSpatialGrid('THA', ['prov:Atlantis']);
    expect(none.features).toHaveLength(0);
    expect(none.metadata?.total_hexagons).toBe(0);
    const phuket = await fetchSpatialGrid('THA', ['prov:Phuket']);
    expect(phuket.metadata?.total_hexagons).toBe(2);
  });

  it('returns everything when no scope is given', async () => {
    expect(await ids([])).toHaveLength(4);
  });
});
