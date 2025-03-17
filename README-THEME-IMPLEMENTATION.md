# Theme Implementation with Redux

This document outlines how theme mode (light/dark) is implemented in this application using Redux for state management and Material UI for theming.

## Overview

The application uses Redux to store user preferences, including theme mode. The theme mode can be set to:

- **Light**: Forces light mode regardless of system settings
- **Dark**: Forces dark mode regardless of system settings
- **System**: Follows the user's system preferences

The theme mode is persisted to localStorage using redux-persist, so it will be remembered between sessions.

## Key Components

### 1. Redux Store for User Preferences (`app/store/features/userPreferencesSlice.ts`)

The user preferences slice includes the theme mode:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferencesState {
  themeMode: ThemeMode;
  // Add other user preferences here as needed
}

const initialState: UserPreferencesState = {
  themeMode: 'light', // Default to light mode
};

export const userPreferencesSlice = createSlice({
  name: 'userPreferences',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    // Add other reducers for user preferences as needed
  },
});

export const { setThemeMode } = userPreferencesSlice.actions;
export default userPreferencesSlice.reducer;
```

### 2. Theme Provider (`style/theme/theme-provider.tsx`)

The theme provider component reads the theme mode from Redux and applies it to the Material UI theme:

```typescript
export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Get theme mode from Redux store
  const { themeMode } = useAppSelector(state => state.userPreferences);
  
  // State to hold the current theme mode (needed for SSR)
  const [mode, setMode] = useState<PaletteMode>('light');
  
  // Effect to update the theme mode when the Redux state changes
  // or when the component mounts (for system preference detection)
  useEffect(() => {
    if (themeMode === 'system') {
      // Check system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDarkMode ? 'dark' : 'light');
      
      // Listen for changes in system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setMode(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use the theme mode from Redux
      setMode(themeMode);
    }
  }, [themeMode]);
  
  // Create a theme instance with the current mode
  const theme = React.useMemo(() => {
    // Update the HTML attribute for Toolpad
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-toolpad-color-scheme', mode);
    }
    
    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        mode,
        // Adjust colors based on mode
        background: {
          default: mode === 'dark' ? '#121212' : '#f5f5f5',
          paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: mode === 'dark' ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
          secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
          disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
        },
      },
    });
  }, [mode]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
```

### 3. Theme Toggle Component (`components/theme-toggle.tsx`)

The theme toggle component allows users to switch between light, dark, and system theme modes:

```typescript
export default function ThemeToggle() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { themeMode } = useAppSelector(state => state.userPreferences);
  
  // ... component implementation ...
  
  const handleThemeChange = (mode: ThemeMode) => {
    dispatch(setThemeMode(mode));
    handleClose();
  };
  
  // ... render theme toggle UI ...
}
```

## Usage

### Accessing Theme Mode

You can access the current theme mode from any component using the `useTheme` hook from Material UI and the `useAppSelector` hook from Redux:

```typescript
import { useTheme } from '@mui/material';
import { useAppSelector } from '@/app/store/hooks';

function MyComponent() {
  const theme = useTheme();
  const { themeMode } = useAppSelector(state => state.userPreferences);
  
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <div style={{ color: isDarkMode ? 'white' : 'black' }}>
      Current theme mode: {themeMode}
    </div>
  );
}
```

### Changing Theme Mode

You can change the theme mode from any component using the `useAppDispatch` hook from Redux:

```typescript
import { useAppDispatch } from '@/app/store/hooks';
import { setThemeMode } from '@/app/store/features/userPreferencesSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  
  const handleSetLightMode = () => {
    dispatch(setThemeMode('light'));
  };
  
  const handleSetDarkMode = () => {
    dispatch(setThemeMode('dark'));
  };
  
  const handleSetSystemMode = () => {
    dispatch(setThemeMode('system'));
  };
  
  return (
    <div>
      <button onClick={handleSetLightMode}>Light Mode</button>
      <button onClick={handleSetDarkMode}>Dark Mode</button>
      <button onClick={handleSetSystemMode}>System Mode</button>
    </div>
  );
}
```

## Styling Components for Dark Mode

When styling components, you can use the `useTheme` hook to check if dark mode is active:

```typescript
import { useTheme } from '@mui/material';

function MyComponent() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <div
      style={{
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#000000',
      }}
    >
      This component adapts to the current theme mode
    </div>
  );
}
```

With Material UI's `sx` prop:

```typescript
import { Box, useTheme } from '@mui/material';

function MyComponent() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
        color: isDarkMode ? '#fff' : 'text.primary',
      }}
    >
      This component adapts to the current theme mode
    </Box>
  );
}
```

## Troubleshooting

### Theme Not Updating

If the theme is not updating when you change the theme mode, check the following:

1. Make sure the Redux store is properly set up with the userPreferences slice
2. Make sure the theme provider is properly set up to listen for changes in the Redux store
3. Make sure the theme toggle component is properly dispatching the setThemeMode action

### System Mode Not Working

If system mode is not working, check the following:

1. Make sure the theme provider is properly detecting system preferences using `window.matchMedia('(prefers-color-scheme: dark)')`
2. Make sure the theme provider is properly listening for changes in system preferences

### Dark Mode Styles Not Applied

If dark mode styles are not applied, check the following:

1. Make sure you're using the `useTheme` hook to get the current theme
2. Make sure you're checking `theme.palette.mode === 'dark'` to determine if dark mode is active
3. Make sure you're applying the appropriate styles based on the theme mode 