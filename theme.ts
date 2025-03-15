
  "use client";
  import { createTheme } from '@mui/material/styles';

  const theme = createTheme({
    palette: {
      primary: {
        main: '#000000',
      },
      secondary: {
        main: '#000000',
      },
    },
    typography: {
      fontFamily: 'Poppins, sans-serif',
      h1: {
        fontSize: '2rem',
      },
      h2: {
        fontSize: '1.5rem',
      },
      body1: {
        fontSize: '1rem',
      },
      body2: {
        fontSize: '0.9rem',
      },
      
    },
    cssVariables: {
      colorSchemeSelector: 'data-toolpad-color-scheme',
    },
    colorSchemes: { light: true, dark: true },
  });

  export default theme;
  