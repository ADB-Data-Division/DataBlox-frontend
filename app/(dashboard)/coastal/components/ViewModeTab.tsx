'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export type ViewModeGradient = 'blue' | 'teal';

const GRADIENTS: Record<ViewModeGradient, string> = {
  blue: 'linear-gradient(90deg, #0A2A6B 0%, #1E6FEB 100%)',
  teal: 'linear-gradient(90deg, #00564F 0%, #14B8A6 100%)',
};

interface ViewModeTabProps {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  vectorSrc?: string;
  vectorAlt?: string;
  gradient?: ViewModeGradient;
  onClick: () => void;
}

export function ViewModeTab({
  active,
  title,
  subtitle,
  icon,
  vectorSrc,
  vectorAlt = '',
  gradient = 'blue',
  onClick,
}: ViewModeTabProps) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        minHeight: 68,
        borderColor: active ? 'transparent' : undefined,
        background: active ? GRADIENTS[gradient] : 'background.paper',
        color: active ? '#ffffff' : 'text.primary',
        boxShadow: active ? 2 : undefined,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          zIndex: 1,
          color: active ? '#ffffff' : undefined,
          '& .MuiSvgIcon-root': { fontSize: 28 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ zIndex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.2, color: active ? '#ffffff' : undefined }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            lineHeight: 1.3,
            color: active ? 'rgba(255,255,255,0.85)' : 'text.secondary',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      {vectorSrc && active && (
        <Box
          component="img"
          src={vectorSrc}
          alt={vectorAlt}
          aria-hidden
          draggable={false}
          sx={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '130%',
            maxWidth: '45%',
            objectFit: 'contain',
            objectPosition: 'right center',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.9,
          }}
        />
      )}
    </Paper>
  );
}

export default ViewModeTab;
