'use client';

import { Typography, Box, Stack } from '@mui/material';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectivityStatus } from './ConnectivityStatus';
import Image from 'next/image';
import { useMemo } from 'react';

const navigationLinks = [
  { label: 'Migration Flow', href: '/', segment: '', preserveParams: true },
  { label: 'Migration Trends', href: '/migration-analysis', segment: 'migration-analysis', preserveParams: true },
  { label: 'Migration Sankey', href: '/sankey', segment: 'sankey', preserveParams: true },
  { label: 'Tourism Flow', href: '/tourism', segment: 'tourism', preserveParams: false },
  { label: 'Tourism Trends', href: '/tourism-trend', segment: 'tourism-trend', preserveParams: false },
  { label: 'DataBlox-OD Python Library', href: '/lib/index.html', segment: 'about', preserveParams: false },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Extract the current segment from pathname
  const currentSegment = pathname.split('/').filter(Boolean)[0] || '';

  // Get current location params
  const locationsParam = useMemo(() => searchParams.get('locations'), [searchParams]);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ mb: 0 }}
      >
        
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontSize: '36px',
            fontFamily: 'var(--font-asap), sans-serif',
            fontWeight: '900',
            color: '#000000',
            letterSpacing: '-0.5px',
            mb: 0
          }}
        >
          <Image src="/images/adb-jfpr-japan.webp" alt="ADB-JFPR Japan" width={774} height={198} style={{ maxWidth: '200px', maxHeight: '54px', transform: 'translateY(13px)', marginRight: '1rem' }} />
          Datablo<Box 
            component="span" 
            sx={{
              backgroundColor: '#0077BE',
              color: '#ffffff',
              padding: '0px 2px',
              borderRadius: '4px',
              marginLeft: '1px',
              display: 'inline-block'
            }}
          >
            x
          </Box>
        </Typography>
        <ConnectivityStatus />
      </Stack>
      
      {/* Navigation Links */}
      <Stack 
        direction="row" 
        spacing={3} 
        sx={{ 
          mt: 2,
          mb: 1 
        }}
      >
        {navigationLinks.map((link) => {
          const isActive = currentSegment === link.segment;
          
          // Preserve location params when navigating between migration pages
          const href = link.preserveParams && locationsParam 
            ? `${link.href}?locations=${encodeURIComponent(locationsParam)}`
            : link.href;
          
          return (
            <Link 
              key={link.href}
              href={href}
              style={{ textDecoration: 'none' }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontSize: '16px',
                  fontFamily: 'var(--font-asap), sans-serif',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? '#0077BE' : '#666666',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#0077BE',
                  },
                  borderBottom: isActive ? '2px solid #0077BE' : '2px solid transparent',
                  paddingBottom: '2px',
                }}
              >
                {link.label}
              </Typography>
            </Link>
          );
        })}
      </Stack>
    </Box>
  );
}