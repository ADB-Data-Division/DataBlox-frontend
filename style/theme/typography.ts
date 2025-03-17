import { TypographyOptions } from '@mui/material/styles/createTypography';

// Define font families
const fontFamily = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
].join(',');

const typography: TypographyOptions = {
  fontFamily,
  // Headings
  h1: {
    fontWeight: 700,
    fontSize: '2.5rem',
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
    '@media (max-width:600px)': {
      fontSize: '2rem',
    },
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2,
    letterSpacing: '-0.00833em',
    '@media (max-width:600px)': {
      fontSize: '1.75rem',
    },
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    lineHeight: 1.3,
    letterSpacing: '0em',
    '@media (max-width:600px)': {
      fontSize: '1.5rem',
    },
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.35,
    letterSpacing: '0.00735em',
    '@media (max-width:600px)': {
      fontSize: '1.25rem',
    },
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.4,
    letterSpacing: '0em',
  },
  h6: {
    fontWeight: 600,
    fontSize: '3rem',
    lineHeight: 1.4,
    letterSpacing: '0.0075em',
  },
  
  // Body text
  body1: {
    fontWeight: 400,
    fontSize: '1rem',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontWeight: 400,
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.01071em',
  },
  
  // Other variants
  subtitle1: {
    fontWeight: 500,
    fontSize: '1rem',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontWeight: 500,
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.00714em',
  },
  button: {
    fontWeight: 600,
    fontSize: '0.875rem',
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none', // Override default uppercase
  },
  caption: {
    fontWeight: 400,
    fontSize: '0.75rem',
    lineHeight: 1.5,
    letterSpacing: '0.03333em',
  },
  overline: {
    fontWeight: 500,
    fontSize: '0.75rem',
    lineHeight: 1.5,
    letterSpacing: '0.08333em',
    textTransform: 'uppercase',
  },
};

export default typography;
