'use client';
import * as React from 'react';
import { DashboardLayout, ToolbarActions } from '@toolpad/core/DashboardLayout';
import { Box, useTheme } from '@mui/material';

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
    // <DashboardLayout
    
    // defaultSidebarCollapsed
    // slots={{
    //   toolbarActions: NoToolbarActions,
    //   sidebarFooter: AccountSidebarFooter,
    // }}
    // >
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
    // {/* </DashboardLayout> */}
  );
}  
