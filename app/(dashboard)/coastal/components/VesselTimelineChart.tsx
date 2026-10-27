"use client";

import React, { useMemo } from "react";
import { LineChart } from "@mui/x-charts";
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import type { CoastalVesselAggregation, VesselTimelinePoint } from "@/types/coastal";
import {
  buildVesselTypeSeries,
  categorySeriesKey,
  getVesselCategoryValue,
  getVesselTimelineTypeGroups,
  shouldShowVesselTypeSeries,
  subtypeSeriesKey,
} from "./vessel-timeline-model";

export interface VesselTimelineChartProps {
  data?: VesselTimelinePoint[];
  loading?: boolean;
  locationName?: string;
  selectedPeriod?: string | null;
  onSelectPeriod?: (periodStart: string) => void;
  visibleSeries?: Record<string, boolean>;
  visibleSubtypes?: Record<string, boolean>;
  metric?: string;
  aggregation?: CoastalVesselAggregation;
}

interface DatasetItem {
  id: number;
  period_start: string;
  period_end: string;
  date: Date;
  label: string;
  total_vessels: number;
  duration: number;
  metric_value: number;
  metric_label: string;
  metric_unit: string;
  h3_cell_count: number;
  [key: string]: string | number | Date | null | undefined;
}

function CustomAxisTooltip({
  dataIndex,
  locationName,
  dataset,
  timeline,
  metric,
  aggregation,
}: {
  dataIndex?: null | number;
  locationName?: string;
  dataset: DatasetItem[];
  timeline: VesselTimelinePoint[];
  metric: string;
  aggregation: CoastalVesselAggregation;
}) {
  if (dataIndex === null || dataIndex === undefined) {
    return null;
  }
  const item = dataset[dataIndex];
  const point = timeline[dataIndex];
  if (!item || !point) return null;
  const categories = point.categories || {};
  const subTypes = point.sub_types || {};
  const isAverageCount = metric === 'Vessel Count' && aggregation === 'average';
  const unit = isAverageCount ? 'vessels per cell' : 'vessels';

  return (
    <Paper sx={{ p: 1.5, minWidth: 200, boxShadow: 3, borderRadius: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {locationName || "Location"}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Period: {item.label}
      </Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
        {Object.keys(categories).length > 0 ? Object.entries(categories).map(([category, value]) => (
          <Box key={category} sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {category}: {value.toLocaleString()} {unit}
            </Typography>
            {Object.entries(subTypes[category] || {}).map(([subtype, count]) => (
              <Typography key={`${category}:${subtype}`} variant="caption" color="text.secondary" display="block" sx={{ pl: 1 }}>
                {subtype}: {count.toLocaleString()} {unit}
              </Typography>
            ))}
          </Box>
        )) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.metric_label}: {item.metric_value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.metric_unit}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              H3 cells included: {item.h3_cell_count.toLocaleString()}
            </Typography>
          </>
        )}

        {Object.keys(categories).length > 0 && <Box
          sx={{
            mt: 1,
            pt: 0.5,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {isAverageCount ? "Average per H3 cell:" : "Total:"}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {isAverageCount
              ? item.metric_value.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : item.total_vessels.toLocaleString()} {unit}
          </Typography>
        </Box>}
        {isAverageCount && Object.keys(categories).length > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            A vessel crossing cells counts in each.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function VesselTimelineChart({
  data = [],
  loading = false,
  locationName = "Location",
  selectedPeriod,
  onSelectPeriod,
  visibleSeries = {},
  visibleSubtypes = {},
  metric = "Vessel Count",
  aggregation = "average",
}: VesselTimelineChartProps) {
  const typeGroups = useMemo(() => getVesselTimelineTypeGroups(data), [data]);
  const showTypeBreakdown = shouldShowVesselTypeSeries(metric, typeGroups);

  const dataset: DatasetItem[] = useMemo(() => {
    return (data || []).map((pt, idx) => {
      const dt = new Date(pt.period_start);
      const label = isNaN(dt.getTime())
        ? pt.period_start
        : dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const metricValue = pt.metric_value ?? (
        metric === "Vessel Count"
          ? aggregation === "average" ? pt.average_vessels_per_cell : pt.total_vessels
          : metric === "Port Call Duration"
            ? aggregation === "average" ? pt.average_duration_hours_per_cell : pt.total_presence_hours
            : metric === "Presence Hours"
              ? aggregation === "average" ? pt.average_presence_hours_per_cell : pt.total_presence_hours
              : aggregation === "average" ? pt.average_stationary_hours_per_cell : pt.total_stationary_hours
      ) ?? 0;
      const metricLabel = metric === "Vessel Count"
        ? aggregation === "average" ? "Average vessels per H3 cell" : "Vessels"
        : metric === "Port Call Duration"
          ? aggregation === "average" ? "Average duration per occupied H3 cell" : "Total vessel presence hours"
          : metric === "Presence Hours"
            ? aggregation === "average" ? "Average presence hours per H3 cell" : "Total presence hours"
            : aggregation === "average" ? "Average stationary hours per H3 cell" : "Total stationary hours";
      const metricUnit = metric === "Vessel Count" ? "vessels" : "hours";
      return {
        id: idx,
        period_start: pt.period_start,
        period_end: pt.period_end,
        date: isNaN(dt.getTime()) ? new Date() : dt,
        label,
        total_vessels: pt.total_vessels ?? 0,
        duration: Number(pt.average_duration_hours_per_cell ?? pt.average_duration_hours ?? 0),
        metric_value: Number(metricValue),
        metric_label: metricLabel,
        metric_unit: metricUnit,
        h3_cell_count: pt.h3_cell_count ?? 0,
        ...Object.fromEntries(typeGroups.map(({ category }) => [
          categorySeriesKey(category), getVesselCategoryValue(pt, category),
        ])),
        ...Object.fromEntries(typeGroups.flatMap(({ category, subtypes }) => subtypes.map((subtype) => [
          subtypeSeriesKey(category, subtype), Number(pt.sub_types?.[category]?.[subtype] ?? 0),
        ]))),
      };
    });
  }, [aggregation, data, metric, typeGroups]);

  const series = useMemo(() => {
    const showMark = dataset.length <= 36;
    return !showTypeBreakdown
      ? [{ dataKey: "metric_value", label: dataset[0]?.metric_label || metric, color: "#0f766e", showMark }]
      : buildVesselTypeSeries(typeGroups, visibleSeries, visibleSubtypes, showMark);
  }, [dataset, metric, showTypeBreakdown, typeGroups, visibleSeries, visibleSubtypes]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 320,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!dataset.length) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 320,
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">
          No vessel timeline observations available for this period.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <LineChart
        dataset={dataset}
        xAxis={[
          {
            dataKey: "date",
            scaleType: "time",
            tickNumber: Math.min(10, Math.max(4, Math.floor(dataset.length / 4))),
            tickLabelStyle: { fontSize: 11, fill: "#6b7280" },
            valueFormatter: (date: Date) => {
              if (!date || isNaN(date.getTime())) return "";
              return date.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              });
            },
          },
        ]}
        series={series}
        sx={{ '& [class*="MuiLineElement-series-sub-"]': { strokeDasharray: '6 4' } }}
        margin={{ left: 60, right: 40, top: 20, bottom: 30 }}
        slots={{
          axisContent: (props: any) => (
            <CustomAxisTooltip
              {...props}
              locationName={locationName}
              dataset={dataset}
              timeline={data}
              metric={metric}
              aggregation={aggregation}
            />
          ),
        }}
        slotProps={{
          legend: { hidden: true },
        }}
        onAxisClick={(_event, d) => {
          if (
            d &&
            d.dataIndex !== undefined &&
            d.dataIndex !== null &&
            dataset[d.dataIndex]
          ) {
            onSelectPeriod?.(dataset[d.dataIndex].period_start);
          }
        }}
      />
    </Box>
  );
}
