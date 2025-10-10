'use client';

import { Typography, Box, Stack } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectivityStatus } from './ConnectivityStatus';
import Image from 'next/image';
const navigationLinks = [
  { label: 'Migration Flow', href: '/', segment: '' },
  { label: 'Migration Trends', href: '/migration-analysis', segment: 'migration-analysis' },
  { label: 'Migration Sankey', href: '/sankey', segment: 'sankey' },
  { label: 'Tourism Flow', href: '/tourism', segment: 'tourism' },
  { label: 'Tourism Trends', href: '/tourism-trend', segment: 'tourism-trend' },
  { label: 'DataBlox-OD Python Library', href: '/lib/index.html', segment: 'about' },
];

export function Header() {
  const pathname = usePathname();
  
  // Extract the current segment from pathname
  const currentSegment = pathname.split('/').filter(Boolean)[0] || '';

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
          
          return (
            <Link 
              key={link.href}
              href={link.href}
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