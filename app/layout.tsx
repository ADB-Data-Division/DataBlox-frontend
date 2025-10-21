import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { SessionProvider, signIn, signOut } from 'next-auth/react';
import { auth } from '../auth';
import AppThemeProvider from '../style/theme/theme-provider';
import { ChartBarIcon, ChartScatterIcon } from '@phosphor-icons/react/dist/ssr';
import { ReduxProvider } from './store/provider';
import ForceLightMode from '../components/force-light-mode';
import { Asap } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { UserTypeProvider } from './contexts/UserTypeContext';
import FooterWrapper from '../components/FooterWrapper';
import LogRocketInit from './components/LogRocketInit';
import UserTypeModalWrapper from '../components/user-type-modal/UserTypeModalWrapper';
import Image from 'next/image';
import type { Navigation } from '@toolpad/core/AppProvider';

// Configure Asap font with the weights we need
const asap = Asap({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-asap'
});

export const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Visualizations',
  },
  {
    segment: '',
    title: 'Overview',
    icon: <ChartScatterIcon />,
  },
  {
    segment: 'migration-analysis',
    title: 'Migration Analysis',
    icon: <ChartBarIcon />,
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
  logo: (
    <div className={asap.className} style={{ 
      fontSize: '24px', 
      fontWeight: '900',
      color: '#000000',
      margin: '3px',
      letterSpacing: '-0.5px'
    }}>
      Datablo<span style={{
        backgroundColor: '#0077BE',
        color: '#ffffff',
        padding: '2px 4px',
        borderRadius: '4px',
        marginLeft: '1px'
      }}>x</span>
    </div>
  )
};

const AUTHENTICATION = {
  signIn,
  signOut,
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning className={asap.variable}>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EV8SV1ZMW0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EV8SV1ZMW0', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `}
        </Script>
        <SessionProvider session={session}>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ReduxProvider>
              <AppThemeProvider>
                <UserTypeProvider>
                  <LogRocketInit />
                  <ForceLightMode />
                  <UserTypeModalWrapper />
                  <div style={{ 
                    backgroundColor: '#FFFFFF', 
                    color: '#1A1A1A',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ flex: '1' }}>
                      <NextAppProvider
                        navigation={NAVIGATION}
                        branding={BRANDING}
                        session={session}
                        authentication={AUTHENTICATION}
                        
                      >
                        {props.children}
                      </NextAppProvider>
                    </div>
                    <FooterWrapper />
                  </div>
                </UserTypeProvider>
              </AppThemeProvider>
            </ReduxProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
