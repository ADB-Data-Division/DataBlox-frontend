import React, { useState, useMemo } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Grid } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

export interface ParentCategoryData {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface SubCategoryData {
  id: string;
  parentId: string;
  label: string;
  value: number;
}

export interface VesselDistributionResponse {
  total: number;
  parentCategories: ParentCategoryData[];
  subCategories: SubCategoryData[];
}

export interface VesselDistributionChartsProps {
  country: string;
  locationName: string;
  dateRange: { start: string; end: string };
  data?: VesselDistributionResponse;
  loading?: boolean;
}

export function VesselDistributionCharts({
  country,
  locationName,
  dateRange,
  data,
  loading
}: VesselDistributionChartsProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const parentData = useMemo(() => {
    if (!data) return [];
    return data.parentCategories.map((cat) => {
      const percentage = data.total > 0 ? ((cat.value / data.total) * 100).toFixed(1) : 0;
      return {
        id: cat.id,
        value: cat.value,
        label: `${cat.label}: ${percentage}% (${cat.value})`,
        color: cat.color,
      };
    });
  }, [data]);

  const subChartData = useMemo(() => {
    if (!data || !selectedParentId) return [];
    const subs = data.subCategories.filter((sub) => sub.parentId === selectedParentId);
    return subs.map((sub) => {
      return {
        label: sub.label,
        value: sub.value,
      };
    });
  }, [data, selectedParentId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%', minHeight: 400 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Vessel Types in {locationName}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {dateRange.start} to {dateRange.end}
            </Typography>
            <Box height={300} width="100%">
              <PieChart
                series={[
                  {
                    data: parentData,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    faded: { innerRadius: 30, additionalRadius: -30 },
                    innerRadius: 0,
                    outerRadius: 100,
                  },
                ]}
                onItemClick={(event, d) => {
                   const item = parentData[d.dataIndex];
                   if (item) setSelectedParentId(item.id);
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%', minHeight: 400 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!selectedParentId ? (
              <Box display="flex" flex={1} alignItems="center" justifyContent="center">
                <Typography variant="body1" color="textSecondary" align="center">
                  Select a slice on the pie chart to view more details
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" height="100%">
                <Typography variant="h6" component="h2" gutterBottom>
                  Sub-category Details
                </Typography>
                <Box flex={1} width="100%">
                  {subChartData.length > 0 ? (
                    <BarChart
                      xAxis={[{ scaleType: 'band', data: subChartData.map(d => d.label) }]}
                      series={[{ data: subChartData.map(d => d.value) }]}
                    />
                  ) : (
                    <Typography variant="body2">No data available for this category.</Typography>
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default VesselDistributionCharts;
