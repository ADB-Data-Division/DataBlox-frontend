import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { SessionProvider, signIn, signOut } from 'next-auth/react';
import { auth } from '../auth';
import AppThemeProvider from '../style/theme/theme-provider';
import { ChartBarIcon, ChartScatterIcon, MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr';
import { ReduxProvider } from './store/provider';
import ForceLightMode from '../components/force-light-mode';
import './globals.css';

import type { Navigation } from '@toolpad/core/AppProvider';
import { RootState } from './store';
import { useAppSelector } from './store/hooks';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Visualizations',
  },
  {
    segment: '',
    title: 'Overview',
    icon: <ChartScatterIcon />,
  },
  // {
  //   segment: 'map',
  //   title: 'Map',
  //   icon: <MapTrifold />,
  // },
  // {
  //   segment: 'inter-province',
  //   title: 'Inter-Province Trends',
  //   icon: <ChartBar />,
  // },
  // {
  //   segment: 'intra-province',
  //   title: 'Intra-Province Trends',
  //   icon: <ChartBar />,
  // },
  // {
  //   segment: 'migration-flow',
  //   title: 'Migration Flow',
  //   icon: <CircleHalf />,
  // },
  // {
  //   segment: 'side-by-side',
  //   title: 'Side by Side',
  //   icon: <PresentationChart />,
  // },
  // {
  //   kind: 'header',
  //   title: 'System',
  // },
  // {
  //   segment: 'settings',
  //   title: 'Settings',
  //   icon: <Gear />,
  // },
];

const BRANDING = {
  title: 'Datablox',
  logo: <MapPinAreaIcon size={32} style={{ margin: '3px', borderRadius: '5px' }} />
};

const AUTHENTICATION = {
  signIn,
  signOut,
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ReduxProvider>
              <AppThemeProvider>
                <ForceLightMode />
                <div style={{ 
                  backgroundColor: '#FAFBFD', 
                  color: '#1A1A1A',
                  minHeight: '100vh'
                }}>
                  <NextAppProvider
                    navigation={NAVIGATION}
                    branding={BRANDING}
                    session={session}
                    authentication={AUTHENTICATION}
                    
                  >
                    {props.children}
                  </NextAppProvider>
                </div>
              </AppThemeProvider>
            </ReduxProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
