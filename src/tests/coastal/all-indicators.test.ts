/**
 * F7 tests for the coastal all-ABT indicators wave.
 * Written against the contract (plan sections 3, 3a) using fixtures,
 * since the backend may not serve the new endpoints yet.
 */
import type { IndicatorTimelinePoint } from '@/types/coastal';
// IndicatorTimelineChart pulls in d3 (ESM-only) at module scope; the pure
// helpers under test never call it, so stub it out for the node runner.
jest.mock('d3', () => ({}));
import {
  COASTAL_INDICATORS,
  COASTAL_INDICATOR_IDS,
  NO_DATA_COLOR,
  getIndicatorMeta,
  isZeroFillIndicator,
  toBackendMetadata,
} from '@/app/(dashboard)/coastal/indicators';
import { getPointValue } from '@/app/(dashboard)/coastal/components/IndicatorTimelineChart';
import {
  computeIndicatorStats,
  deltaStyle,
} from '@/app/(dashboard)/coastal/components/SummaryCards';
import {
  getCellIndicatorValue,
  getIndicatorColor,
} from '@/app/(dashboard)/coastal/components/CoastalChoroplethMap';
import { pctChange, formatDelta } from '@/app/(dashboard)/coastal/components/DetailsCard';
import {
  buildIndicatorExportRows,
  generateCsvContent,
} from '@/src/utils/coastalExport';

/** Fixture mirroring GET /coastal/indicators (contract section 3). */
const BACKEND_FIXTURE = [
  { id: 'chlor_a', label: 'Chlorophyll-a', group: 'Ocean color', unit: 'mg/m³', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'spm', label: 'Suspended Particulate Matter', group: 'Ocean color', unit: 'g/m³', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'kd490', label: 'Diffuse Attenuation (Kd490)', group: 'Ocean color', unit: '1/m', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'sst', label: 'Sea Surface Temperature', group: 'Weather', unit: '°C', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'air_temp', label: 'Air Temperature (2m)', group: 'Weather', unit: '°C', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'wind_speed', label: 'Wind Speed (10m)', group: 'Weather', unit: 'm/s', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'pressure', label: 'Mean Sea Level Pressure', group: 'Weather', unit: 'Pa', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'cloud_cover', label: 'Total Cloud Cover', group: 'Weather', unit: 'fraction', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'precipitation', label: 'Total Precipitation', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'surface_runoff', label: 'Surface Runoff', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'subsurface_runoff', label: 'Sub-surface Runoff', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'solar_radiation', label: 'Surface Solar Radiation', group: 'Weather', unit: 'J/m²', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'vessels', label: 'Vessel Count', group: 'Vessels', unit: 'vessels', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
  { id: 'presence_hours', label: 'Vessel Presence Hours', group: 'Vessels', unit: 'hours', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
  { id: 'stationary_vessels', label: 'Stationary Vessel Count', group: 'Vessels', unit: 'vessels', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
  { id: 'duration', label: 'Vessel Port Call Duration', group: 'Vessels', unit: 'hours', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
  { id: 'sar_detections', label: 'SAR Detections', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'sar_matched', label: 'SAR Matched Vessels', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'dark_detections', label: 'Dark Detections', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'tc_wind', label: 'TC Sustained Wind', group: 'Cyclones', unit: 'kt', agg: 'max', supports_map: true, supports_timeline: true, null_policy: 'null' },
  { id: 'tc_distance', label: 'Distance to Nearest TC Track', group: 'Cyclones', unit: 'km', agg: 'min', supports_map: true, supports_timeline: true, null_policy: 'null' },
] as const;

function point(values: Record<string, number | null>, extra: Partial<IndicatorTimelinePoint> = {}): IndicatorTimelinePoint {
  return {
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    values,
    ...extra,
  };
}

describe('Coastal all-indicator registry (F7)', () => {
  it('covers all 21 target ids with no drift against the backend fixture', () => {
    expect(COASTAL_INDICATOR_IDS).toHaveLength(21);
    expect(new Set(COASTAL_INDICATOR_IDS).size).toBe(21);
    const fixtureIds = BACKEND_FIXTURE.map((e) => e.id);
    expect([...COASTAL_INDICATOR_IDS].sort()).toEqual([...fixtureIds].sort());
  });

  it('matches backend metadata field by field (id, group, unit, agg, null_policy)', () => {
    for (const entry of BACKEND_FIXTURE) {
      const meta = getIndicatorMeta(entry.id);
      expect(meta).toBeDefined();
      expect(meta?.group).toBe(entry.group);
      expect(meta?.unit).toBe(entry.unit);
      expect(meta?.agg).toBe(entry.agg);
      expect(meta?.null_policy).toBe(entry.null_policy);
      expect(meta?.supports_map).toBe(true);
      expect(meta?.supports_timeline).toBe(true);
    }
    expect(toBackendMetadata()).toHaveLength(21);
  });

  it('uses Celsius everywhere: no Kelvin in any label or unit', () => {
    for (const e of COASTAL_INDICATORS) {
      expect(e.unit).not.toMatch(/^[Kk](elvin)?$/);
      expect(e.unit).not.toContain('K');
      expect(e.label).not.toMatch(/kelvin/i);
    }
    expect(getIndicatorMeta('sst')?.unit).toBe('°C');
    expect(getIndicatorMeta('air_temp')?.unit).toBe('°C');
  });

  it('marks only the four vessel indicators as zero_fill', () => {
    const zeroFill = COASTAL_INDICATOR_IDS.filter((id) => isZeroFillIndicator(id));
    expect(zeroFill.sort()).toEqual(
      ['duration', 'presence_hours', 'stationary_vessels', 'vessels'].sort(),
    );
  });
});

describe('getPointValue null policy (F7)', () => {
  it('returns NaN for a null values-dict entry and preserves a real 0', () => {
    expect(getPointValue(point({ chlor_a: null }), 'chlor_a')).toBeNaN();
    expect(getPointValue(point({ chlor_a: 0 }), 'chlor_a')).toBe(0);
    expect(getPointValue(point({ sst: null }), 'sst')).toBeNaN();
    expect(getPointValue(point({ sst: 0 }), 'sst')).toBe(0);
    expect(getPointValue(point({ tc_wind: null }), 'tc_wind')).toBeNaN();
    expect(getPointValue(point({ tc_wind: 0 }), 'tc_wind')).toBe(0);
    expect(getPointValue(point({ sar_detections: null }), 'sar_detections')).toBeNaN();
    expect(getPointValue(point({ sar_detections: 0 }), 'sar_detections')).toBe(0);
  });

  it('defaults missing zero_fill readings to 0 and missing null-policy readings to NaN', () => {
    expect(getPointValue(point({}), 'vessels')).toBe(0);
    expect(getPointValue(point({}), 'presence_hours')).toBe(0);
    expect(getPointValue(point({}), 'duration')).toBe(0);
    expect(getPointValue(point({}), 'sst')).toBeNaN();
    expect(getPointValue(point({}), 'wind_speed')).toBeNaN();
    expect(getPointValue(point({}), 'tc_distance')).toBeNaN();
  });

  it('reads legacy fixed fields during migration', () => {
    const legacy = point({}, { chlor_a: 2.5, sst_c: 28.4, total_vessels: 7 });
    expect(getPointValue(legacy, 'chlor_a')).toBe(2.5);
    expect(getPointValue(legacy, 'sst')).toBe(28.4);
    expect(getPointValue(legacy, 'vessels')).toBe(7);
    // Canonical values dict wins over legacy fields.
    const both = point({ chlor_a: 9.9 }, { chlor_a: 2.5 });
    expect(getPointValue(both, 'chlor_a')).toBe(9.9);
  });
});

describe('Summary card stats and delta rules (F7)', () => {
  const timeline: IndicatorTimelinePoint[] = [
    point({ sst: 28.0 }, { period_start: '2024-01-01', period_end: '2024-01-31' }),
    point({ sst: null }, { period_start: '2024-02-01', period_end: '2024-02-29' }),
    point({ sst: 30.0 }, { period_start: '2024-03-01', period_end: '2024-03-31' }),
  ];

  it('skips nulls in averages (never zeroes them) and reports all-null as no data', () => {
    const stats = computeIndicatorStats(timeline, 'sst');
    expect(stats.average).toBeCloseTo(29.0);
    expect(stats.total).toBeCloseTo(58.0);
    expect(stats.allNull).toBe(false);
    const allNull = computeIndicatorStats(
      timeline.map((pt) => point({ sst: null }, { period_start: pt.period_start, period_end: pt.period_end })),
      'sst',
    );
    expect(allNull.allNull).toBe(true);
    expect(allNull.average).toBeUndefined();
    expect(allNull.total).toBeUndefined();
  });

  it('returns a null MoM delta when either month is null (never 0%)', () => {
    // Last two points are null then 30.0: delta must be null.
    const stats = computeIndicatorStats(timeline.slice(1), 'sst');
    expect(stats.momDeltaPct).toBeNull();
    const style = deltaStyle(stats.momDeltaPct, 'sst');
    expect(style.text).toBe('No data');
    // Two real months produce a real delta.
    const real = computeIndicatorStats(
      [
        point({ sst: 28.0 }, { period_start: '2024-01-01', period_end: '2024-01-31' }),
        point({ sst: 30.0 }, { period_start: '2024-03-01', period_end: '2024-03-31' }),
      ],
      'sst',
    );
    expect(real.momDeltaPct).toBeCloseTo((2 / 28) * 100);
  });

  it('reserves red for increasing chlorophyll-a; other indicators use their own rule', () => {
    const chlorUp = deltaStyle(12, 'chlor_a');
    expect(chlorUp.color.toLowerCase()).toBe('#ef4444');
    const sstUp = deltaStyle(12, 'sst');
    expect(sstUp.color.toLowerCase()).not.toBe('#ef4444');
    const vesselsUp = deltaStyle(12, 'vessels');
    expect(vesselsUp.color.toLowerCase()).not.toBe('#ef4444');
    // DetailsCard honors the same rule.
    expect(formatDelta(12, 'chlor_a').color.toLowerCase()).toBe('#ef4444');
    expect(formatDelta(12, 'sst').color.toLowerCase()).not.toBe('#ef4444');
    expect(formatDelta(null, 'sst').text).toBe('No data');
  });

  it('pctChange is null for missing or zero baselines, never 0%', () => {
    expect(pctChange(30, 28)).toBeCloseTo((2 / 28) * 100);
    expect(pctChange(NaN, 28)).toBeNull();
    expect(pctChange(30, NaN)).toBeNull();
    expect(pctChange(30, undefined)).toBeNull();
    expect(pctChange(30, 0)).toBeNull();
  });
});

describe('Choropleth null-vs-0 separation (F7)', () => {
  it.each(COASTAL_INDICATOR_IDS)('separates null from 0 for %s', (id) => {
    const nullColor = getIndicatorColor(id, null);
    const zeroColor = getIndicatorColor(id, 0);
    expect(nullColor.toLowerCase()).toBe(NO_DATA_COLOR.toLowerCase());
    expect(zeroColor.toLowerCase()).not.toBe(NO_DATA_COLOR.toLowerCase());
  });

  it('reads cell values from the values dict first, then legacy fields', () => {
    const cell = {
      chlor_a: 1.1,
      sst: 28.0,
      vessels: 3,
      values: { chlor_a: 9.9, wind_speed: 4.2 },
    };
    expect(getCellIndicatorValue(cell, 'chlor_a')).toBe(9.9);
    expect(getCellIndicatorValue(cell, 'wind_speed')).toBe(4.2);
    expect(getCellIndicatorValue(cell, 'sst')).toBe(28.0);
    expect(getCellIndicatorValue(cell, 'tc_wind')).toBeNull();
  });
});

describe('Export empty cells for nulls (F7)', () => {
  it('writes empty cells for null and keeps real zeros', () => {
    const rows = buildIndicatorExportRows(
      [
        point({ chlor_a: null, vessels: 0, sst: 28.5 }, { period_start: '2024-01-01', period_end: '2024-01-31' }),
        point({ chlor_a: 0, vessels: 4, sst: null }, { period_start: '2024-02-01', period_end: '2024-02-29' }),
      ],
      ['chlor_a', 'vessels', 'sst'],
    );
    expect(rows[0].chlor_a).toBeNull();
    expect(rows[0].vessels).toBe(0);
    expect(rows[1].chlor_a).toBe(0);
    expect(rows[1].sst).toBeNull();
    const csv = generateCsvContent(rows as Record<string, unknown>[], [
      { key: 'period_start', label: 'Period Start' },
      { key: 'chlor_a', label: 'Chlorophyll-a (mg/m³)' },
      { key: 'vessels', label: 'Vessel Count (vessels)' },
      { key: 'sst', label: 'Sea Surface Temperature (°C)' },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('"Period Start","Chlorophyll-a (mg/m³)","Vessel Count (vessels)","Sea Surface Temperature (°C)"');
    expect(lines[1]).toBe('"2024-01-01","","0","28.5"');
    expect(lines[2]).toBe('"2024-02-01","0","4",""');
  });
});
