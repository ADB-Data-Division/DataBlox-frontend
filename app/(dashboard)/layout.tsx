'use client';
import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Box } from '@mui/material';

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 2,
      }}
      >{props.children}</Box>
    </DashboardLayout>
  );
}  
