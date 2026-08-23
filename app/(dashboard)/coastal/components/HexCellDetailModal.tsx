import React from 'react';
import { Box, Typography, IconButton, Card, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart } from '@mui/x-charts/LineChart';

export interface HexCellDetailModalProps {
  cellId?: string | null;
  locationName: string;
  dateRange: { start: string; end: string };
  indicators: string[];
  onClose: () => void;
}

const mockChartData = {
  xAxis: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  indicator1: [0.2, 0.5, 0.4, 0.8, 0.6, 0.9], // e.g., Chlorophyll-a
  indicator2: [12, 15, 10, 22, 18, 25], // e.g., Vessel Count
};

export default function HexCellDetailModal({
  cellId,
  locationName,
  dateRange,
  indicators,
  onClose,
}: HexCellDetailModalProps) {
  const theme = useTheme();

  if (!cellId) {
    return (
      <Card
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          minHeight: 200,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a hex on the map to view more details
        </Typography>
      </Card>
    );
  }

  const primaryIndicator = indicators[0] || 'Chlorophyll-a';
  const secondaryIndicator = indicators[1];

  const series = [];
  const yAxisConfig = [];

  if (primaryIndicator) {
    series.push({
      data: mockChartData.indicator1,
      yAxisId: 'leftAxis',
      color: theme.palette.primary.main,
      label: primaryIndicator,
    });
    yAxisConfig.push({ id: 'leftAxis' });
  }

  if (secondaryIndicator) {
    series.push({
      data: mockChartData.indicator2,
      yAxisId: 'rightAxis',
      color: theme.palette.error.main,
      label: secondaryIndicator,
    });
    yAxisConfig.push({ id: 'rightAxis', position: 'right' as const });
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: 'primary.main',
        borderWidth: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="div">
            Hex: {cellId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {locationName} · {dateRange.start} to {dateRange.end}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, textAlign: 'center', px: 2 }}>
          <Typography variant="body2" sx={{ color: '#f97316', fontWeight: 500 }}>
            Note: Only up to two lines can be displayed at a time.
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {primaryIndicator && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 4, bgcolor: theme.palette.primary.main }} />
                <Typography variant="caption">{primaryIndicator}</Typography>
              </Box>
            )}
            {secondaryIndicator && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 4, bgcolor: theme.palette.error.main }} />
                <Typography variant="caption">{secondaryIndicator}</Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close details">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: 300 }}>
        {series.length > 0 ? (
          <LineChart
            series={series}
            xAxis={[{ data: mockChartData.xAxis, scaleType: 'point' }]}
            yAxis={yAxisConfig}
            margin={{ top: 20, bottom: 30, left: 50, right: secondaryIndicator ? 50 : 20 }}
            slotProps={{ legend: { hidden: true } }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No indicators selected
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}
