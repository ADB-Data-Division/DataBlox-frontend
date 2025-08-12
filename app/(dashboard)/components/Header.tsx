'use client';

import { Typography, Box } from '@mui/material';

export function Header() {
  return (
    <Typography 
      variant="h3" 
      component="h1" 
      sx={{ 
        fontSize: '36px',
        fontFamily: 'var(--font-asap), sans-serif',
        fontWeight: '900',
        color: '#000000',
        letterSpacing: '-0.5px',
        mb: 2
      }}
    >
      Datablo<Box 
        component="span" 
        sx={{
          backgroundColor: '#0077BE',
          color: '#ffffff',
          padding: '0px 2px',
          borderRadius: '4px',
          marginLeft: '1px',
          display: 'inline-block'
        }}
      >
        x
      </Box>
    </Typography>
  );
}