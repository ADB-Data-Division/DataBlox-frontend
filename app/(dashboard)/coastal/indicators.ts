/**
 * Coastal indicators static registry.
 *
 * Mirrors the backend metadata contract from GET /coastal/indicators
 * (see plans/2026-09-26-coastal-all-abt-indicators-plan.md, sections 2 and 3).
 * Each entry carries `id, label, group, unit, agg, supports_map,
 * supports_timeline, null_policy`, plus frontend-only presentation fields
 * (color, map scale, delta colors, formatting).
 *
 * Backend may not be done yet: this file is written against the contract and
 * `src/tests/coastal/all-indicators.test.ts` compares these ids against a
 * fixture of the backend response to catch drift.
 *
 * Unit policy: everything is shown in the source unit except Kelvin, which the
 * backend converts to Celsius. No Kelvin anywhere in the frontend.
 *
 * Null policy (binding): `zero_fill` indicators (vessels, presence_hours,
 * stationary_vessels, duration) treat missing as a real 0. Every other
 * indicator keeps null as "no data" through SQL, API, store, chart, cards,
 * map, modal and export. Use `??`, never `||`, for value fallbacks.
 *
 * Delta color policy: red (#ef4444) is reserved for increasing
 * chlorophyll-a. Every other indicator uses its own registry rule
 * (blue up / green down).
 */

import type {
  CoastalIndicatorMetadata,
  CoastalNullPolicy,
} from '@/types/coastal';

export interface CoastalIndicatorPresentation {
  /** Line/chart color for this indicator. */
  color: string;
  /** Gradient stops (low to high) for the choropleth map. */
  mapColors: [string, string] | [string, string, string];
  /** Display domain [min, max] for the choropleth scale. Clamped, not fitted. */
  mapDomain: [number, number];
  /** Delta badge color for a positive month-over-month change. */
  deltaUpColor: string;
  /** Delta badge color for a negative month-over-month change. */
  deltaDownColor: string;
  /** Decimals used when formatting values in tooltips/cards. */
  decimals: number;
  /** Integer-only display (counts). Rounds instead of fixing decimals. */
  integer?: boolean;
  /** Short label for tight UI slots (map title, legend). */
  shortLabel: string;
  /** Emoji icon for summary cards, grouped by indicator family. */
  icon: string;
}

export type CoastalIndicatorEntry = CoastalIndicatorMetadata &
  CoastalIndicatorPresentation;

const CHLOR_UP = '#ef4444';
const CHLOR_DOWN = '#2563eb';
// Non-chlorophyll indicators never use red: blue up, green down.
const OTHER_UP = '#2563eb';
const OTHER_DOWN = '#16a34a';

export const NO_DATA_COLOR = '#cbd5e1';
export const NO_DATA_LABEL = 'No data';

function entry(
  base: CoastalIndicatorMetadata,
  presentation: CoastalIndicatorPresentation,
): CoastalIndicatorEntry {
  return { ...base, ...presentation };
}

export const COASTAL_INDICATORS: CoastalIndicatorEntry[] = [
  // Ocean color
  entry(
    { id: 'chlor_a', label: 'Chlorophyll-a', group: 'Ocean color', unit: 'mg/m³', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#10B981', mapColors: ['#22c55e', '#eab308', '#ef4444'], mapDomain: [0, 20], deltaUpColor: CHLOR_UP, deltaDownColor: CHLOR_DOWN, decimals: 2, shortLabel: 'Chlorophyll-a', icon: '🟢' },
  ),
  entry(
    { id: 'spm', label: 'Suspended Particulate Matter', group: 'Ocean color', unit: 'g/m³', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#0D9488', mapColors: ['#ccfbf1', '#2dd4bf', '#0f766e'], mapDomain: [0, 50], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 2, shortLabel: 'SPM', icon: '🟢' },
  ),
  entry(
    { id: 'kd490', label: 'Diffuse Attenuation (Kd490)', group: 'Ocean color', unit: '1/m', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#059669', mapColors: ['#d1fae5', '#34d399', '#065f46'], mapDomain: [0, 1], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 3, shortLabel: 'Kd490', icon: '🟢' },
  ),
  // Weather
  entry(
    { id: 'sst', label: 'Sea Surface Temperature', group: 'Weather', unit: '°C', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#F97316', mapColors: ['#fee2e2', '#f87171', '#b91c1c'], mapDomain: [15, 35], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 1, shortLabel: 'Sea Surface Temp.', icon: '🌡️' },
  ),
  entry(
    { id: 'air_temp', label: 'Air Temperature (2m)', group: 'Weather', unit: '°C', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#FB923C', mapColors: ['#ffedd5', '#fb923c', '#9a3412'], mapDomain: [15, 35], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 1, shortLabel: 'Air Temp.', icon: '🌡️' },
  ),
  entry(
    { id: 'wind_speed', label: 'Wind Speed (10m)', group: 'Weather', unit: 'm/s', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#38BDF8', mapColors: ['#e0f2fe', '#38bdf8', '#0c4a6e'], mapDomain: [0, 20], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 1, shortLabel: 'Wind Speed', icon: '💨' },
  ),
  entry(
    { id: 'pressure', label: 'Mean Sea Level Pressure', group: 'Weather', unit: 'Pa', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#64748B', mapColors: ['#f1f5f9', '#94a3b8', '#1e293b'], mapDomain: [99000, 103000], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, shortLabel: 'Pressure', icon: '🌡️' },
  ),
  entry(
    { id: 'cloud_cover', label: 'Total Cloud Cover', group: 'Weather', unit: 'fraction', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#94A3B8', mapColors: ['#f8fafc', '#94a3b8', '#334155'], mapDomain: [0, 1], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 2, shortLabel: 'Cloud Cover', icon: '☁️' },
  ),
  entry(
    { id: 'precipitation', label: 'Total Precipitation', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#0EA5E9', mapColors: ['#f0f9ff', '#38bdf8', '#075985'], mapDomain: [0, 0.5], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 3, shortLabel: 'Precipitation', icon: '🌧️' },
  ),
  entry(
    { id: 'surface_runoff', label: 'Surface Runoff', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#0284C7', mapColors: ['#f0f9ff', '#0284c7', '#082f49'], mapDomain: [0, 0.2], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 4, shortLabel: 'Surface Runoff', icon: '🌧️' },
  ),
  entry(
    { id: 'subsurface_runoff', label: 'Sub-surface Runoff', group: 'Weather', unit: 'm', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#0369A1', mapColors: ['#ecfeff', '#06b6d4', '#164e63'], mapDomain: [0, 0.2], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 4, shortLabel: 'Sub-surface Runoff', icon: '🌧️' },
  ),
  entry(
    { id: 'solar_radiation', label: 'Surface Solar Radiation', group: 'Weather', unit: 'J/m²', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#EAB308', mapColors: ['#fefce8', '#facc15', '#854d0e'], mapDomain: [0, 30000000], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, shortLabel: 'Solar Radiation', icon: '☀️' },
  ),
  // Vessels (zero_fill: the pipeline writes 0 for "no activity")
  entry(
    { id: 'vessels', label: 'Vessel Count', group: 'Vessels', unit: 'vessels', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
    { color: '#8B5CF6', mapColors: ['#fee2e2', '#f87171', '#991b1b'], mapDomain: [0, 50], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'Vessel Count', icon: '🚢' },
  ),
  entry(
    { id: 'presence_hours', label: 'Vessel Presence Hours', group: 'Vessels', unit: 'hours', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
    { color: '#6366F1', mapColors: ['#ede9fe', '#8b5cf6', '#4c1d95'], mapDomain: [0, 500], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 1, shortLabel: 'Presence Hours', icon: '🚢' },
  ),
  entry(
    { id: 'stationary_vessels', label: 'Stationary Vessel Count', group: 'Vessels', unit: 'vessels', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
    { color: '#A855F7', mapColors: ['#fae8ff', '#d946ef', '#701a75'], mapDomain: [0, 50], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'Stationary Vessels', icon: '⚓' },
  ),
  entry(
    { id: 'duration', label: 'Vessel Port Call Duration', group: 'Vessels', unit: 'hours', agg: 'average', supports_map: true, supports_timeline: true, null_policy: 'zero_fill' },
    { color: '#3B82F6', mapColors: ['#dbeafe', '#60a5fa', '#1e3a8a'], mapDomain: [0, 150], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 1, shortLabel: 'Port Call Duration', icon: '⏱️' },
  ),
  // SAR
  entry(
    { id: 'sar_detections', label: 'SAR Detections', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#EC4899', mapColors: ['#fdf2f8', '#ec4899', '#831843'], mapDomain: [0, 20], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'SAR Detections', icon: '📡' },
  ),
  entry(
    { id: 'sar_matched', label: 'SAR Matched Vessels', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#DB2777', mapColors: ['#fdf2f8', '#f472b6', '#9d174d'], mapDomain: [0, 20], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'SAR Matched', icon: '📡' },
  ),
  entry(
    { id: 'dark_detections', label: 'Dark Detections', group: 'SAR', unit: 'count', agg: 'sum', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#4C1D95', mapColors: ['#f5f3ff', '#a78bfa', '#2e1065'], mapDomain: [0, 20], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'Dark Detections', icon: '📡' },
  ),
  // Cyclones
  entry(
    { id: 'tc_wind', label: 'TC Sustained Wind', group: 'Cyclones', unit: 'kt', agg: 'max', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#DC2626', mapColors: ['#fef2f2', '#f87171', '#7f1d1d'], mapDomain: [0, 150], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, integer: true, shortLabel: 'TC Wind', icon: '🌀' },
  ),
  entry(
    { id: 'tc_distance', label: 'Distance to Nearest TC Track', group: 'Cyclones', unit: 'km', agg: 'min', supports_map: true, supports_timeline: true, null_policy: 'null' },
    { color: '#0E7490', mapColors: ['#ecfeff', '#22d3ee', '#083344'], mapDomain: [0, 2000], deltaUpColor: OTHER_UP, deltaDownColor: OTHER_DOWN, decimals: 0, shortLabel: 'TC Distance', icon: '🌀' },
  ),
];

export const COASTAL_INDICATOR_IDS: string[] = COASTAL_INDICATORS.map((e) => e.id);

const BY_ID: Record<string, CoastalIndicatorEntry> = Object.fromEntries(
  COASTAL_INDICATORS.map((e) => [e.id, e]),
);

export function getIndicatorMeta(id: string): CoastalIndicatorEntry | undefined {
  return BY_ID[id];
}

export function isZeroFillIndicator(id: string): boolean {
  return BY_ID[id]?.null_policy === 'zero_fill';
}

export function isKnownIndicatorId(id: string): boolean {
  return id in BY_ID;
}

/** Registry ids in a fixed group order for grouped UI (sidebar). */
export const COASTAL_INDICATOR_GROUPS: Array<{ group: string; ids: string[] }> = [
  'Ocean color',
  'Weather',
  'Vessels',
  'SAR',
  'Cyclones',
].map((group) => ({
  group,
  ids: COASTAL_INDICATORS.filter((e) => e.group === group).map((e) => e.id),
}));

/** Backend metadata shape for GET /coastal/indicators (contract section 3). */
export function toBackendMetadata(): CoastalIndicatorMetadata[] {
  return COASTAL_INDICATORS.map(
    ({ id, label, group, unit, agg, supports_map, supports_timeline, null_policy }): CoastalIndicatorMetadata => ({
      id,
      label,
      group,
      unit,
      agg,
      supports_map,
      supports_timeline,
      null_policy,
    }),
  );
}

export type { CoastalNullPolicy };
