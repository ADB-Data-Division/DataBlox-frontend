'use client';

import React from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface DownloadDataCardProps {
  onExportGraph: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  sources?: string;
}

export function DownloadDataCard({
  onExportGraph,
  onExportCsv,
  onExportExcel,
  sources = 'Sources: NOAA CoastWatch, Copernicus Climate Data Store, United Nations Global Platform, VesselBot',
}: DownloadDataCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#EAF4FF',
      }}
    >
      <Box
        component="img"
        src="/images/coastal/download.png"
        alt=""
        aria-hidden
        draggable={false}
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '100%',
          maxWidth: { xs: 220, sm: 320 },
          objectFit: 'contain',
          objectPosition: 'right bottom',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <CardContent sx={{ p: 2, position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ pr: { xs: 0, sm: 36 } }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Download Data
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sources}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={onExportGraph}
            >
              Graph
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={onExportCsv}
              sx={{ bgcolor: 'background.paper' }}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={onExportExcel}
              sx={{ bgcolor: 'background.paper' }}
            >
              Excel
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default DownloadDataCard;
