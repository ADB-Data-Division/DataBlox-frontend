"use client";

import React, { useMemo } from "react";
import { LineChart } from "@mui/x-charts";
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import { VesselTimelinePoint } from "@/types/coastal";

export interface VesselTimelineChartProps {
  data?: VesselTimelinePoint[];
  loading?: boolean;
  locationName?: string;
  selectedPeriod?: string | null;
  onSelectPeriod?: (periodStart: string) => void;
  visibleSeries?: {
    trade: boolean;
    harbor: boolean;
    recreation: boolean;
    miscellaneous: boolean;
  };
  metric?: string;
}

interface DatasetItem {
  id: number;
  period_start: string;
  period_end: string;
  date: Date;
  label: string;
  trade: number;
  harbor: number;
  recreation: number;
  miscellaneous: number;
  cargo: number;
  tanker: number;
  total_vessels: number;
  duration: number;
  [key: string]: string | number | Date | null | undefined;
}

function CustomAxisTooltip({
  dataIndex,
  locationName,
  dataset,
}: {
  dataIndex?: null | number;
  locationName?: string;
  dataset: DatasetItem[];
}) {
  if (dataIndex === null || dataIndex === undefined) {
    return null;
  }
  const item = dataset[dataIndex];
  if (!item) return null;

  return (
    <Paper sx={{ p: 1.5, minWidth: 200, boxShadow: 3, borderRadius: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {locationName || "Location"}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Period: {item.label}
      </Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#6366f1" }}>
          Trade: {item.trade.toLocaleString()} vessels
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ pl: 1 }}
        >
          Cargo: {item.cargo.toLocaleString()} vessels
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ pl: 1 }}
        >
          Tanker: {item.tanker.toLocaleString()} vessels
        </Typography>

        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "#ef4444", mt: 0.5 }}
        >
          Harbor: {item.harbor.toLocaleString()} vessels
        </Typography>

        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "#f59e0b", mt: 0.5 }}
        >
          Recreation: {item.recreation.toLocaleString()} vessels
        </Typography>

        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "#9ca3af", mt: 0.5 }}
        >
          Miscellaneous: {item.miscellaneous.toLocaleString()} vessels
        </Typography>

        <Box
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
            Total:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {item.total_vessels.toLocaleString()} vessels
          </Typography>
        </Box>
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
  visibleSeries = {
    trade: true,
    harbor: true,
    recreation: true,
    miscellaneous: true,
  },
  metric = "Vessel Count",
}: VesselTimelineChartProps) {
  const isDuration = metric === "Port Call Duration";

  const dataset: DatasetItem[] = useMemo(() => {
    return (data || []).map((pt, idx) => {
      const dt = new Date(pt.period_start);
      const label = isNaN(dt.getTime())
        ? pt.period_start
        : dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return {
        id: idx,
        period_start: pt.period_start,
        period_end: pt.period_end,
        date: isNaN(dt.getTime()) ? new Date() : dt,
        label,
        trade: isDuration
          ? Number(pt.average_duration_hours || 0)
          : pt.trade ?? 0,
        harbor: isDuration
          ? Number(pt.average_duration_hours || 0)
          : pt.harbor ?? 0,
        recreation: isDuration
          ? Number(pt.average_duration_hours || 0)
          : pt.recreation ?? 0,
        miscellaneous: isDuration
          ? Number(pt.average_duration_hours || 0)
          : pt.miscellaneous ?? 0,
        cargo: pt.cargo ?? 0,
        tanker: pt.tanker ?? 0,
        total_vessels: pt.total_vessels ?? 0,
        duration: Number(pt.average_duration_hours || 0),
      };
    });
  }, [data, isDuration]);

  const series = useMemo(() => {
    const list = [];
    const showMark = dataset.length <= 36;

    if (visibleSeries.trade) {
      list.push({
        dataKey: "trade",
        label: "Trade",
        color: "#6366f1",
        showMark,
      });
    }
    if (visibleSeries.harbor) {
      list.push({
        dataKey: "harbor",
        label: "Harbor",
        color: "#ef4444",
        showMark,
      });
    }
    if (visibleSeries.recreation) {
      list.push({
        dataKey: "recreation",
        label: "Recreation",
        color: "#f59e0b",
        showMark,
      });
    }
    if (visibleSeries.miscellaneous) {
      list.push({
        dataKey: "miscellaneous",
        label: "Miscellaneous",
        color: "#9ca3af",
        showMark,
      });
    }
    return list;
  }, [visibleSeries, dataset.length]);

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
        margin={{ left: 60, right: 20, top: 20, bottom: 30 }}
        slots={{
          axisContent: (props: any) => (
            <CustomAxisTooltip
              {...props}
              locationName={locationName}
              dataset={dataset}
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
