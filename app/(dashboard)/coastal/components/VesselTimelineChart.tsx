"use client";

import React from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { Box, Paper, Typography } from "@mui/material";

const generateData = () => {
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data = [];
  let id = 0;
  
  for (const year of years) {
    for (const month of months) {
      if (year === 2025 && months.indexOf(month) > 11) break;
      
      data.push({
        id: id++,
        date: new Date(year, months.indexOf(month)),
        label: `${month} ${year}`,
        trade: 120 + Math.random() * 50 + (year - 2019) * 20,
        harbor: 80 + Math.random() * 40 + (year - 2019) * 10,
        recreation: 40 + Math.random() * 30,
        miscellaneous: 60 + Math.random() * 20,
      });
    }
  }
  return data;
};

const chartData = generateData();

const CustomTooltip = (props: any) => {
  const { active, payload, label } = props;
  
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5, minWidth: 200, boxShadow: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Bali (Trade)
        </Typography>
        <Typography variant="body2">
          Period: {label}
        </Typography>
        <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
          Total: {Math.round(payload[0].value)} vessels
        </Typography>
        <Typography variant="body2">
          Cargo: {Math.round(payload[0].value * 0.8)} vessels
        </Typography>
        <Typography variant="body2">
          Tanker: {Math.round(payload[0].value * 0.2)} vessels
        </Typography>
      </Paper>
    );
  }

  return null;
};

export default function VesselTimelineChart() {
  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <LineChart
        dataset={chartData}
        xAxis={[
          {
            dataKey: "date",
            scaleType: "time",
            valueFormatter: (date) => date.getFullYear().toString(),
          },
        ]}
        series={[
          {
            dataKey: "trade",
            label: "Trade",
            color: "#6366f1",
            showMark: true,
          },
          {
            dataKey: "harbor",
            label: "Harbor",
            color: "#ef4444",
            showMark: true,
          },
          {
            dataKey: "recreation",
            label: "Recreation",
            color: "#f59e0b",
            showMark: true,
          },
          {
            dataKey: "miscellaneous",
            label: "Miscellaneous",
            color: "#9ca3af",
            showMark: true,
          },
        ]}
        margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
        slotProps={{
          legend: { hidden: true }
        }}
      />
    </Box>
  );
}
