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
  palette,
  typography: updatedTypography,
  components,
  shape: {
    borderRadius: 12, // More modern, rounded corners
  },
  spacing: 8, // Consistent spacing unit
  // Enhanced color scheme support
  // @ts-ignore
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { 
    light: {
      palette: {
        ...palette,
        mode: 'light',
      }
    },
    dark: {
      palette: {
        mode: 'dark',
        primary: {
          main: '#60A5FA',
          light: '#93C5FD',
          dark: '#3B82F6',
          contrastText: '#fff',
        },
        secondary: {
          main: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
          contrastText: '#fff',
        },
        background: {
          default: '#0F172A',
          paper: '#1E293B',
          elevated: '#334155',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          disabled: '#64748B',
        },
        divider: '#475569',
      }
    }
  },
};

// Create the theme
let theme = createTheme(themeOptions);

// Make typography responsive
theme = responsiveFontSizes(theme);

export default theme;