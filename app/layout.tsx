import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import type { Navigation } from '@toolpad/core/AppProvider';
import { SessionProvider, signIn, signOut } from 'next-auth/react';
import { auth } from '../auth';
import theme from '../theme';
import { ChartBar, ChartScatter, CircleHalf, MapTrifold, PresentationChart } from '@phosphor-icons/react/dist/ssr';

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
          
            <NextAppProvider
              navigation={NAVIGATION}
              branding={BRANDING}
              session={session}
              authentication={AUTHENTICATION}
              theme={theme}
            >
              {props.children}
            </NextAppProvider>
            
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
