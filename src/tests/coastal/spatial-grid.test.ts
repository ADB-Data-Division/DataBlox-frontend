import {
  fetchSpatialGrid,
  clearSpatialGridCache,
} from '@/services/coastalService';
import {
  getChlorophyllColor,
  getSSTColor,
  interpolateColor,
  getChlorophyllColorRgba,
  getSSTColorRgba,
  getCellColorRgba,
} from '@/app/(dashboard)/coastal/components/CoastalChoroplethMap';

describe('Coastal Spatial Grid & Color Scales', () => {
  beforeEach(() => {
    clearSpatialGridCache();
  });

  describe('Color scale functions', () => {
    it('maps Chlorophyll-a values accurately', () => {
      expect(getChlorophyllColor(0).toLowerCase()).toBe('#22c55e');
      expect(getChlorophyllColor(10).toLowerCase()).toBe('#eab308');
      expect(getChlorophyllColor(20).toLowerCase()).toBe('#ef4444');
      // Clamping checks
      expect(getChlorophyllColor(-5).toLowerCase()).toBe('#22c55e');
      expect(getChlorophyllColor(25).toLowerCase()).toBe('#ef4444');
    });

    it('maps SST values accurately', () => {
      expect(getSSTColor(290).toLowerCase()).toBe('#fee2e2');
      expect(getSSTColor(310).toLowerCase()).toBe('#b91c1c');
      expect(getSSTColor(300).toLowerCase()).toBe('#f87171');
      // Clamping checks
      expect(getSSTColor(280).toLowerCase()).toBe('#fee2e2');
      expect(getSSTColor(320).toLowerCase()).toBe('#b91c1c');
    });

    it('interpolates intermediate colors accurately', () => {
      const mid = interpolateColor('#000000', '#ffffff', 0.5);
      expect(mid.toLowerCase()).toBe('#808080');
    });

    it('maps Chlorophyll-a and SST values to valid RGBA tuples', () => {
      const chlorRgba = getChlorophyllColorRgba(10);
      expect(chlorRgba).toHaveLength(4);
      expect(chlorRgba[0]).toBe(234);
      expect(chlorRgba[1]).toBe(179);
      expect(chlorRgba[2]).toBe(8);
      expect(chlorRgba[3]).toBe(215);

      const sstRgba = getSSTColorRgba(300);
      expect(sstRgba).toHaveLength(4);
      expect(sstRgba[0]).toBe(248);
      expect(sstRgba[1]).toBe(113);
      expect(sstRgba[2]).toBe(113);
      expect(sstRgba[3]).toBe(215);

      const cellChlor = getCellColorRgba({ id: 'test', lat: 0, lng: 0, chlor_a: 0, sst: 290, vessels: 0 }, true, false);
      expect(cellChlor).toEqual([34, 197, 94, 215]);

      const cellSst = getCellColorRgba({ id: 'test', lat: 0, lng: 0, chlor_a: 0, sst: 310, vessels: 0 }, false, true);
      expect(cellSst).toEqual([185, 28, 28, 215]);
    });
  });

  describe('Spatial grid cell loading and filtering', () => {
    it('loads and filters Pangasinan AOI grid cells with 224 cells', async () => {
      const pangasinanAois = [
        'PHL_anda_10km_172',
        'PHL_binmaley_10km_140',
        'PHL_city-of-alaminos_10km_139',
      ];
      const result = await fetchSpatialGrid('PHL', pangasinanAois);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(224);
      expect(result.metadata?.total_hexagons).toBe(224);

      const targetSet = new Set(pangasinanAois);
      result.features.forEach((feature) => {
        expect(targetSet.has(feature.properties.aoi_id)).toBe(true);
        expect(feature.geometry.type).toBe('Polygon');
        expect(feature.geometry.coordinates[0].length).toBeGreaterThanOrEqual(7);
      });
    });

    it('loads and filters Laguna AOI grid cells with 7 cells', async () => {
      const lagunaAoi = 'PHL_lumban_10km_187';
      const result = await fetchSpatialGrid('PHL', lagunaAoi);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(7);
      expect(result.metadata?.total_hexagons).toBe(7);

      result.features.forEach((feature) => {
        expect(feature.properties.aoi_id).toBe(lagunaAoi);
      });
    });

    it('loads and filters Bali AOIs in Indonesia with 528 cells', async () => {
      const baliAois = [
        'IDN_denpasar-selatan_10km_73',
        'IDN_gerokgak_10km_13',
        'IDN_gerokgak_10km_498',
        'IDN_karangasem_10km_16',
        'IDN_negara_10km_555',
      ];
      const result = await fetchSpatialGrid('IDN', baliAois);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(528);
    });

    it('returns all country cells when no AOI filter is specified', async () => {
      const resultTha = await fetchSpatialGrid('THA');
      expect(resultTha.features).toHaveLength(4550);

      const resultBgd = await fetchSpatialGrid('BGD');
      expect(resultBgd.features).toHaveLength(4004);
    });

    it('returns an empty array when non-matching AOI is requested', async () => {
      const result = await fetchSpatialGrid('PHL', ['PHL_nonexistent_aoi']);
      expect(result.features).toHaveLength(0);
      expect(result.metadata?.total_hexagons).toBe(0);
    });

    it('uses in-memory cache on repeated calls without refetching', async () => {
      const first = await fetchSpatialGrid('BGD');
      const second = await fetchSpatialGrid('BGD');
      expect(first.features.length).toBe(second.features.length);
      expect(first.features.length).toBe(4004);
    });
  });
});
