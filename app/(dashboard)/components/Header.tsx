'use client';

import { Typography, Box, Stack, Popover } from '@mui/material';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ConnectivityStatus } from './ConnectivityStatus';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';

interface NavSubLink {
  label: string;
  href: string;
  preserveParams?: boolean;
}

interface NavCategory {
  title: string;
  href?: string;
  links: NavSubLink[];
}

const navigationLinks: NavCategory[] = [
  {
    title: 'Migration',
    links: [
      { label: 'Migration Flow', href: '/migration-flows', preserveParams: true },
      { label: 'Migration Trends', href: '/migration-analysis', preserveParams: true },
      { label: 'Migration Sankey', href: '/sankey', preserveParams: true },
    ],
  },
  {
    title: 'Tourism',
    links: [
      { label: 'Tourism Flow', href: '/tourism', preserveParams: true },
      { label: 'Tourism Trends', href: '/tourism-trend', preserveParams: true },
      { label: 'Overtourism', href: '/overtourism', preserveParams: true },
    ],
  },
  {
    title: 'Water Quality',
    href: '/coastal',
    links: [
      { label: 'Indicators', href: '/coastal/indicators', preserveParams: true },
      { label: 'Vessel Types', href: '/coastal/vessels', preserveParams: true },
    ],
  },
];

interface NavCategoryItemProps {
  category: NavCategory;
  pathname: string;
  locationsParam: string | null;
  hasCoastalCountry: boolean;
  coastalParamsString: string;
}

function NavCategoryItem({
  category,
  pathname,
  locationsParam,
  hasCoastalCountry,
  coastalParamsString,
}: NavCategoryItemProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isCategoryActive = useMemo(() => {
    if (category.href && (pathname === category.href || pathname.startsWith(`${category.href}/`))) {
      return true;
    }
    return category.links.some(
      (link) => pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
    );
  }, [category, pathname]);

  const handleTrigger = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (!category.title) {
    return (
      <Box>
        {category.links.map((link) => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: '16px',
                fontFamily: 'var(--font-asap), sans-serif',
                fontWeight: '400',
                color: '#666666',
                cursor: 'pointer',
                borderBottom: '2px solid transparent',
                px: 2,
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
        ))}
      </Box>
    );
  }

  const categoryTitleContent = (
    <Typography
      variant="body1"
      onMouseOver={handleTrigger}
      onMouseLeave={handleClose}
      sx={{
        fontSize: '16px',
        fontFamily: 'var(--font-asap), sans-serif',
        fontWeight: isCategoryActive ? '700' : '400',
        color: isCategoryActive ? '#0077BE' : '#666666',
        cursor: 'pointer',
        borderBottom: isCategoryActive ? '2px solid #0077BE' : '2px solid transparent',
        px: 2,
        pb: '2px',
        transition: 'color 0.2s ease',
        '&:hover': {
          color: '#0077BE',
        },
      }}
    >
      {category.title}
    </Typography>
  );

  return (
    <Box>
      {/* Category Title (Unhovered) */}
      {category.href ? (
        <Link href={category.href} style={{ textDecoration: 'none' }}>
          {categoryTitleContent}
        </Link>
      ) : (
        categoryTitleContent
      )}

      {/* Dropdown Container */}
      <Popover
        anchorEl={anchorEl}
        open={open}
        slotProps={{
          root: {
            style: { pointerEvents: 'none' },
          },
          paper: {
            onMouseEnter: handleOpen,
            onMouseLeave: handleClose,
            sx: {
              minWidth: 190,
              pt: '6px',
              pb: '6px',
              px: '12px',
              mt: '-6px',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px',
              boxShadow: '0 8px 24px -6px rgba(0,52,104,0.18)',
            },
            style: { pointerEvents: 'auto' },
          },
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
        {category.href ? (
          <Link href={category.href} style={{ textDecoration: 'none' }}>
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
                cursor: 'pointer',
              }}
            >
              {category.title}
            </Typography>
          </Link>
        ) : (
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
        )}

        {/* Navigation Links */}
        {category.links.map((link) => {
          const isActive = pathname === link.href;

          // Preserve location params for migration/tourism, or coastal params when active search exists
          let href = link.href;
          if (link.href.startsWith('/coastal')) {
            if (hasCoastalCountry && coastalParamsString) {
              href = `${link.href}?${coastalParamsString}`;
            } else {
              href = '/coastal';
            }
          } else if (link.preserveParams && locationsParam) {
            href = `${link.href}?locations=${encodeURIComponent(locationsParam)}`;
          }

          return (
            <Link key={link.href} href={href} style={{ textDecoration: 'none' }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: '12px',
                  py: '8px',
                  borderRadius: '8px',
                  my: '4px',
                  backgroundColor: isActive ? '#0077BE14' : 'transparent',
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#0077BE14',
                  },
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '15px',
                    fontFamily: 'var(--font-asap), sans-serif',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? '#0077BE' : '#333333',
                    cursor: 'pointer',
                  }}
                >
                  {link.label}
                </Typography>
                <ArrowRight size={14} style={{ color: '#0077BE', flexShrink: 0 }} />
              </Stack>
            </Link>
          );
        })}
      </Popover>
    </Box>
  );
}

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current location params
  const locationsParam = useMemo(() => searchParams.get('locations'), [searchParams]);
  const hasCoastalCountry = useMemo(() => Boolean(searchParams.get('country')), [searchParams]);
  const coastalParamsString = useMemo(() => searchParams.toString(), [searchParams]);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0 }}
      >
        <Link href="/home" style={{ textDecoration: 'none' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Image
              src="/images/adb-jfpr-japan.webp"
              alt="ADB-JFPR Japan"
              width={774}
              height={198}
              style={{
                maxWidth: '200px',
                maxHeight: '48px',
                width: 'auto',
                height: 'auto',
              }}
              priority
            />
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
              Datablo
              <Box
                component="span"
                sx={{
                  backgroundColor: '#0077BE',
                  color: '#ffffff',
                  padding: '0px 2px',
                  borderRadius: '4px',
                  marginLeft: '1px',
                  display: 'inline-block',
                }}
              >
                x
              </Box>
            </Typography>
          </Stack>
        </Link>
        <ConnectivityStatus />
      </Stack>

      {/* Navigation Bar */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mt: 2,
          mb: 1,
        }}
      >
        {navigationLinks.map((category, index) => (
          <NavCategoryItem
            key={category.title || `nav-${index}`}
            category={category}
            pathname={pathname}
            locationsParam={locationsParam}
            hasCoastalCountry={hasCoastalCountry}
            coastalParamsString={coastalParamsString}
          />
        ))}
      </Stack>
    </Box>
  );
}