// theme/theme.ts
import { createTheme, responsiveFontSizes, ThemeOptions } from '@mui/material/styles';
import typography from './typography';

// ADB Official Brand Color Palette
const palette = {
  primary: {
    main: '#003468', // ADB Dark Navy Blue (from header)
    light: '#2E5984',
    dark: '#001E3F',
    contrastText: '#fff',
  },
  secondary: {
    main: '#0077BE', // ADB Bright Blue (from "WHO WE ARE" button)
    light: '#3399D3',
    dark: '#005A94',
    contrastText: '#fff',
  },
  tertiary: {
    main: '#1E88E5', // ADB Medium Blue for accents
    light: '#42A5F5',
    dark: '#1565C0',
    contrastText: '#fff',
  },
  background: {
    default: '#FAFBFD', // Very light blue-tinted background
    paper: '#FFFFFF',
    elevated: '#F8F9FB', // Subtle blue tint for elevated surfaces
  },
  text: {
    primary: '#1A1A1A', // Dark gray for readability
    secondary: '#5A6C7D', // Blue-tinted gray
    disabled: '#9EAAB7',
  },
  divider: '#E1E8ED',
  common: {
    black: '#000000',
    white: '#FFFFFF',
  },
  // Professional color system for data visualization
  success: {
    main: '#22C55E', // Professional green
    light: '#4ADE80',
    dark: '#16A34A',
    contrastText: '#fff',
  },
  warning: {
    main: '#F59E0B', // Professional amber
    light: '#FCD34D',
    dark: '#D97706',
    contrastText: '#fff',
  },
  error: {
    main: '#EF4444', // Professional red
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#fff',
  },
  info: {
    main: '#0077BE', // Use ADB blue for info
    light: '#3399D3',
    dark: '#005A94',
    contrastText: '#fff',
  },
};

// Enhanced typography with better hierarchy
const updatedTypography = {
  ...typography,
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Modern, readable font
  h1: {
    ...typography.h1,
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
  },
  h2: {
    ...typography.h2,
    fontSize: '1.875rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.025em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body1: {
    ...typography.body1,
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#374151',
  },
  body2: {
    ...typography.body2,
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: '#6B7280',
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    color: '#9CA3AF',
  },
};

// Enhanced component overrides for modern design
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: '#FAFBFD', // Force light background
        scrollbarWidth: 'thin',
        scrollbarColor: '#E5E7EB #F9FAFB',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#F9FAFB',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#E5E7EB',
          borderRadius: '3px',
          '&:hover': {
            backgroundColor: '#D1D5DB',
          },
        },
      },
      // Override Toolpad's dark mode CSS variables
      ':root': {
        '--mui-palette-common-background': '#FAFBFD !important',
        '--mui-palette-background-default': '#FAFBFD !important',
        '--mui-palette-background-paper': '#FFFFFF !important',
        '--mui-palette-text-primary': '#1A1A1A !important',
        '--mui-palette-text-secondary': '#5A6C7D !important',
      },
      // Force light mode for Toolpad components
      '[data-toolpad-color-scheme="dark"]': {
        '--mui-palette-common-background': '#FAFBFD !important',
        '--mui-palette-background-default': '#FAFBFD !important',
        '--mui-palette-background-paper': '#FFFFFF !important',
        '--mui-palette-text-primary': '#1A1A1A !important',
        '--mui-palette-text-secondary': '#5A6C7D !important',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none', // Remove default Material-UI gradient
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Softer shadows
      },
      elevation1: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      elevation2: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      elevation3: {
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        border: '1px solid #F3F4F6',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        padding: '8px 16px',
        transition: 'all 0.2s ease-in-out',
      },
      contained: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '6px',
        fontWeight: 500,
      },
    },
  },
  MuiTypography: {
    defaultProps: {
      variantMapping: {
        h1: 'h1',
        h2: 'h2',
        h3: 'h3',
        h4: 'h4',
        h5: 'h5',
        h6: 'h6',
        subtitle1: 'h6',
        subtitle2: 'h6',
        body1: 'p',
        body2: 'p',
      },
    },
  },
} as const;

// Create the theme configuration with enhanced design system
const themeOptions: ThemeOptions = {
  palette: {
    ...palette,
    mode: 'light', // Force light mode
  },
  typography: updatedTypography,
  components,
  shape: {
    borderRadius: 12, // More modern, rounded corners
  },
  spacing: 8, // Consistent spacing unit
};

// Create the theme
let theme = createTheme(themeOptions);

// Make typography responsive
theme = responsiveFontSizes(theme);

export default theme;