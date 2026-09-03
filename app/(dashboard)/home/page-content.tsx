'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Stack, Collapse, useTheme, useMediaQuery } from '@mui/material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowsLeftRight,
  ChartLine,
  TreeStructure,
  AirplaneTilt,
  TrendUp,
  Warning,
  ArrowRight,
  Boat,
  Leaf,
  Sailboat,
} from '@phosphor-icons/react/dist/ssr';
import { ConnectivityStatus } from '../components/ConnectivityStatus';

// ── Category data ──────────────────────────────────────────────────────────────

interface SubPage {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  preserveParams: boolean;
}

interface Category {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  href?: string;
  subPages: SubPage[];
}

const categories: Category[] = [
  {
    title: 'Migration',
    description: 'Analyze origin-destination migration flows across Thailand',
    icon: <ArrowsLeftRight size={36} weight="duotone" />,
    color: '#0077BE',
    gradient: 'linear-gradient(135deg, #003468 0%, #0077BE 100%)',
    subPages: [
      {
        label: 'Migration Flow',
        href: '/migration-flows',
        icon: <ArrowsLeftRight size={20} weight="duotone" />,
        description: 'Map-based migration flow visualization',
        preserveParams: true,
      },
      {
        label: 'Migration Trends',
        href: '/migration-analysis',
        icon: <ChartLine size={20} weight="duotone" />,
        description: 'Time-series migration trend analysis',
        preserveParams: true,
      },
      {
        label: 'Migration Sankey',
        href: '/sankey',
        icon: <TreeStructure size={20} weight="duotone" />,
        description: 'Sankey diagram of migration corridors',
        preserveParams: true,
      },
    ],
  },
  {
    title: 'Tourism',
    description: 'Explore tourism patterns and overtourism indicators',
    icon: <AirplaneTilt size={36} weight="duotone" />,
    color: '#1E88E5',
    gradient: 'linear-gradient(135deg, #2E5984 0%, #1E88E5 100%)',
    subPages: [
      {
        label: 'Tourism Flow',
        href: '/tourism',
        icon: <AirplaneTilt size={20} weight="duotone" />,
        description: 'Map-based tourism flow visualization',
        preserveParams: true,
      },
      {
        label: 'Tourism Trends',
        href: '/tourism-trend',
        icon: <TrendUp size={20} weight="duotone" />,
        description: 'Time-series tourism trend analysis',
        preserveParams: true,
      },
      {
        label: 'Overtourism',
        href: '/overtourism',
        icon: <Warning size={20} weight="duotone" />,
        description: 'Overtourism pressure scoring',
        preserveParams: true,
      },
    ],
  },
  {
    title: 'Coastal Waters',
    description: 'Examine water quality surrounding global seaports',
    icon: <Boat size={36} weight="duotone" />,
    color: '#3399D3',
    gradient: 'linear-gradient(135deg, #005A94 0%, #3399D3 100%)',
    href: '/coastal',
    subPages: [
      {
        label: 'Indicators',
        href: '/coastal/indicators',
        icon: <Leaf size={20} weight="duotone" />,
        description: 'Environment and human impact trends',
        preserveParams: false,
      },
      {
        label: 'Vessel Types',
        href: '/coastal/vessels',
        icon: <Sailboat size={20} weight="duotone" />,
        description: 'Marine traffic by vessel type',
        preserveParams: false,
      },
    ],
  },
];

// ── Touch device hook ──────────────────────────────────────────────────────────

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    check();
    // Re-check on resize (e.g. tablet rotation / desktop ↔ mobile emulation)
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isTouch;
}

// ── CategoryCard ───────────────────────────────────────────────────────────────

function CategoryCard({ category, locationsParam }: { category: Category; locationsParam: string | null }) {
  const isTouch = useIsTouchDevice();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  // On touch devices, toggle on tap; on pointer devices, expand on hover
  const showSubPages = isTouch ? expanded : hovered;

  const handleClick = useCallback(() => {
    if (isTouch) {
      if (expanded && category.href) {
        router.push(category.href);
        return;
      }
      setExpanded((prev) => !prev);
      return;
    }
    if (category.href) {
      router.push(category.href);
    }
  }, [category.href, expanded, isTouch, router]);

  return (
    <Card
      onMouseEnter={() => !isTouch && setHovered(true)}
      onMouseLeave={() => !isTouch && setHovered(false)}
      onClick={handleClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: showSubPages ? category.color : 'divider',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: showSubPages ? 'translateY(-4px)' : 'none',
        boxShadow: showSubPages
          ? `0 12px 32px -8px ${category.color}33`
          : '0 1px 3px rgba(0,0,0,0.06)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: category.gradient,
        },
      }}
    >
      <CardContent sx={{ pt: 3, pb: 2, px: 3 }}>
        {/* Icon + title */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: `${category.color}14`,
              color: category.color,
              flexShrink: 0,
              transition: 'background 0.3s',
              ...(showSubPages && { background: `${category.color}22` }),
            }}
          >
            {category.icon}
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'var(--font-asap), sans-serif',
                fontWeight: 700,
                fontSize: '1.15rem',
                color: 'text.primary',
              }}
            >
              {category.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem', lineHeight: 1.4 }}>
              {category.description}
            </Typography>
          </Box>
        </Stack>

        {/* Expandable sub-pages */}
        <Collapse in={showSubPages} timeout={250}>
          <Stack spacing={0.5} sx={{ mt: 1.5, mb: 0.5 }}>
            {category.subPages.map((page) => {
              const isCoastal = page.href.startsWith('/coastal');
              const target = page.href.includes('/vessels') ? 'vessels' : 'indicators';
              const href = isCoastal
                ? `/coastal?target=${target}`
                : page.preserveParams && locationsParam
                ? `${page.href}?locations=${encodeURIComponent(locationsParam)}`
                : page.href;

              return (
                <Link key={page.href} href={href} style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: '8px',
                      transition: 'background 0.2s',
                      '&:hover': { backgroundColor: `${category.color}0D` },
                    }}
                  >
                    <Box sx={{ color: category.color, display: 'flex', flexShrink: 0 }}>{page.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}
                      >
                        {page.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
                        {page.description}
                      </Typography>
                    </Box>
                    <ArrowRight size={16} style={{ color: category.color, flexShrink: 0 }} />
                  </Stack>
                </Link>
              );
            })}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ── Home page content ──────────────────────────────────────────────────────────

export default function PageContent() {
  const searchParams = useSearchParams();
  const locationsParam = searchParams.get('locations');

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      {/* Connectivity indicator (top-right) */}
      <Box sx={{ position: 'absolute', top: 24, right: 40 }}>
        <ConnectivityStatus />
      </Box>

      {/* ── Hero ── */}
      <Stack alignItems="center" spacing={1.5} sx={{ mb: { xs: 5, md: 7 } }}>
        <Image
          src="/images/adb-jfpr-japan.webp"
          alt="ADB-JFPR Japan"
          width={774}
          height={198}
          style={{ maxWidth: '220px', height: 'auto' }}
          priority
        />

        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontSize: { xs: '40px', md: '52px' },
            fontFamily: 'var(--font-asap), sans-serif',
            fontWeight: 900,
            color: '#000000',
            letterSpacing: '-0.5px',
            textAlign: 'center',
          }}
        >
          Datablo
          <Box
            component="span"
            sx={{
              backgroundColor: '#0077BE',
              color: '#ffffff',
              padding: '0px 4px',
              borderRadius: '6px',
              marginLeft: '2px',
              display: 'inline-block',
            }}
          >
            x
          </Box>
        </Typography>
      </Stack>

      {/* ── Category cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
          width: '100%',
          maxWidth: '960px',
          px: 2,
        }}
      >
        {categories.map((cat) => (
          <CategoryCard key={cat.title} category={cat} locationsParam={locationsParam} />
        ))}
      </Box>
    </Box>
  );
}
