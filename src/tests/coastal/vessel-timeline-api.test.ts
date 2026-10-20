import { fetchVesselTimeline } from '@/services/coastalService';

describe('fetchVesselTimeline aggregation query', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the selected metric and aggregation to the coastal API', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ timeline: [] }),
    } as Response);

    await fetchVesselTimeline({
      country: 'THA',
      aoi_id: 'prov:Phuket',
      start_date: '2024-06-01',
      end_date: '2024-06-30',
      grain: 'monthly',
      metric: 'vessel_count',
      agg_func: 'average',
    });

    const requestedUrl = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe('/api/v1/coastal/vessels/timeline');
    expect(requestedUrl.searchParams.get('metric')).toBe('vessel_count');
    expect(requestedUrl.searchParams.get('agg_func')).toBe('average');
    expect(requestedUrl.searchParams.get('aoi_id')).toBe('prov:Phuket');
  });
});
