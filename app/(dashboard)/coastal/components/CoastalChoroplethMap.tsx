'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import dynamic from 'next/dynamic';
import { fetchSpatialGrid } from '@/services/coastalService';

export interface CoastalChoroplethMapProps {
  country: string;
  locationName?: string;
  aoiIds?: string[];
  activeIndicator: string;
  overlayVessels?: boolean;
  spatialSlice?: Record<string, any>;
  selectedCellId?: string | null;
  onSelectCell: (cellId: string) => void;
  loading?: boolean;
  periodLabel?: string;
  indicators?: string[];
}

interface HexCellData {
  id: string;
  lat: number;
  lng: number;
  chlor_a: number;
  sst: number;
  vessels: number;
  coords?: [number, number][];
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

export const getChlorophyllColor = (value: number) => {
  const clamped = Math.max(0, Math.min(20, value));
  if (clamped <= 10) {
    return interpolateColor('#22c55e', '#eab308', clamped / 10);
  }
  return interpolateColor('#eab308', '#ef4444', (clamped - 10) / 10);
};

export const getSSTColor = (value: number) => {
  const clamped = Math.max(290, Math.min(310, value));
  const ratio = (clamped - 290) / 20;
  if (ratio < 0.5) {
    return interpolateColor('#fee2e2', '#f87171', ratio * 2);
  }
  return interpolateColor('#f87171', '#b91c1c', (ratio - 0.5) * 2);
};

export const getChlorophyllColorRgba = (value: number): [number, number, number, number] => {
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

export const getSSTColorRgba = (value: number): [number, number, number, number] => {
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
  return [148, 163, 184, 215];
};


// Module-level caches to avoid dynamic import delay on remounts
let cachedL: any = null;
let cachedDeckModules: {
  DeckOverlay: any;
  PolygonLayer: any;
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

// Generate polygon vertices for a regular hexagon in geographic coordinates
function getGeographicHexagon(centerLat: number, centerLng: number, radiusLat: number): [number, number][] {
  const lngFactor = 1.0 / Math.cos((centerLat * Math.PI) / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    const lat = centerLat + radiusLat * Math.sin(angleRad);
    const lng = centerLng + radiusLat * lngFactor * Math.cos(angleRad);
    coords.push([lat, lng]);
  }
  return coords;
}

// Build coastal honeycomb grid around center coordinates
function generateCoastalHexGrid(centerLat: number, centerLng: number): HexCellData[] {
  const radiusLat = 0.022; // approx 2.5km radius for H3 Resolution 7 scale
  const lngFactor = 1.0 / Math.cos((centerLat * Math.PI) / 180);
  const dx = radiusLat * Math.sqrt(3) * lngFactor;
  const dy = radiusLat * 1.5;

  // Grid layout matching the wireframe cluster (5 rows)
  const clusterLayout = [
    { row: 0, count: 7, colStart: -3 },
    { row: 1, count: 8, colStart: -3.5 },
    { row: 2, count: 7, colStart: -3 },
    { row: 3, count: 5, colStart: -2 },
    { row: 4, count: 3, colStart: -1 },
  ];

  const cells: HexCellData[] = [];
  let index = 0;

  for (const rowDef of clusterLayout) {
    const r = rowDef.row;
    for (let c = 0; c < rowDef.count; c++) {
      const colPos = rowDef.colStart + c;
      const lat = centerLat - r * dy + 0.04;
      const lng = centerLng + colPos * dx;
      const coords = getGeographicHexagon(lat, lng, radiusLat * 0.96);

      // Default baseline values before slice data arrives
      let hexId = `878db516${(index + 1).toString(16).padStart(2, '0')}ffffff`;
      let chlor_a = 0;
      let sst = 0;
      let vessels = 0;

      // Page 36 and Page 38 reference hex cell: 878db5169ffffff
      if (r === 2 && c === 2) {
        hexId = '878db5169ffffff';
        chlor_a = 19.22;
        sst = 303.1;
        vessels = 49;
      } else if (r === 2 && c === 3) {
        chlor_a = 13.8;
        sst = 302.2;
        vessels = 31;
      } else if (r === 2 && c === 5) {
        chlor_a = 14.1;
        sst = 301.8;
        vessels = 34;
      } else if (r === 3 && c === 3) {
        chlor_a = 10.5;
        sst = 300.9;
        vessels = 17;
      } else if (r === 3 && c === 1) {
        chlor_a = 8.2;
        sst = 299.7;
        vessels = 6;
      } else if (r === 1 && c === 1) {
        chlor_a = 4.1;
        sst = 298.4;
        vessels = 3;
      }

      cells.push({
        id: hexId,
        lat,
        lng,
        chlor_a: Math.max(0.5, chlor_a),
        sst,
        vessels,
        coords,
      });
      index++;
    }
  }

  return cells;
}

function CoastalChoroplethMapClient({
  country,
  locationName,
  aoiIds,
  activeIndicator,
  overlayVessels = false,
  spatialSlice,
  selectedCellId,
  onSelectCell,
  loading = false,
  indicators,
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
    TextLayer: any;
  } | null>(cachedDeckModules);
  const [genuineCells, setGenuineCells] = useState<HexCellData[] | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HexCellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

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
              chlor_a: 0,
              sst: 0,
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

    const baseGrid =
      genuineCells.length > 0
        ? genuineCells
        : generateCoastalHexGrid(centerConfig.lat, centerConfig.lng);

    if (!spatialSlice || Object.keys(spatialSlice).length === 0) {
      return baseGrid;
    }

    return baseGrid.map((cell) => {
      const sliceData = spatialSlice[cell.id];
      if (sliceData !== undefined && sliceData !== null) {
        if (typeof sliceData === 'number') {
          return {
            ...cell,
            chlor_a: isChlor ? sliceData : cell.chlor_a,
            sst: isSST ? sliceData : cell.sst,
            vessels: !isChlor && !isSST ? sliceData : cell.vessels,
          };
        }
        return {
          ...cell,
          chlor_a:
            sliceData.chlor_a !== undefined && sliceData.chlor_a !== null
              ? Number(sliceData.chlor_a)
              : cell.chlor_a,
          sst:
            sliceData.sst !== undefined && sliceData.sst !== null
              ? Number(sliceData.sst)
              : sliceData.sst_k !== undefined && sliceData.sst_k !== null
              ? Number(sliceData.sst_k)
              : cell.sst,
          vessels:
            sliceData.vessels !== undefined && sliceData.vessels !== null
              ? Number(sliceData.vessels)
              : cell.vessels,
        };
      }
      return cell;
    });
  }, [genuineCells, centerConfig, spatialSlice, isChlor, isSST]);

  // Dynamically load Leaflet and Deck.gl WebGL on client
  useEffect(() => {
    let mounted = true;
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
          TextLayer: deckGlModule.TextLayer,
        };
        if (mounted) {
          setL(cachedL);
          setDeckModules(cachedDeckModules);
        }
      })
      .catch((err) => {
        console.warn('Deck.gl WebGL load failed, falling back to Leaflet Canvas:', err);
        import('leaflet').then((leafletModule) => {
          if (mounted) {
            setL(leafletModule.default);
          }
        });
      });
    return () => {
      mounted = false;
    };
  }, []);

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
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>';
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

    // CartoDB Voyager tile layer matching wireframe cartography
    const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
    const tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${
      cartoApiKey ? `?key=${cartoApiKey}` : ''
    }`;
    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    if (deckModules) {
      try {
        const overlay = new deckModules.DeckOverlay({
          layers: [],
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

    // Immediately fit to genuineCells if already resolved, or stored fittedBounds
    if (genuineCells && genuineCells.length > 0) {
      const bounds = fitMapToCells(map, genuineCells);
      if (bounds) {
        fittedBoundsRef.current = bounds;
      }
    } else if (fittedBoundsRef.current) {
      map.fitBounds(fittedBoundsRef.current, { padding: [24, 24], maxZoom: 12, animate: false });
    }

    return () => {
      if (deckOverlayRef.current) {
        try {
          deckOverlayRef.current.remove();
        } catch {
          // Ignore unmount error
        }
        deckOverlayRef.current = null;
      }
      if (leafletMapRef.current) {
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

  // WebGL hardware-accelerated rendering via Deck.gl
  useEffect(() => {
    if (!deckOverlayRef.current || !deckModules) {
      return;
    }

    // Clear fallback Leaflet layers if Deck.gl is active
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    }

    const { PolygonLayer, TextLayer } = deckModules;

    const layers: any[] = [
      new PolygonLayer({
        id: 'h3-hexagons-webgl',
        data: gridCells,
        getPolygon: (d: HexCellData) =>
          d.coords ? d.coords.map(([lat, lng]) => [lng, lat]) : [],
        getFillColor: (d: HexCellData) => getCellColorRgba(d, isChlor, isSST),
        getLineColor: (d: HexCellData) =>
          d.id === selectedCellId ? [239, 68, 68, 255] : [255, 255, 255, 200],
        getLineWidth: (d: HexCellData) => (d.id === selectedCellId ? 3.5 : 1),
        lineWidthUnits: 'pixels',
        filled: true,
        stroked: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 90],
        onClick: (info: any) => {
          if (info.object && onSelectCell) {
            onSelectCell(info.object.id);
          }
        },
        onHover: (info: any) => {
          if (info.object) {
            setHoveredCell(info.object);
            setTooltipPos({ x: info.x, y: info.y });
          } else {
            setHoveredCell(null);
            setTooltipPos(null);
          }
        },
        updateTriggers: {
          getFillColor: [isChlor, isSST, activeIndicator, spatialSlice],
          getLineColor: [selectedCellId],
          getLineWidth: [selectedCellId],
        },
      }),
    ];

    if (overlayVessels) {
      const vesselCells = gridCells.filter((c) => c.vessels !== undefined && c.vessels > 0);
      layers.push(
        new TextLayer({
          id: 'vessel-labels-webgl',
          data: vesselCells,
          getPosition: (d: HexCellData) => [d.lng, d.lat],
          getText: (d: HexCellData) => String(d.vessels),
          getSize: 13,
          getColor: [17, 24, 39, 255],
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
          },
        })
      );
    }

    deckOverlayRef.current.setProps({ layers });
  }, [
    deckModules,
    gridCells,
    isChlor,
    isSST,
    overlayVessels,
    selectedCellId,
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

    gridCells.forEach((cell) => {
      if (!cell.coords) return;

      const isSelected = selectedCellId === cell.id;

      // Color mapping
      let fillColor = '#94a3b8';
      if (isChlor) {
        fillColor = getChlorophyllColor(cell.chlor_a);
      } else if (isSST) {
        fillColor = getSSTColor(cell.sst);
      }

      // Draw hexagon polygon
      const polygon = L.polygon(cell.coords, {
        fillColor,
        fillOpacity: 0.86,
        color: isSelected ? '#ef4444' : '#ffffff',
        weight: isSelected ? 3.5 : 1,
      });

      const tooltipContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.45; color: #1e293b; padding: 4px;">
          <div style="font-weight: 700; margin-bottom: 2px;">Hex: ${cell.id}</div>
          <div style="color: #64748b;">Resolution: 7</div>
          <div style="color: #64748b;">Area: 4.5 km²</div>
          ${overlayVessels ? `<div>Total Vessels: <strong>${cell.vessels}</strong></div>` : ''}
          <div>Chlor_a (Avg.): <strong>${cell.chlor_a.toFixed(2)} mg/m³</strong></div>
          <div>Sea Surface Temp (Avg.): <strong>${cell.sst.toFixed(1)} K</strong></div>
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
        const vesselLabelIcon = L.divIcon({
          className: 'vessel-label-icon',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            color: #111827;
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
  }, [deckModules, L, gridCells, isChlor, isSST, overlayVessels, selectedCellId, onSelectCell]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={420} width="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 420,
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

      {/* Loading overlay while genuine cells are loading */}
      {(genuineCells === null || loading) && (
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

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* WebGL Hardware-Accelerated Tooltip */}
      {hoveredCell && tooltipPos && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.min(tooltipPos.x + 12, (mapContainerRef.current?.clientWidth || 400) - 220),
            top: Math.max(10, Math.min(tooltipPos.y + 12, (mapContainerRef.current?.clientHeight || 420) - 160)),
            zIndex: 1000,
            pointerEvents: 'none',
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1.5,
            p: 1.25,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 12,
            lineHeight: 1.45,
            color: '#1e293b',
            minWidth: 180,
          }}
        >
          <Box sx={{ fontWeight: 700, mb: 0.25 }}>Hex: {hoveredCell.id}</Box>
          <Box sx={{ color: '#64748b' }}>Resolution: 7</Box>
          <Box sx={{ color: '#64748b' }}>Area: 4.5 km²</Box>
          {overlayVessels && (
            <Box>Total Vessels: <strong>{hoveredCell.vessels}</strong></Box>
          )}
          {hasChlor && (
            <Box>Chlor_a (Avg.): <strong>{hoveredCell.chlor_a.toFixed(2)} mg/m³</strong></Box>
          )}
          {hasSST && (
            <Box>Sea Surface Temp (Avg.): <strong>{hoveredCell.sst.toFixed(1)} K</strong></Box>
          )}
        </Box>
      )}
    </Box>
  );
}

const CoastalChoroplethMap = dynamic(() => Promise.resolve(CoastalChoroplethMapClient), {
  ssr: false,
  loading: () => (
    <Box display="flex" justifyContent="center" alignItems="center" height={420} width="100%">
      <CircularProgress />
    </Box>
  ),
});

export default CoastalChoroplethMap;
