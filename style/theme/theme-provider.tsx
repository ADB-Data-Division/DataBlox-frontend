'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAppSelector } from '@/app/store/hooks';
import { PaletteMode, useColorScheme, useTheme } from '@mui/material';

// Helper function to convert any mode to PaletteMode
const getPaletteMode = (mode: string | null | undefined): PaletteMode => {
  if (mode === 'dark') return 'dark';
  return 'light';
};

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Get theme mode from Redux store
  const theme = useTheme();
  const { themeMode } = useAppSelector(state => state.userPreferences);
  const { mode: systemMode, setMode: setSystemMode } = useColorScheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // State to hold the current theme mode (needed for SSR)
  const [mode, setMode] = useState<PaletteMode>(getPaletteMode(systemMode));
  
  // Effect to update the theme mode when the Redux state changes
  // or when the component mounts (for system preference detection)
  useEffect(() => {
	console.log('themeMode', themeMode);
	console.log('systemMode', systemMode);
	console.log('mode', mode);
	console.log('isDarkMode', isDarkMode);
    if (themeMode === 'system') {
      // Check system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDarkMode ? 'dark' : 'light');
	  setSystemMode(prefersDarkMode ? 'dark' : 'light');
      
      // Listen for changes in system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setMode(e.matches ? 'dark' : 'light');
        setSystemMode(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use the theme mode from Redux
      setMode(themeMode);
      setSystemMode(themeMode);
    }
  }, [themeMode, systemMode, setSystemMode, mode, isDarkMode]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
} 