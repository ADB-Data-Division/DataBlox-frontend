import type {
  CoastalVesselAggregation,
  CoastalVesselMetric,
  VesselTimelinePoint,
} from '@/types/coastal';

export interface VesselTypeGroup {
  category: string;
  subtypes: string[];
}

export interface VesselTimelineSeries {
  id?: string;
  dataKey: string;
  label: string;
  color: string;
  showMark: boolean;
}

export interface VesselTimelineExportColumn {
  key: string;
  label: string;
}

export interface VesselTimelineExportData {
  headers: VesselTimelineExportColumn[];
  rows: Record<string, unknown>[];
}

/** Type and subtype source data is only available as period totals. */
export function getVesselTypeTimelineAggregation(
  metric: CoastalVesselMetric,
  aggregation: CoastalVesselAggregation,
): CoastalVesselAggregation | null {
  return metric === 'vessel_count' && aggregation === 'average' ? 'sum' : null;
}

export function shouldShowVesselTypeSeries(
  metric: string,
  groups: VesselTypeGroup[],
): boolean {
  return metric === 'Vessel Count' && groups.length > 0;
}

function scaleCounts(counts: Record<string, number> | undefined, factor: number) {
  return Object.fromEntries(
    Object.entries(counts || {}).map(([key, value]) => [key, value * factor]),
  );
}

/**
 * Keep the selected backend metric values while attaching available type totals.
 * With `scaleToMetric`, type counts become shares of the metric value (the H3
 * average), so the type lines sum to the headline number. The split assumes the
 * type mix is the same in every cell.
 */
export function mergeVesselTimelineTypeData(
  metricTimeline: VesselTimelinePoint[],
  typeTimeline: VesselTimelinePoint[],
  scaleToMetric = false,
): VesselTimelinePoint[] {
  const typePointsByPeriod = new Map(
    typeTimeline.map((point) => [point.period_start.slice(0, 10), point]),
  );

  return metricTimeline.map((point) => {
    const typePoint = typePointsByPeriod.get(point.period_start.slice(0, 10));
    if (!typePoint) return point;

    let factor = 1;
    if (scaleToMetric) {
      const typeTotal = Object.values(typePoint.categories || {}).reduce((sum, v) => sum + v, 0);
      factor = typeTotal > 0 ? Number(point.metric_value ?? point.average_vessels_per_cell ?? 0) / typeTotal : 0;
    }
    const scale = (value: number | undefined) => (value === undefined ? value : value * factor);

    return {
      ...point,
      trade: scale(typePoint.trade),
      harbor: scale(typePoint.harbor),
      recreation: scale(typePoint.recreation),
      miscellaneous: scale(typePoint.miscellaneous),
      cargo: scale(typePoint.cargo),
      tanker: scale(typePoint.tanker),
      categories: scaleToMetric ? scaleCounts(typePoint.categories, factor) : typePoint.categories,
      sub_types: scaleToMetric
        ? Object.fromEntries(
          Object.entries(typePoint.sub_types || {}).map(([category, subtypes]) => [
            category, scaleCounts(subtypes, factor),
          ]),
        )
        : typePoint.sub_types,
      category_breakdown_available: typePoint.category_breakdown_available,
    };
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  trade: '#6366f1',
  harbor: '#ef4444',
  recreation: '#f59e0b',
  miscellaneous: '#9ca3af',
};

const FALLBACK_COLORS = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#be123c'];

export function categorySeriesKey(category: string): string {
  return `category:${category}`;
}

export function subtypeSeriesKey(category: string, subtype: string): string {
  return `subtype:${JSON.stringify([category, subtype])}`;
}

export function subtypeVisibilityKey(category: string, subtype: string): string {
  return JSON.stringify([category, subtype]);
}

export function vesselCategoryColor(category: string): string {
  const key = category.toLowerCase();
  if (CATEGORY_COLORS[key]) return CATEGORY_COLORS[key];
  const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function getVesselCategoryValue(point: VesselTimelinePoint, category: string): number {
  const apiValue = point.categories?.[category];
  if (typeof apiValue === 'number') return apiValue;
  switch (category.toLowerCase()) {
    case 'trade': return point.trade ?? 0;
    case 'harbor': return point.harbor ?? 0;
    case 'recreation': return point.recreation ?? 0;
    case 'miscellaneous': return point.miscellaneous ?? 0;
    default: return 0;
  }
}

export function getVesselTimelineTypeGroups(data: VesselTimelinePoint[]): VesselTypeGroup[] {
  const groups = new Map<string, Set<string>>();
  for (const point of data) {
    for (const [category, rawSubtypes] of Object.entries(point.sub_types || {})) {
      if (!rawSubtypes || typeof rawSubtypes !== 'object') continue;
      const subtypes = groups.get(category) || new Set<string>();
      for (const subtype of Object.keys(rawSubtypes)) subtypes.add(subtype);
      groups.set(category, subtypes);
    }
    for (const category of Object.keys(point.categories || {})) {
      if (!groups.has(category)) groups.set(category, new Set<string>());
    }
  }
  return [...groups.entries()].map(([category, subtypes]) => ({
    category,
    subtypes: [...subtypes].sort((a, b) => a.localeCompare(b)),
  }));
}

export function buildVesselTypeSeries(
  groups: VesselTypeGroup[],
  visibleSeries: Record<string, boolean>,
  visibleSubtypes: Record<string, boolean>,
  showMark: boolean,
): VesselTimelineSeries[] {
  return groups.flatMap(({ category, subtypes }) => {
    const color = vesselCategoryColor(category);
    const series: VesselTimelineSeries[] = [];
    if (visibleSeries[category] !== false) {
      series.push({
        dataKey: categorySeriesKey(category),
        label: category,
        color,
        showMark,
      });
    }
    for (const subtype of subtypes) {
      const visibilityKey = subtypeVisibilityKey(category, subtype);
      if (visibleSubtypes[visibilityKey] === false) continue;
      series.push({
        id: `sub-${series.length}-${category}-${subtype}`.replace(/[^\w-]/g, '_'),
        dataKey: subtypeSeriesKey(category, subtype),
        label: `${subtype} · ${category}`,
        color,
        showMark,
      });
    }
    return series;
  });
}

export function buildVesselTimelineExportData(
  timeline: VesselTimelinePoint[],
  groups: VesselTypeGroup[],
  metricLabel: string,
  includeTypeBreakdown: boolean,
  typeBreakdownLabelSuffix = '',
): VesselTimelineExportData {
  const headers: VesselTimelineExportColumn[] = [
    { key: 'period_start', label: 'Period Start' },
    { key: 'period_end', label: 'Period End' },
    { key: 'metric_value', label: metricLabel },
    { key: 'h3_cell_count', label: 'H3 Cells Included' },
  ];

  if (includeTypeBreakdown) {
    for (const { category, subtypes } of groups) {
      headers.push({
        key: categorySeriesKey(category),
        label: `${category} Vessels${typeBreakdownLabelSuffix}`,
      });
      for (const subtype of subtypes) {
        headers.push({
          key: subtypeSeriesKey(category, subtype),
          label: `${subtype} (${category}) Vessels${typeBreakdownLabelSuffix}`,
        });
      }
    }
  }

  const rows = timeline.map((point) => {
    const row: Record<string, unknown> = {
      period_start: point.period_start,
      period_end: point.period_end,
      metric_value: point.metric_value ?? point.total_vessels,
      h3_cell_count: point.h3_cell_count,
    };
    if (includeTypeBreakdown) {
      for (const { category, subtypes } of groups) {
        row[categorySeriesKey(category)] = getVesselCategoryValue(point, category);
        for (const subtype of subtypes) {
          row[subtypeSeriesKey(category, subtype)] = Number(
            point.sub_types?.[category]?.[subtype] ?? 0,
          );
        }
      }
    }
    return row;
  });

  return { headers, rows };
}
