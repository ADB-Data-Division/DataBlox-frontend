'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { IndicatorTimelinePoint } from '@/types/coastal';

export interface DetailsCardProps {
  selectedPoint?: IndicatorTimelinePoint | null;
  timeline?: IndicatorTimelinePoint[];
  activeIndicator?: string;
  locationName: string;
  grain: string;
}

export function DetailsCard({
  selectedPoint,
  timeline,
  activeIndicator = 'chlor_a',
  locationName,
  grain,
}: DetailsCardProps) {
  const theme = useTheme();
  const [activeSlide, setActiveSlide] = useState<number>(0);

  if (!selectedPoint) {
    return (
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          minHeight: 180,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Select a period on the graph to view more details
        </Typography>
      </Card>
    );
  }

  const indicatorTitle =
    activeIndicator === 'vessels'
      ? 'Vessel Count'
      : activeIndicator === 'duration'
      ? 'Port Call Duration'
      : activeIndicator === 'sst'
      ? 'Sea Surface Temperature Levels'
      : 'Chlorophyll-a Levels';

  const pointPeriod = selectedPoint.period_start || (selectedPoint as any).period || (selectedPoint as any).date || 'Selected Period';

  const tooltipFormula =
    'The % change is computed as the monthly average after minus before, divided by before, and multiplied by 100. Before is the same month of the previous year.\nAfter: 5.01 mg/m³\nBefore: 3.82 mg/m³';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        minHeight: 180,
        borderRadius: 2,
        borderColor: 'primary.main',
        borderWidth: 2,
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 0.5,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {indicatorTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {locationName} · {pointPeriod}
          </Typography>
        </Box>

        <Box sx={{ minHeight: 90 }}>
          {activeSlide === 0 ? (
            <Tooltip title={tooltipFormula} arrow placement="top">
              <Box sx={{ cursor: 'help' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Current vs Previous Month (%)
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h4" color="error.main" sx={{ fontWeight: 800 }}>
                    ↑ +65%
                  </Typography>
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Aug vs Jul 2022: <strong style={{ color: '#16a34a' }}>↑ +27%</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Jul vs Jun 2022: <strong>~ 0%</strong>
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Tooltip>
          ) : (
            <Tooltip title={tooltipFormula} arrow placement="top">
              <Box sx={{ cursor: 'help' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Current vs Same Month of Previous Year (%)
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h4" color="error.main" sx={{ fontWeight: 800 }}>
                    ↑ +31%
                  </Typography>
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Sep 2021 vs 2020: <strong style={{ color: '#dc2626' }}>↓ -36%</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Sep 2020 vs 2019: <strong style={{ color: '#dc2626' }}>↓ -8%</strong>
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Tooltip>
          )}
        </Box>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setActiveSlide(0)}
            aria-label="Slide 1 Month over Month"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              backgroundColor: activeSlide === 0 ? theme.palette.primary.main : theme.palette.grey[300],
              transition: 'background-color 0.2s',
            }}
          />
          <Box
            component="button"
            type="button"
            onClick={() => setActiveSlide(1)}
            aria-label="Slide 2 Year over Year"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              backgroundColor: activeSlide === 1 ? theme.palette.primary.main : theme.palette.grey[300],
              transition: 'background-color 0.2s',
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default DetailsCard;
