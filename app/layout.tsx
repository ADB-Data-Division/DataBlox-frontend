import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { SessionProvider, signIn, signOut } from 'next-auth/react';
import { auth } from '../auth';
import AppThemeProvider from '../style/theme/theme-provider';
import { ChartBar, ChartScatter, CircleHalf, MapTrifold, PresentationChart, Gear } from '@phosphor-icons/react/dist/ssr';
import { ReduxProvider } from './store/provider';

import type { Navigation } from '@toolpad/core/AppProvider';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Visualizations',
  },
  {
    segment: '',
    title: 'Overview',
    icon: <ChartScatter />,
  },
  {
    segment: 'map',
    title: 'Map',
    icon: <MapTrifold />,
  },
  {
    segment: 'inter-province',
    title: 'Inter-Province Trends',
    icon: <ChartBar />,
  },
  {
    segment: 'intra-province',
    title: 'Intra-Province Trends',
    icon: <ChartBar />,
  },
  {
    segment: 'industry-migration',
    title: 'Industry Migration',
    icon: <CircleHalf />,
  },
  {
    segment: 'side-by-side',
    title: 'Side by Side',
    icon: <PresentationChart />,
  },
  {
    kind: 'header',
    title: 'System',
  },
  {
    segment: 'settings',
    title: 'Settings',
    icon: <Gear />,
  },
];

const BRANDING = {
  title: 'ADB Thailand Capacity Building',
  logo: <ChartScatter size={32} style={{ margin: '3px', color: "white", borderRadius: '5px' }} />
};

const AUTHENTICATION = {
  signIn,
  signOut,
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" data-toolpad-color-scheme="light" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ReduxProvider>
              <AppThemeProvider>
                <NextAppProvider
                  navigation={NAVIGATION}
                  branding={BRANDING}
                  session={session}
                  authentication={AUTHENTICATION}
                  
                >
                  {props.children}
                </NextAppProvider>
              </AppThemeProvider>
            </ReduxProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
