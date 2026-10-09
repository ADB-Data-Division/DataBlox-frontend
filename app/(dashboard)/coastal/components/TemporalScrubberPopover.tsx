'use client';

import React from 'react';
import { Box } from '@mui/material';

export interface TemporalScrubberPopoverProps {
  percent: number;
  label: string;
}

export default function TemporalScrubberPopover({ percent, label }: TemporalScrubberPopoverProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 24,
        left: `${percent}%`,
        transform: 'translateX(-50%)',
        px: 0.75,
        py: 0.25,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.5,
        color: 'text.primary',
        whiteSpace: 'nowrap',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 1,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {label}
    </Box>
  );
}
