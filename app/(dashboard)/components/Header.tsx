
'use client';

import { Typography, Box, Stack, Popover } from '@mui/material';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectivityStatus } from './ConnectivityStatus';
import Image from 'next/image';
import { useMemo, useState } from 'react';

const navigationLinks = [
  { title: "Migration",
    links: [
      { label: 'Migration Flow', href: '/migration-flows', preserveParams: true },
      { label: 'Migration Trends', href: '/migration-analysis', preserveParams: true },
      { label: 'Migration Sankey', href: '/sankey', preserveParams: true },
    ]
  },
  { title: "Tourism",
    links: [
      { label: 'Tourism Flow', href: '/tourism', preserveParams: true },
      { label: 'Tourism Trends', href: '/tourism-trend', preserveParams: true },
      { label: 'Overtourism', href: '/overtourism', preserveParams: true },
    ]
  },
  // { title: "Coastal Waters",
  //   links: [
  //     { label: 'Indicators', href: '/indicators', preserveParams: true },
  //     { label: 'Vessel Types', href: '/vessels', preserveParams: true },
  //   ]
  // },
  { title: "",
    links: [
      { label: 'DataBlox-OD Python Library', href: '/lib/index.html', preserveParams: false }
    ],
  }
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract the current segment from pathname
  const currentSegment = "/" + pathname.split('/').filter(Boolean)[0] || '';

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

      {/* Navigation Bar */}
      <Stack
        direction="row"
        spacing={5}
        sx={{
          mt: 2,
          mb: 1
        }}
      >
        {navigationLinks.map((category) => {
          const [open, setOpen] = useState(false);
          const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

          const isActive = category.links.some(
            (link) => link.href === currentSegment
          );

          const handleTrigger = (event: any) => {
            setAnchorEl(event.target);
            setOpen(true);
          }

          const handleOpen = () => {
            setOpen(true);
          }

          const handleClose = () => {
            setOpen(false);
          }

          return (
            <Box>
              {/* Category Title (Unhovered) */}
              {category.title ? (
                <Typography
                  variant="body1"
                  onMouseOver={handleTrigger}
                  onMouseLeave={handleClose}
                  sx={{
                    fontSize: '16px',
                    fontFamily: 'var(--font-asap), sans-serif',
                    fontWeight: isActive ? '700' : '400',
                    color: isActive ? '#0077BE' : '#666666',
                    cursor: 'pointer',
                    borderBottom: isActive ? '2px solid #0077BE' : '2px solid transparent',
                    px: 4,
                    pb: '2px',
                  }}
                >
                  {category.title}
                </Typography>
                ) : (
                  category.links.map((link) => (
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
                          fontWeight: '400',
                          color: '#666666',
                          cursor: 'pointer',
                          borderBottom: '2px solid transparent',
                          px: 4,
                          pb: '2px',
                          transition: 'color 0.2s ease',
                          '&:hover': {
                            color: '#0077BE',
                          },
                        }}
                      >
                        {link.label}
                      </Typography>
                    </Link>
                  )
                ))
              }
              
              {/* Dropdown Container */}
              <Popover
                anchorEl={anchorEl}
                open={open}
                slotProps={{
                  root: {
                    style: { pointerEvents: 'none' }
                  },
                  paper: {
                    onMouseEnter: handleOpen,
                    onMouseLeave: handleClose,
                    sx: {
                      minWidth: 180,
                      pt: '6px',
                      pb: '6px',
                      px: '12px',
                      mt: '-6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    },
                    style: { pointerEvents: 'auto' }
                  }
                }}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
              >
                {/* Category Title (Hovered) */}
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '16px',
                    fontFamily: 'var(--font-asap), sans-serif',
                    fontWeight: '700',
                    color: '#0077BE',
                    borderBottom: '2px solid #0077BE',
                    textAlign: 'center',
                    pb: '2px',
                  }}
                >
                  {category.title}
                </Typography>
                
                {/* Navigation Links */}
                {category.links.map((link) => {
                  const isActive = currentSegment === link.href;

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
                          fontWeight: '400',
                          color: isActive ? '#0077BE' : '#666666',
                          cursor: 'pointer',
                          transition: 'color 0.2s ease',
                          '&:hover': {
                            background: `${"#0077BE"}14`,
                          },
                          px: '12px',
                          py: '8px',
                          borderRadius: '8px',
                          my: '4px',
                        }}
                      >
                        {link.label}
                      </Typography>
                    </Link>
                  );
                })}
              </Popover>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}