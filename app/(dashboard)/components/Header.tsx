'use client';

import { Typography, Box } from '@mui/material';

interface HeaderProps {
  subscript?: string;
}

export function Header({ subscript }: HeaderProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        sx={{ 
          fontSize: '36px',
          fontFamily: 'var(--font-asap), sans-serif',
          fontWeight: '900',
          color: '#000000',
          letterSpacing: '-0.5px',
          mb: 0
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
      {subscript && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '14px',
            fontFamily: 'var(--font-asap), sans-serif',
            fontWeight: '400',
            color: '#666666',
            fontStyle: 'italic',
            mt: 0.5,
            ml: 0.5
          }}
        >
          {subscript}
        </Typography>
      )}
    </Box>
  );
}