'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';
import { cellToParent, cellToLatLng, isValidCell } from 'h3-js';
import { fetchSpatialGrid } from '@/services/coastalService';

export interface CoastalChoroplethMapProps {
  country: string;
  locationName?: string;
  aoiIds?: string[];
  activeIndicator: string;
  overlayVessels?: boolean;
  spatialSlice?: Record<string, any>;
  selectedCellIds?: string[];
  onSelectCell: (cellId: string) => void;
  onClearSelection?: () => void;
  loading?: boolean;
  periodLabel?: string;
  indicators?: string[];
  height?: number | string;
}

interface HexCellData {
  id: string;
  lat: number;
  lng: number;
  // Environmental readings stay null when the satellite has no observation
  // (cloud cover, sensor gaps). They must never fall back to 0: 0 K and
  // 0 mg/m3 are not real measurements. Vessel counts are real zeros.
  chlor_a: number | null;
  sst: number | null;
  vessels: number;
  coords?: [number, number][];
  // Set when this entry is an aggregated H3 parent rendered at far zoom.
  isCluster?: boolean;
  childCount?: number;
  // Seed parent ids absorbed into a merged circle (for selection highlight).
  memberIds?: string[];
}

// Native resolution of the grid payload.
const NATIVE_H3_RES = 7;

// Single cluster mode (no intermediate hex levels): below this Leaflet zoom
// the hexes are replaced by magnitude circles grouped at CLUSTER_PARENT_RES.
const CLUSTER_ZOOM_THRESHOLD = 9;
const CLUSTER_PARENT_RES = 4;

// Circle radius in screen pixels from member count (sqrt keeps big groups
// from exploding visually). Shared by the Deck and Leaflet render paths.
function clusterRadiusPx(childCount: number): number {
  return 10 + Math.sqrt(Math.max(childCount, 1)) * 5;
}

// Color scales
export const interpolateColor = (color1: string, color2: string, factor: number) => {
  const hex1 = color1.substring(1);
  const hex2 = color2.substring(1);

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getChlorophyllColor = (value: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '#cbd5e1';
  }
  const clamped = Math.max(0, Math.min(20, value));
  if (clamped <= 10) {
    return interpolateColor('#22c55e', '#eab308', clamped / 10);
  }
  return interpolateColor('#eab308', '#ef4444', (clamped - 10) / 10);
};

// Scales label font size with the vessel count (relative to the largest count
// on screen) and shrinks it further for multi-digit values so it stays inside the hex.
export const getVesselLabelSize = (vessels: number, maxVessels: number) => {
  const MIN_SIZE = 8;
  const MAX_SIZE = 15;
  const t = Math.sqrt(Math.max(vessels, 0) / Math.max(maxVessels, 1));
  const baseSize = MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
  const digits = String(vessels).length;
  return baseSize / (1 + (digits - 1) * 0.25);
};

export const getSSTColor = (value: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '#cbd5e1';
  }
  const clamped = Math.max(290, Math.min(310, value));
  const ratio = (clamped - 290) / 20;
  if (ratio < 0.5) {
    return interpolateColor('#fee2e2', '#f87171', ratio * 2);
  }
  return interpolateColor('#f87171', '#b91c1c', (ratio - 0.5) * 2);
};

export const getChlorophyllColorRgba = (value: number | null): [number, number, number, number] => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return [203, 213, 225, 215];
  }
  const clamped = Math.max(0, Math.min(20, value));
  if (clamped <= 10) {
    const t = clamped / 10;
    return [
      Math.round(34 + (234 - 34) * t),
      Math.round(197 + (179 - 197) * t),
      Math.round(94 + (8 - 94) * t),
      215,
    ];
  }
  const t = (clamped - 10) / 10;
  return [
    Math.round(234 + (239 - 234) * t),
    Math.round(179 + (68 - 179) * t),
    Math.round(8 + (68 - 8) * t),
    215,
  ];
};

export const getSSTColorRgba = (value: number | null): [number, number, number, number] => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return [203, 213, 225, 215];
  }
  const clamped = Math.max(290, Math.min(310, value));
  const ratio = (clamped - 290) / 20;
  if (ratio < 0.5) {
    const t = ratio * 2;
    return [
      Math.round(254 + (248 - 254) * t),
      Math.round(226 + (113 - 226) * t),
      Math.round(226 + (113 - 226) * t),
      215,
    ];
  }
  const t = (ratio - 0.5) * 2;
  return [
    Math.round(248 + (185 - 248) * t),
    Math.round(113 + (28 - 113) * t),
    Math.round(113 + (28 - 113) * t),
    215,
  ];
};

export const getVesselColor = (vessels: number) => {
  const maxDensity = 50;
  const clamped = Math.max(0, Math.min(maxDensity, vessels));
  const ratio = clamped / maxDensity;
  if (ratio < 0.5) {
    return interpolateColor('#fee2e2', '#f87171', ratio * 2);
  }
  return interpolateColor('#f87171', '#991b1b', (ratio - 0.5) * 2);
};

export const getVesselColorRgba = (vessels: number): [number, number, number, number] => {
  const maxDensity = 50;
  const clamped = Math.max(0, Math.min(maxDensity, vessels));
  if (clamped === 0) {
    // Zero-data hexes must stay visible against the light map background.
    // Matches the low end of the scale (and the legend gradient) instead of
    // near-transparent slate, which rendered as a blank map.
    return [254, 226, 226, 215];
  }
  const ratio = clamped / maxDensity;
  if (ratio < 0.5) {
    const t = ratio * 2;
    return [
      Math.round(254 + (248 - 254) * t),
      Math.round(226 + (113 - 226) * t),
      Math.round(226 + (113 - 226) * t),
      215,
    ];
  }
  const t = (ratio - 0.5) * 2;
  return [
    Math.round(248 + (153 - 248) * t),
    Math.round(113 + (27 - 113) * t),
    Math.round(113 + (27 - 113) * t),
    215,
  ];
};

export const getCellColorRgba = (
  cell: HexCellData,
  isChlor: boolean,
  isSST: boolean
): [number, number, number, number] => {
  if (isChlor) {
    return getChlorophyllColorRgba(cell.chlor_a);
  }
  if (isSST) {
    return getSSTColorRgba(cell.sst);
  }
  return getVesselColorRgba(cell.vessels);
};

// Missing readings render as N/A in tooltips, never as 0.
export const formatSST = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)} K`;
};

export const formatChlor = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)} mg/m³`;
};

const toNumberOrNull = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};


// Module-level caches to avoid dynamic import delay on remounts
let cachedL: any = null;
let cachedDeckModules: {
  DeckOverlay: any;
  PolygonLayer: any;
  ScatterplotLayer: any;
  TextLayer: any;
} | null = null;

// Location centers
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  bali: { lat: -8.52, lng: 115.22, zoom: 11 },
  denpasar: { lat: -8.68, lng: 115.23, zoom: 11 },
  jakarta: { lat: -6.18, lng: 106.83, zoom: 11 },
  surabaya: { lat: -7.25, lng: 112.75, zoom: 11 },
  semarang: { lat: -6.97, lng: 110.42, zoom: 11 },
  medan: { lat: 3.59, lng: 98.67, zoom: 11 },
  makassar: { lat: -5.14, lng: 119.43, zoom: 11 },
  idn: { lat: -8.52, lng: 115.22, zoom: 10 },
  laguna: { lat: 14.35, lng: 121.25, zoom: 11 },
  pangasinan: { lat: 16.03, lng: 120.33, zoom: 11 },
  subic: { lat: 14.82, lng: 120.28, zoom: 11 },
  batangas: { lat: 13.76, lng: 121.06, zoom: 11 },
  cebu: { lat: 10.31, lng: 123.89, zoom: 11 },
  manila: { lat: 14.59, lng: 120.98, zoom: 11 },
  davao: { lat: 7.07, lng: 125.61, zoom: 11 },
  iloilo: { lat: 10.72, lng: 122.56, zoom: 11 },
  phl: { lat: 15.95, lng: 120.35, zoom: 10 },
  bangkok: { lat: 13.48, lng: 100.58, zoom: 11 },
  'chon buri': { lat: 13.1, lng: 100.85, zoom: 11 },
  chonburi: { lat: 13.1, lng: 100.85, zoom: 11 },
  phuket: { lat: 7.88, lng: 98.39, zoom: 11 },
  songkhla: { lat: 7.20, lng: 100.60, zoom: 11 },
  rayong: { lat: 12.68, lng: 101.28, zoom: 11 },
  'samut prakan': { lat: 13.60, lng: 100.60, zoom: 11 },
  tha: { lat: 13.45, lng: 100.6, zoom: 10 },
  chittagong: { lat: 22.28, lng: 91.80, zoom: 11 },
  'cox\'s bazar': { lat: 21.43, lng: 91.98, zoom: 11 },
  mongla: { lat: 22.49, lng: 89.60, zoom: 11 },
  bgd: { lat: 22.28, lng: 91.80, zoom: 10 },
};

const KNOWN_LOCATION_AOIS: Record<string, string[]> = {
  pangasinan: ['PHL_anda_10km_172', 'PHL_binmaley_10km_140', 'PHL_city-of-alaminos_10km_139'],
  laguna: ['PHL_lumban_10km_187'],
  bali: ['IDN_denpasar-selatan_10km_73', 'IDN_gerokgak_10km_13', 'IDN_gerokgak_10km_498', 'IDN_karangasem_10km_16', 'IDN_negara_10km_555'],
};

function resolveCenter(locationName?: string, country?: string) {
  const locKey = (locationName || '').toLowerCase();
  for (const [key, val] of Object.entries(LOCATION_COORDINATES)) {
    if (locKey.includes(key)) {
      return val;
    }
  }
  const countryKey = (country || '').toLowerCase();
  for (const [key, val] of Object.entries(LOCATION_COORDINATES)) {
    if (countryKey.includes(key)) {
      return val;
    }
  }
  return { lat: -8.52, lng: 115.22, zoom: 11 };
}

function fitMapToCells(map: any, cells: HexCellData[]): [[number, number], [number, number]] | null {
  if (!map || !cells || cells.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const cell of cells) {
    if (cell.coords) {
      for (const [lat, lng] of cell.coords) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
    } else if (cell.lat !== undefined && cell.lng !== undefined) {
      if (cell.lat < minLat) minLat = cell.lat;
      if (cell.lat > maxLat) maxLat = cell.lat;
      if (cell.lng < minLng) minLng = cell.lng;
      if (cell.lng > maxLng) maxLng = cell.lng;
    }
  }

  if (minLat !== Infinity && maxLat !== -Infinity) {
    const bounds: [[number, number], [number, number]] = [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 12,
      animate: false,
    });
    return bounds;
  }
  return null;
}

function fitMapToCoords(map: any, coords: [number, number][]): void {
  if (!map || !coords || coords.length === 0) return;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (minLat !== Infinity && maxLat !== -Infinity) {
    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [48, 48], animate: true }
    );
  }
}

function CoastalChoroplethMapClient({
  country,
  locationName,
  aoiIds,
  activeIndicator,
  overlayVessels = false,
  spatialSlice,
  selectedCellIds = [],
  onSelectCell,
  onClearSelection,
  loading = false,
  indicators,
  height = 420,
}: CoastalChoroplethMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const deckOverlayRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const hasFittedRef = useRef<boolean>(false);
  const fittedBoundsRef = useRef<[[number, number], [number, number]] | null>(null);
  const resetViewRef = useRef<() => void>(() => {});
  const [L, setL] = useState<any>(cachedL);
  const [deckModules, setDeckModules] = useState<{
    DeckOverlay: any;
    PolygonLayer: any;
    ScatterplotLayer: any;
    TextLayer: any;
  } | null>(cachedDeckModules);
  const [genuineCells, setGenuineCells] = useState<HexCellData[] | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HexCellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  // Determine indicator type
  const isChlor = useMemo(() => {
    const key = (activeIndicator || '').toLowerCase();
    return key.includes('chlor') || key === 'chlor_a';
  }, [activeIndicator]);

  const isSST = useMemo(() => {
    const key = (activeIndicator || '').toLowerCase();
    return key.includes('sst') || key.includes('temp') || key.includes('surface');
  }, [activeIndicator]);

  const hasSST = useMemo(() => {
    if (indicators && indicators.length > 0) {
      return indicators.includes('sst');
    }
    return isSST;
  }, [indicators, isSST]);

  const hasChlor = useMemo(() => {
    if (indicators && indicators.length > 0) {
      return indicators.includes('chlor_a');
    }
    return true;
  }, [indicators]);

  const centerConfig = useMemo(() => {
    return resolveCenter(locationName, country);
  }, [locationName, country]);

  const aoiKey = useMemo(() => (aoiIds ? aoiIds.slice().sort().join(',') : ''), [aoiIds]);

  // Fetch and load genuine polygons for the country and filter by aoiIds
  useEffect(() => {
    let isCurrent = true;
    setGenuineCells(null);
    hasFittedRef.current = false;

    let targetAois = aoiIds && aoiIds.length > 0 ? aoiIds : undefined;
    if (!targetAois && locationName) {
      const locLower = locationName.toLowerCase();
      const matchedAois: string[] = [];
      for (const [key, aois] of Object.entries(KNOWN_LOCATION_AOIS)) {
        if (locLower.includes(key)) {
          matchedAois.push(...aois);
        }
      }
      if (matchedAois.length > 0) {
        targetAois = matchedAois;
      }
    }

    fetchSpatialGrid(country, targetAois)
      .then((collection) => {
        if (!isCurrent) return;
        if (collection && Array.isArray(collection.features) && collection.features.length > 0) {
          const cells: HexCellData[] = collection.features.map((feature, idx) => {
            let coords: [number, number][] = [];
            if (feature.properties?.coords && Array.isArray(feature.properties.coords)) {
              coords = feature.properties.coords as [number, number][];
            } else if (
              feature.geometry?.type === 'Polygon' &&
              Array.isArray(feature.geometry.coordinates) &&
              feature.geometry.coordinates[0]
            ) {
              coords = (feature.geometry.coordinates[0] as [number, number][]).map(
                ([lng, lat]) => [lat, lng]
              );
            }

            let lat = feature.properties?.lat as number;
            let lng = feature.properties?.lng as number;
            if ((lat === undefined || lng === undefined) && coords.length > 0) {
              const count =
                coords.length > 1 && coords[0][0] === coords[coords.length - 1][0]
                  ? coords.length - 1
                  : coords.length;
              lat = coords.slice(0, count).reduce((acc, pt) => acc + pt[0], 0) / count;
              lng = coords.slice(0, count).reduce((acc, pt) => acc + pt[1], 0) / count;
            }

            const hexId = String(feature.properties?.h3_index || feature.id || '');

            return {
              id: hexId,
              lat,
              lng,
              chlor_a: null,
              sst: null,
              vessels: 0,
              coords,
            };
          });
          setGenuineCells(cells);
        } else {
          setGenuineCells([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load spatial grid polygons:', err);
        if (isCurrent) {
          setGenuineCells([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [country, aoiKey, locationName]);

  // Generate or merge grid data
  const gridCells = useMemo(() => {
    // If genuine cells are loading, do not draw fallback grid to avoid flash of default content
    if (genuineCells === null) {
      return [];
    }

    const baseGrid = genuineCells && genuineCells.length > 0 ? genuineCells : [];

    if (!spatialSlice || Object.keys(spatialSlice).length === 0) {
      return baseGrid;
    }

    return baseGrid.map((cell) => {
      const sliceData = spatialSlice[cell.id];
      if (sliceData !== undefined && sliceData !== null) {
        if (typeof sliceData === 'number') {
          const n = toNumberOrNull(sliceData);
          return {
            ...cell,
            chlor_a: isChlor ? n : cell.chlor_a,
            sst: isSST ? n : cell.sst,
            vessels: !isChlor && !isSST ? Number(sliceData) || 0 : cell.vessels,
          };
        }
        const hasChlorKey = 'chlor_a' in sliceData;
        const hasSstKey =
          'sst' in sliceData || 'sst_k' in sliceData || 'sst_c' in sliceData;
        const chlor = hasChlorKey ? toNumberOrNull(sliceData.chlor_a) : cell.chlor_a;
        const sst = hasSstKey
          ? toNumberOrNull(sliceData.sst) ??
            toNumberOrNull(sliceData.sst_k) ??
            toNumberOrNull(sliceData.sst_c)
          : cell.sst;
        // When the slice carries the key with a null value, keep null (missing),
        // never fall back to 0. Fall back to the cell only when the key is absent.
        return {
          ...cell,
          chlor_a: chlor,
          sst: sst,
          vessels:
            sliceData.vessels !== undefined && sliceData.vessels !== null
              ? Number(sliceData.vessels) || 0
              : cell.vessels,
        };
      }
      return cell;
    });
  }, [genuineCells, centerConfig, spatialSlice, isChlor, isSST]);

  // Single cluster mode: far zoom shows one magnitude circle per parent
  // region (centerpoint of nearby hexes); close zoom shows the raw hexes.
  const showClusters = mapZoom !== null && mapZoom < CLUSTER_ZOOM_THRESHOLD;

  const clusterPoints = useMemo(() => {
    if (gridCells.length === 0) return [];

    const groups = new Map<
      string,
      {
        sumChlor: number;
        countChlor: number;
        sumSst: number;
        countSst: number;
        sumVessels: number;
        count: number;
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
      }
    >();
    try {
      for (const cell of gridCells) {
        if (!isValidCell(cell.id)) throw new Error(`Invalid H3 index: ${cell.id}`);
        const parent = cellToParent(cell.id, CLUSTER_PARENT_RES);
        const g = groups.get(parent) || {
          sumChlor: 0,
          countChlor: 0,
          sumSst: 0,
          countSst: 0,
          sumVessels: 0,
          count: 0,
          minLat: Infinity,
          maxLat: -Infinity,
          minLng: Infinity,
          maxLng: -Infinity,
        };
        const chlorN = toNumberOrNull(cell.chlor_a);
        if (chlorN !== null) {
          g.sumChlor += chlorN;
          g.countChlor += 1;
        }
        const sstN = toNumberOrNull(cell.sst);
        if (sstN !== null) {
          g.sumSst += sstN;
          g.countSst += 1;
        }
        g.sumVessels += Number(cell.vessels) || 0;
        g.count += 1;
        if (cell.lat < g.minLat) g.minLat = cell.lat;
        if (cell.lat > g.maxLat) g.maxLat = cell.lat;
        if (cell.lng < g.minLng) g.minLng = cell.lng;
        if (cell.lng > g.maxLng) g.maxLng = cell.lng;
        groups.set(parent, g);
      }
    } catch (err) {
      // Non-H3 ids: no clusters, fall back to raw rendering.
      console.warn('H3 clustering skipped:', err);
      return [];
    }

    const points: HexCellData[] = [];
    type Seed = {
      id: string;
      lat: number;
      lng: number;
      sumChlor: number;
      countChlor: number;
      sumSst: number;
      countSst: number;
      sumVessels: number;
      count: number;
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
      memberIds: string[];
    };
    const seeds: Seed[] = [];
    for (const [parent, g] of groups) {
      const [lat, lng] = cellToLatLng(parent);
      seeds.push({
        id: parent,
        lat,
        lng,
        sumChlor: g.sumChlor,
        countChlor: g.countChlor,
        sumSst: g.sumSst,
        countSst: g.countSst,
        sumVessels: g.sumVessels,
        count: g.count,
        minLat: g.minLat,
        maxLat: g.maxLat,
        minLng: g.minLng,
        maxLng: g.maxLng,
        memberIds: [parent],
      });
    }

    // Greedy screen-space merge: biggest seeds absorb overlapping neighbors
    // so rendered circles never overlap and only a few regions remain.
    // Pixel scale from Web Mercator at the current zoom.
    const zoom = mapZoom ?? CLUSTER_ZOOM_THRESHOLD;
    const pxPerDeg = (256 * Math.pow(2, zoom)) / 360;
    const distPx = (a: Seed, b: Seed) => {
      const dx = (a.lng - b.lng) * pxPerDeg;
      const midLat = (((a.lat + b.lat) / 2) * Math.PI) / 180;
      const dy = ((a.lat - b.lat) * pxPerDeg) / Math.max(Math.cos(midLat), 0.2);
      return Math.hypot(dx, dy);
    };
    seeds.sort((a, b) => b.count - a.count);
    const merged: Seed[] = [];
    for (const s of seeds) {
      const rS = clusterRadiusPx(s.count);
      let target: Seed | null = null;
      for (const m of merged) {
        if (distPx(s, m) < rS + clusterRadiusPx(m.count) + 6) {
          target = m;
          break;
        }
      }
      if (!target) {
        merged.push(s);
        continue;
      }
      const total = target.count + s.count;
      target.lat = (target.lat * target.count + s.lat * s.count) / total;
      target.lng = (target.lng * target.count + s.lng * s.count) / total;
      target.sumChlor += s.sumChlor;
      target.countChlor += s.countChlor;
      target.sumSst += s.sumSst;
      target.countSst += s.countSst;
      target.sumVessels += s.sumVessels;
      target.count = total;
      target.minLat = Math.min(target.minLat, s.minLat);
      target.maxLat = Math.max(target.maxLat, s.maxLat);
      target.minLng = Math.min(target.minLng, s.minLng);
      target.maxLng = Math.max(target.maxLng, s.maxLng);
      target.memberIds.push(...s.memberIds);
    }

    for (const m of merged) {
      points.push({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        chlor_a: m.countChlor > 0 ? m.sumChlor / m.countChlor : null,
        sst: m.countSst > 0 ? m.sumSst / m.countSst : null,
        vessels: m.sumVessels,
        // Bounds corners double as the zoom target via fitMapToCoords.
        coords: [
          [m.minLat, m.minLng],
          [m.maxLat, m.maxLng],
        ],
        isCluster: true,
        childCount: m.count,
        memberIds: m.memberIds,
      });
    }
    return points;
  }, [gridCells, mapZoom]);

  // Clusters containing a selected hex keep the highlight while zoomed out.
  const selectedClusterIds = useMemo(() => {
    if (!showClusters || selectedCellIds.length === 0) return new Set<string>();
    const parents = new Set<string>();
    for (const id of selectedCellIds) {
      try {
        if (isValidCell(id)) parents.add(cellToParent(id, CLUSTER_PARENT_RES));
      } catch {
        // Ignore ids that do not map to a parent.
      }
    }
    return parents;
  }, [showClusters, selectedCellIds]);

  // Dynamically load Leaflet and Deck.gl WebGL on client.
  // The load is retried via libAttempt: a remount during Fast Refresh (or any
  // orphaned import batch) can otherwise leave L unset forever, which renders
  // as a permanently gray map with no error.
  const [libAttempt, setLibAttempt] = useState(0);
  const [mapLibError, setMapLibError] = useState(false);
  useEffect(() => {
    let mounted = true;
    setMapLibError(false);
    Promise.all([
      import('leaflet'),
      import('@deck.gl-community/leaflet'),
      import('deck.gl'),
      typeof window !== 'undefined' ? import('leaflet/dist/leaflet.css') : Promise.resolve(),
    ])
      .then(([leafletModule, deckCommunityModule, deckGlModule]) => {
        cachedL = leafletModule.default;
        cachedDeckModules = {
          DeckOverlay: deckCommunityModule.DeckOverlay,
          PolygonLayer: deckGlModule.PolygonLayer,
          ScatterplotLayer: deckGlModule.ScatterplotLayer,
          TextLayer: deckGlModule.TextLayer,
        };
        if (mounted) {
          setL(cachedL);
          setDeckModules(cachedDeckModules);
        }
      })
      .catch((err) => {
        console.warn('Deck.gl WebGL load failed, falling back to Leaflet Canvas:', err);
        import('leaflet')
          .then((leafletModule) => {
            if (mounted) {
              cachedL = leafletModule.default;
              setL(cachedL);
            }
          })
          .catch(() => {
            if (mounted) {
              setMapLibError(true);
            }
          });
      });
    return () => {
      mounted = false;
    };
  }, [libAttempt]);

  // Watchdog: if the map libraries never arrive (orphaned imports), retry a
  // few times, then surface an error with a manual retry instead of gray.
  useEffect(() => {
    if (L) return;
    if (libAttempt >= 3) {
      setMapLibError(true);
      return;
    }
    const t = setTimeout(() => setLibAttempt((a) => a + 1), 4000);
    return () => clearTimeout(t);
  }, [L, libAttempt]);

  // Initialize Map
  useEffect(() => {
    if (!L || !mapContainerRef.current || leafletMapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerConfig.lat, centerConfig.lng],
      zoom: centerConfig.zoom,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
      scrollWheelZoom: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const ResetViewControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const link = L.DomUtil.create('a', '', container);
        link.href = '#';
        link.title = 'Reset view';
        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', 'Reset view');
        link.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path></svg>';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(link, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e);
          resetViewRef.current();
        });
        return container;
      },
    });
    new ResetViewControl().addTo(map);

    // Esri World Imagery: satellite basemap, no political boundary lines
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
      }
    ).addTo(map);

    if (deckModules) {
      try {
        const overlay = new deckModules.DeckOverlay({
          layers: [],
          // Keep the WebGL drawing buffer readable so the Download Graph
          // PNG export can composite the hex layer via drawImage.
          glOptions: { preserveDrawingBuffer: true },
        });
        overlay.addTo(map);
        deckOverlayRef.current = overlay;
      } catch (err) {
        console.warn('Failed to attach DeckOverlay to Leaflet:', err);
      }
    }

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    leafletMapRef.current = map;

    // Track zoom so far levels can render aggregated H3 parents.
    setMapZoom(map.getZoom());
    const handleZoomEnd = () => {
      setMapZoom(map.getZoom());
      // Layer mode may have switched (circles <-> hexes); drop stale hover.
      setHoveredCell(null);
      setTooltipPos(null);
    };
    map.on('zoomend', handleZoomEnd);

    // Immediately fit to genuineCells if already resolved, or stored fittedBounds
    if (genuineCells && genuineCells.length > 0) {
      const bounds = fitMapToCells(map, genuineCells);
      if (bounds) {
        fittedBoundsRef.current = bounds;
      }
    } else if (fittedBoundsRef.current) {
      map.fitBounds(fittedBoundsRef.current, { padding: [24, 24], maxZoom: 12, animate: false });
    }

    // First mount can race layout/CSS settling: Leaflet measures the container
    // once at creation, so a map created before layout settles stays gray
    // (tiles + Deck canvas) until a remount. Force a resize after paint.
    const settleRaf = requestAnimationFrame(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore resize error
      }
    });
    const settleTimer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore resize error
      }
    }, 150);

    return () => {
      cancelAnimationFrame(settleRaf);
      clearTimeout(settleTimer);
      if (deckOverlayRef.current) {
        try {
          deckOverlayRef.current.remove();
        } catch {
          // Ignore unmount error
        }
        deckOverlayRef.current = null;
      }
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.off('zoomend', handleZoomEnd);
        } catch {
          // Ignore unmount error
        }
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [L, centerConfig, deckModules]);

  // Immediately reset map view when a new location or search is received
  useEffect(() => {
    fittedBoundsRef.current = null;
    const map = leafletMapRef.current;
    if (map) {
      map.setView([centerConfig.lat, centerConfig.lng], centerConfig.zoom, { animate: false });
    }
  }, [locationName, country, aoiKey, centerConfig]);

  // Update bounds or fallback center when genuine cells change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) {
      return;
    }

    if (genuineCells && genuineCells.length > 0) {
      const bounds = fitMapToCells(map, genuineCells);
      if (bounds) {
        fittedBoundsRef.current = bounds;
        return;
      }
    }

    // Graceful fallback to center coordinates only when genuineCells has finished loading with 0 cells
    if (genuineCells !== null && genuineCells.length === 0) {
      fittedBoundsRef.current = null;
      map.setView([centerConfig.lat, centerConfig.lng], centerConfig.zoom, {
        animate: false,
      });
    }
  }, [genuineCells, centerConfig]);

  // Keep the Leaflet reset control's click handler pointed at the latest bounds/center
  useEffect(() => {
    resetViewRef.current = () => {
      const map = leafletMapRef.current;
      if (!map) return;

      if (fittedBoundsRef.current) {
        map.fitBounds(fittedBoundsRef.current, { padding: [24, 24], maxZoom: 12 });
      } else {
        map.setView([centerConfig.lat, centerConfig.lng], centerConfig.zoom);
      }
    };
  }, [centerConfig]);

  // Adjust Leaflet map size when container height changes
  useEffect(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.invalidateSize();
    }
  }, [height]);

  // Re-assert map size once grid and slice data land. On first load the map is
  // often initialized before layout settles, leaving gray tiles/hexes until a
  // remount (e.g. switching tabs and back). The timeout is cleared while
  // scrubbing so it only fires once the slider settles.
  useEffect(() => {
    if (!genuineCells || genuineCells.length === 0) return;
    const map = leafletMapRef.current;
    if (!map) return;
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore resize error
      }
    }, 60);
    return () => clearTimeout(t);
  }, [genuineCells, spatialSlice]);

  // WebGL hardware-accelerated rendering via Deck.gl
  useEffect(() => {
    if (!deckOverlayRef.current || !deckModules) {
      return;
    }

    // Clear fallback Leaflet layers if Deck.gl is active
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    }

    const { PolygonLayer, ScatterplotLayer, TextLayer } = deckModules;

    const handleHexClick = (d: HexCellData) => {
      if (onSelectCell) {
        onSelectCell(d.id);
      }
    };

    const handleClusterClick = (d: HexCellData) => {
      // Zoom only, never select.
      fitMapToCoords(leafletMapRef.current, d.coords || []);
    };

    const handleHover = (info: any) => {
      if (info.object) {
        setHoveredCell(info.object);
        setTooltipPos({ x: info.x, y: info.y });
      } else {
        setHoveredCell(null);
        setTooltipPos(null);
      }
    };

    const layers: any[] = [];

    if (showClusters) {
      // Far zoom: magnitude circles at the centerpoint of nearby hexes.
      layers.push(
        new ScatterplotLayer({
          id: 'h3-clusters-webgl',
          data: clusterPoints,
          getPosition: (d: HexCellData) => [d.lng, d.lat],
          getRadius: (d: HexCellData) => clusterRadiusPx(d.childCount || 1),
          radiusUnits: 'pixels',
          radiusMinPixels: 14,
          radiusMaxPixels: 64,
          getFillColor: (d: HexCellData) => getCellColorRgba(d, isChlor, isSST),
          getLineColor: (d: HexCellData) =>
            (d.memberIds || [d.id]).some((m) => selectedClusterIds.has(m))
              ? [239, 68, 68, 255]
              : [255, 255, 255, 230],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          stroked: true,
          filled: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 90],
          onClick: (info: any) => {
            if (info.object) handleClusterClick(info.object);
          },
          onHover: handleHover,
          updateTriggers: {
            getFillColor: [isChlor, isSST, activeIndicator, spatialSlice],
            getRadius: [clusterPoints],
            getLineColor: [selectedClusterIds],
          },
        })
      );
    } else {
      layers.push(
        new PolygonLayer({
          id: 'h3-hexagons-webgl',
          data: gridCells,
          getPolygon: (d: HexCellData) =>
            d.coords ? d.coords.map(([lat, lng]) => [lng, lat]) : [],
          getFillColor: (d: HexCellData) => getCellColorRgba(d, isChlor, isSST),
          getLineColor: (d: HexCellData) =>
            selectedCellIds.includes(d.id) ? [239, 68, 68, 255] : [255, 255, 255, 200],
          getLineWidth: (d: HexCellData) => (selectedCellIds.includes(d.id) ? 3.5 : 1),
          lineWidthUnits: 'pixels',
          filled: true,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 90],
          onClick: (info: any) => {
            if (info.object) handleHexClick(info.object);
          },
          onHover: handleHover,
          updateTriggers: {
            getFillColor: [isChlor, isSST, activeIndicator, spatialSlice],
            getLineColor: [selectedCellIds],
            getLineWidth: [selectedCellIds],
          },
        })
      );
    }

    if (overlayVessels && !showClusters) {
      const vesselCells = gridCells.filter((c) => c.vessels !== undefined && c.vessels > 0);
      const maxVessels = Math.max(...vesselCells.map((c) => c.vessels), 1);
      layers.push(
        new TextLayer({
          id: 'vessel-labels-webgl',
          data: vesselCells,
          getPosition: (d: HexCellData) => [d.lng, d.lat],
          getText: (d: HexCellData) => String(d.vessels),
          getSize: (d: HexCellData) => getVesselLabelSize(d.vessels, maxVessels),
          getColor: [17, 24, 39, 128],
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontWeight: 800,
          background: false,
          outlineWidth: 2,
          outlineColor: [255, 255, 255, 255],
          sizeUnits: 'pixels',
          pickable: false,
          updateTriggers: {
            data: [gridCells, spatialSlice],
            getText: [gridCells, spatialSlice],
            getSize: [gridCells, spatialSlice],
          },
        })
      );
    }

    deckOverlayRef.current.setProps({ layers });
  }, [
    deckModules,
    gridCells,
    clusterPoints,
    showClusters,
    isChlor,
    isSST,
    overlayVessels,
    selectedCellIds,
    selectedClusterIds,
    onSelectCell,
    spatialSlice,
    activeIndicator,
  ]);

  // Fallback rendering via Leaflet Canvas (only when WebGL / Deck.gl is unavailable)
  useEffect(() => {
    if (deckModules || !L || !layerGroupRef.current) {
      return;
    }

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // Far zoom fallback: magnitude circles (radius is screen pixels, so they
    // stay readable at any zoom). Zoom only, never select.
    if (showClusters) {
      clusterPoints.forEach((point) => {
        const isSelected = (point.memberIds || [point.id]).some((m) =>
          selectedClusterIds.has(m)
        );

        let fillColor = '#94a3b8';
        if (isChlor) {
          fillColor = getChlorophyllColor(point.chlor_a);
        } else if (isSST) {
          fillColor = getSSTColor(point.sst);
        } else {
          fillColor = getVesselColor(point.vessels);
        }

        const circle = L.circleMarker([point.lat, point.lng], {
          radius: clusterRadiusPx(point.childCount || 1),
          fillColor,
          fillOpacity: 0.86,
          color: isSelected ? '#ef4444' : '#ffffff',
          weight: isSelected ? 3.5 : 2,
        });

        circle.bindTooltip(
          `
          <div style="font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.45; color: #1e293b; padding: 4px;">
            <div style="font-weight: 700; margin-bottom: 2px;">${point.childCount} hexes (click to zoom in)</div>
            ${overlayVessels ? `<div>Total Vessels: <strong>${point.vessels}</strong></div>` : ''}
            <div>Chlor_a (Avg.): <strong>${formatChlor(point.chlor_a)}</strong></div>
            <div>Sea Surface Temp (Avg.): <strong>${formatSST(point.sst)}</strong></div>
          </div>
        `,
          { sticky: true, direction: 'top', className: 'custom-hex-tooltip' }
        );

        circle.on('click', () => {
          fitMapToCoords(leafletMapRef.current, point.coords || []);
        });

        layerGroup.addLayer(circle);
      });
      return;
    }

    const maxVessels = Math.max(...gridCells.map((c) => c.vessels || 0), 1);

    gridCells.forEach((cell) => {
      if (!cell.coords) return;

      const isSelected = selectedCellIds.includes(cell.id);

      // Color mapping
      let fillColor = '#94a3b8';
      if (isChlor) {
        fillColor = getChlorophyllColor(cell.chlor_a);
      } else if (isSST) {
        fillColor = getSSTColor(cell.sst);
      } else {
        fillColor = getVesselColor(cell.vessels);
      }

      // Draw hexagon polygon
      const polygon = L.polygon(cell.coords, {
        fillColor,
        fillOpacity: 0.86,
        color: isSelected ? '#ef4444' : '#ffffff',
        weight: isSelected ? 3.5 : 1,
      });

      const tooltipContent = `
        <div style="font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.45; color: #1e293b; padding: 4px;">
          <div style="font-weight: 700; margin-bottom: 2px;">Hex: ${cell.id}</div>
          <div style="color: #64748b;">Resolution: ${NATIVE_H3_RES}</div>
          <div style="color: #64748b;">Area: 4.5 km²</div>
          ${overlayVessels ? `<div>Total Vessels: <strong>${cell.vessels}</strong></div>` : ''}
          <div>Chlor_a (Avg.): <strong>${formatChlor(cell.chlor_a)}</strong></div>
          <div>Sea Surface Temp (Avg.): <strong>${formatSST(cell.sst)}</strong></div>
        </div>
      `;

      polygon.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'top',
        className: 'custom-hex-tooltip',
      });

      polygon.on('click', () => {
        onSelectCell(cell.id);
      });

      layerGroup.addLayer(polygon);

      // Display vessel count numbers inside hexagons when enabled
      if (overlayVessels) {
        const labelSize = getVesselLabelSize(cell.vessels, maxVessels);
        const vesselLabelIcon = L.divIcon({
          className: 'vessel-label-icon',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${labelSize}px;
            color: rgba(17, 24, 39, 0.5);
            text-shadow: 0 0 2px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,0.9);
            pointer-events: none;
            user-select: none;
          ">${cell.vessels}</div>`,
          iconSize: [30, 20],
          iconAnchor: [15, 10],
        });

        const labelMarker = L.marker([cell.lat, cell.lng], {
          icon: vesselLabelIcon,
          interactive: false,
        });

        layerGroup.addLayer(labelMarker);
      }
    });
  }, [deckModules, L, gridCells, clusterPoints, showClusters, isChlor, isSST, overlayVessels, selectedCellIds, selectedClusterIds, onSelectCell]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height} width="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      className="coastal-map-root"
      sx={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#f1f5f9',
      }}
    >
      {/* Interactive Map Label */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(4px)',
          px: 1.25,
          py: 0.5,
          borderRadius: 1.5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.08)',
          pointerEvents: 'none',
        }}
      >
        <LocationSearchingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Interactive Map
        </Typography>
      </Box>

      {/* Selection count + clear-all control */}
      {selectedCellIds.length > 0 && (
        <>
          <style>{`.coastal-map-root .leaflet-top.leaflet-right { margin-top: 46px; }`}</style>
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(4px)',
              px: 1.25,
              py: 0.5,
              borderRadius: 1.5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {selectedCellIds.length} selection/s
            </Typography>
            <IconButton
              size="small"
              aria-label="Clear selections"
              onClick={onClearSelection}
              sx={{ p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </IconButton>
          </Box>
        </>
      )}

      {/* Loading overlay while map libraries or genuine cells are loading */}
      {(genuineCells === null || loading || (!L && !mapLibError)) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(248, 250, 252, 0.45)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Error state when map libraries fail to load: retry instead of gray */}
      {mapLibError && !L && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            bgcolor: 'rgba(248, 250, 252, 0.9)',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Map failed to load
          </Typography>
          <Typography variant="caption" color="text.secondary">
            The interactive map libraries could not be loaded. Check your connection and try again.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setLibAttempt((a) => a + 1)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Retry
          </Button>
        </Box>
      )}

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* WebGL Hardware-Accelerated Tooltip */}
      {hoveredCell && tooltipPos && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.min(tooltipPos.x + 12, (mapContainerRef.current?.clientWidth || 400) - 220),
            top: Math.max(
              10,
              Math.min(
                tooltipPos.y + 12,
                (mapContainerRef.current?.clientHeight || (typeof height === 'number' ? height : 420)) - 160
              )
            ),
            zIndex: 1000,
            pointerEvents: 'none',
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1.5,
            p: 1.25,
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontSize: 12,
            lineHeight: 1.45,
            color: '#1e293b',
            minWidth: 180,
          }}
        >
          <Box sx={{ fontWeight: 700, mb: 0.25 }}>
            {hoveredCell.isCluster ? `${hoveredCell.childCount} hexes` : `Hex: ${hoveredCell.id}`}
          </Box>
          {hoveredCell.isCluster ? (
            <Box sx={{ color: '#64748b' }}>Click to zoom in</Box>
          ) : (
            <>
              <Box sx={{ color: '#64748b' }}>Resolution: {NATIVE_H3_RES}</Box>
              <Box sx={{ color: '#64748b' }}>Area: 4.5 km²</Box>
            </>
          )}
          {(overlayVessels || activeIndicator === 'vessels') && (
            <Box>Total Vessels: <strong>{hoveredCell.vessels} vessels</strong></Box>
          )}
          {hasChlor && (
            <Box>Chlor_a (Avg.): <strong>{formatChlor(hoveredCell.chlor_a)}</strong></Box>
          )}
          {hasSST && (
            <Box>Sea Surface Temp (Avg.): <strong>{formatSST(hoveredCell.sst)}</strong></Box>
          )}
        </Box>
      )}
    </Box>
  );
}

const CoastalChoroplethMap = dynamic(() => Promise.resolve(CoastalChoroplethMapClient), {
  ssr: false,
  loading: () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={420} height="100%" width="100%">
      <CircularProgress />
    </Box>
  ),
});

export default CoastalChoroplethMap;
