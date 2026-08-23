'use client';

import { Typography, Box, Stack, Paper } from '@mui/material';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectivityStatus } from './ConnectivityStatus';
import Image from 'next/image';
import { useMemo } from 'react';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';

interface NavChild {
  label: string;
  href: string;
}

interface NavLink {
  label: string;
  href: string;
  segment: string;
  preserveParams: boolean;
  children?: NavChild[];
}

const navigationLinks: NavLink[] = [
  { label: 'Migration Flow', href: '/migration-flows', segment: 'migration-flows', preserveParams: true },
  { label: 'Migration Trends', href: '/migration-analysis', segment: 'migration-analysis', preserveParams: true },
  { label: 'Migration Sankey', href: '/sankey', segment: 'sankey', preserveParams: true },
  { label: 'Tourism Flow', href: '/tourism', segment: 'tourism', preserveParams: true },
  { label: 'Tourism Trends', href: '/tourism-trend', segment: 'tourism-trend', preserveParams: true },
  { label: 'Overtourism', href: '/overtourism', segment: 'overtourism', preserveParams: true },
  {
    label: 'Water Quality',
    href: '/coastal',
    segment: 'coastal',
    preserveParams: false,
    children: [
      { label: 'Indicators', href: '/coastal/indicators' },
      { label: 'Vessel Types', href: '/coastal/vessels' },
    ],
  },
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

        <Link href="/home" style={{ textDecoration: 'none' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontSize: '36px',
              fontFamily: 'var(--font-asap), sans-serif',
              fontWeight: '900',
              color: '#000000',
              letterSpacing: '-0.5px',
              mb: 0,
              cursor: 'pointer',
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
        </Link>
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
            <Box
              key={link.href}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                '&:hover .coastal-dropdown, &:focus-within .coastal-dropdown': {
                  opacity: 1,
                  visibility: 'visible',
                  transform: 'translateY(0)',
                },
              }}
            >
              <Link href={href} style={{ textDecoration: 'none' }}>
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
              {link.children && (
                <Box
                  className="coastal-dropdown"
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    pt: 1,
                    minWidth: 200,
                    opacity: 0,
                    visibility: 'hidden',
                    transform: 'translateY(4px)',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                  }}
                >
                  <Paper
                    sx={{
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      py: 1,
                      px: 0.5,
                      boxShadow: '0 8px 24px -6px rgba(0,52,104,0.18)',
                    }}
                  >
                    {link.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link key={child.href} href={child.href} style={{ textDecoration: 'none', display: 'block' }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: '6px',
                              backgroundColor: childActive ? '#0077BE14' : 'transparent',
                              transition: 'background 0.2s',
                              '&:hover': { backgroundColor: '#0077BE14' },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: childActive ? 600 : 400,
                                color: childActive ? '#0077BE' : 'text.primary',
                                fontFamily: 'var(--font-asap), sans-serif',
                                fontSize: '14px',
                              }}
                            >
                              {child.label}
                            </Typography>
                            <ArrowRight size={16} style={{ color: '#0077BE', flexShrink: 0 }} />
                          </Stack>
                        </Link>
                      );
                    })}
                  </Paper>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}