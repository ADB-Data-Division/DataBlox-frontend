import type { VesselTimelinePoint } from '@/types/coastal';
import {
  buildVesselTimelineExportData,
  buildVesselTypeSeries,
  categorySeriesKey,
  getVesselTimelineTypeGroups,
  subtypeSeriesKey,
  subtypeVisibilityKey,
} from '@/app/(dashboard)/coastal/components/vessel-timeline-model';

const timeline: VesselTimelinePoint[] = [
  {
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    total_vessels: 8,
    metric_value: 8,
    h3_cell_count: 2,
    total_presence_hours: 0,
    total_stationary_hours: 0,
    categories: { Trade: 5, Research: 3 },
    sub_types: { Trade: { Cargo: 3, Tanker: 2 }, Research: { Other: 3 } },
  },
];

describe('vessel timeline type model', () => {
  it('builds groups from API parent and nested subtype labels', () => {
    expect(getVesselTimelineTypeGroups(timeline)).toEqual([
      { category: 'Trade', subtypes: ['Cargo', 'Tanker'] },
      { category: 'Research', subtypes: ['Other'] },
    ]);
  });

  it('adds API subtypes to graph series and lets each checkbox remove its line', () => {
    const groups = getVesselTimelineTypeGroups(timeline);
    const subtypeKey = subtypeVisibilityKey('Trade', 'Cargo');
    const allSeries = buildVesselTypeSeries(groups, {}, {}, true);
    const filteredSeries = buildVesselTypeSeries(groups, {}, { [subtypeKey]: false }, true);
    const parentFilteredSeries = buildVesselTypeSeries(groups, { Trade: false }, {}, true);

    expect(allSeries.map((series) => series.dataKey)).toContain(subtypeSeriesKey('Trade', 'Cargo'));
    expect(filteredSeries.map((series) => series.dataKey)).not.toContain(subtypeSeriesKey('Trade', 'Cargo'));
    expect(filteredSeries.map((series) => series.dataKey)).toContain(subtypeSeriesKey('Trade', 'Tanker'));
    expect(parentFilteredSeries.map((series) => series.dataKey)).not.toContain(categorySeriesKey('Trade'));
    expect(parentFilteredSeries.map((series) => series.dataKey)).toContain(subtypeSeriesKey('Trade', 'Cargo'));
  });

  it('exports every API category and nested subtype without fixed vessel columns', () => {
    const groups = getVesselTimelineTypeGroups(timeline);
    const { headers, rows } = buildVesselTimelineExportData(
      timeline,
      groups,
      'Total vessel count',
      true,
    );

    expect(headers.map(({ label }) => label)).toEqual([
      'Period Start',
      'Period End',
      'Total vessel count',
      'H3 Cells Included',
      'Trade Vessels',
      'Cargo (Trade) Vessels',
      'Tanker (Trade) Vessels',
      'Research Vessels',
      'Other (Research) Vessels',
    ]);
    expect(rows[0][categorySeriesKey('Research')]).toBe(3);
    expect(rows[0][subtypeSeriesKey('Trade', 'Tanker')]).toBe(2);
  });
});
