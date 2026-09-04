'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import { Header } from '../components/Header';

export default function CoastalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ width: '100%' }}>
      <Header />
      {children}
    </Box>
  );
}
