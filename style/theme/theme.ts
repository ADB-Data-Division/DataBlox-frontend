// theme/theme.ts
import { createTheme, responsiveFontSizes, ThemeOptions } from '@mui/material/styles';
import typography from './typography';

// Define your color palette with values from theme.ts
const palette = {
  primary: {
    main: '#000000', // Updated from theme.ts
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#fff',
  },
  secondary: {
    main: '#000000', // Updated from theme.ts
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#fff',
  },
  // Add more colors as needed
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
};

// Override typography with values from theme.ts
const updatedTypography = {
  ...typography,
  fontFamily: 'Poppins, sans-serif', // Updated from theme.ts
  h1: {
    ...typography.h1,
    fontSize: '2rem', // Updated from theme.ts
  },
  h2: {
    ...typography.h2,
    fontSize: '1.5rem', // Updated from theme.ts
  },
  body1: {
    ...typography.body1,
    fontSize: '1rem', // Updated from theme.ts
  },
  body2: {
    ...typography.body2,
    fontSize: '0.9rem', // Updated from theme.ts
  },
};

// Define custom component overrides
const components = {
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
  // Add more component overrides as needed
};

// Create the theme configuration
const themeOptions: ThemeOptions = {
  palette,
  typography: updatedTypography,
  components,
  // You can add more theme options here
  shape: {
    borderRadius: 8,
  },
  // Add color scheme support from theme.ts
  // @ts-ignore
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
};

// Create the theme
let theme = createTheme(themeOptions);

// Make typography responsive
// theme = responsiveFontSizes(theme);

export default theme;