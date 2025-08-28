'use client';
import * as React from 'react';
import { DashboardLayout, ToolbarActions } from '@toolpad/core/DashboardLayout';
import { Box, useTheme } from '@mui/material';
import { ConnectivityProvider } from '../contexts/ConnectivityContext';
import { LocationProvider } from '../contexts';


const NoToolbarActions = () => {
  return null;
};

const AccountSidebarFooter = () => {
  return <div>AccountSidebarFooter</div>;
};

export default function Layout(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <ConnectivityProvider>
      <LocationProvider>
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
      </LocationProvider>
    </ConnectivityProvider>
  );
}  
