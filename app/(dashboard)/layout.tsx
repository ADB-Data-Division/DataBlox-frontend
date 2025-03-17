'use client';
import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { Box, Typography, useTheme } from '@mui/material';
import ThemeToggle from '@/components/theme-toggle';

export default function Layout(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  
  return (
    <DashboardLayout
      // toolbarItems={[
      //   <ThemeToggle key="theme-toggle" />
      // ]}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 2,
          bgcolor: isDarkMode ? 'background.default' : undefined,
          color: isDarkMode ? 'text.primary' : undefined,
        }}
      >
        {props.children}
      </Box>
    </DashboardLayout>
  );
}  
