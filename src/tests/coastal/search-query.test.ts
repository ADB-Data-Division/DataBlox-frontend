import type { CoastalCountry, CoastalLocation } from '@/types/coastal';
import { mapAoiIdsToLocations } from '@/app/(dashboard)/coastal/hooks/useCoastalLocations';
import {
  buildCoastalSearchParams,
  findCoastalCountry,
  readCoastalSearchRouteState,
} from '@/app/(dashboard)/coastal/search-query';

describe('coastal edit search query restoration', () => {
  const countries: CoastalCountry[] = [
    { id: 'THA', iso: 'THA', name: 'Thailand' },
    { id: 'PHL', iso: 'PHL', country_iso: 'PHL', name: 'Philippines' },
  ];
  const locations: CoastalLocation[] = [
    { aoi_id: 'prov:Phuket', name: 'Phuket', country_iso: 'THA', type: 'province' },
    { aoi_id: 'THA_port_1', name: 'Port One', country_iso: 'THA', type: 'port' },
  ];

  it('restores country, province/AOI scope, and destination from the edit URL', () => {
    const state = readCoastalSearchRouteState(new URLSearchParams(
      'country=tha&aois=prov%3APhuket%2CTHA_port_1&target=vessels'
    ));

    expect(findCoastalCountry(countries, state.countryIso)?.name).toBe('Thailand');
    expect(mapAoiIdsToLocations(state.aoiIds, locations).map((location) => location.name)).toEqual([
      'Phuket',
      'Port One',
    ]);
    expect(state.target).toBe('vessels');
  });

  it('restores nation scope without province chips', () => {
    const state = readCoastalSearchRouteState(new URLSearchParams('country=PHL&target=indicators'));
    expect(findCoastalCountry(countries, state.countryIso)?.name).toBe('Philippines');
    expect(mapAoiIdsToLocations(state.aoiIds, locations)).toEqual([]);
  });

  it('preserves date and metric filters when the restored search is submitted', () => {
    const params = buildCoastalSearchParams(
      new URLSearchParams('start_date=2022-01-01&end_date=2023-12-31&indicators=sst'),
      'THA',
      ['prov:Phuket'],
      ['Phuket'],
      'indicators',
    );

    expect(params.get('start_date')).toBe('2022-01-01');
    expect(params.get('end_date')).toBe('2023-12-31');
    expect(params.get('indicators')).toBe('sst');
    expect(params.get('aois')).toBe('prov:Phuket');
  });
});
