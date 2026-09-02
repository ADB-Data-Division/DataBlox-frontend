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
  return interpolateColor('#a855f7', '#ef4444', (clamped - 290) / 20);
};

// Location centers
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  bali: { lat: -8.52, lng: 115.22, zoom: 11 },
  denpasar: { lat: -8.68, lng: 115.23, zoom: 11 },
  idn: { lat: -8.52, lng: 115.22, zoom: 10 },
  laguna: { lat: 14.35, lng: 121.25, zoom: 11 },
  pangasinan: { lat: 16.03, lng: 120.33, zoom: 11 },
  phl: { lat: 15.95, lng: 120.35, zoom: 10 },
  bangkok: { lat: 13.48, lng: 100.58, zoom: 11 },
  'chon buri': { lat: 13.1, lng: 100.85, zoom: 11 },
  chonburi: { lat: 13.1, lng: 100.85, zoom: 11 },
  tha: { lat: 13.45, lng: 100.6, zoom: 10 },
  chittagong: { lat: 22.28, lng: 91.80, zoom: 11 },
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

      // Default baseline values matching wireframe sample
      let hexId = `878db516${(index + 1).toString(16).padStart(2, '0')}ffffff`;
      let chlor_a = 2.0 + Math.sin(index * 1.3) * 1.8;
      let sst = 296.5 + (index % 5) * 1.8;
      let vessels = Math.floor(1 + (index % 7) * 2);

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
}: CoastalChoroplethMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);
  const [genuineCells, setGenuineCells] = useState<HexCellData[] | null>(null);

  // Determine indicator type
  const isChlor = useMemo(() => {
    const key = (activeIndicator || '').toLowerCase();
    return key.includes('chlor') || key === 'chlor_a';
  }, [activeIndicator]);

  const isSST = useMemo(() => {
    const key = (activeIndicator || '').toLowerCase();
    return key.includes('sst') || key.includes('temp') || key.includes('surface');
  }, [activeIndicator]);

  const centerConfig = useMemo(() => {
    return resolveCenter(locationName, country);
  }, [locationName, country]);

  const aoiKey = useMemo(() => (aoiIds ? aoiIds.slice().sort().join(',') : ''), [aoiIds]);

  // Fetch and load genuine polygons for the country and filter by aoiIds
  useEffect(() => {
    let isCurrent = true;

    let targetAois = aoiIds && aoiIds.length > 0 ? aoiIds : undefined;
    if (!targetAois && locationName) {
      const locLower = locationName.toLowerCase();
      for (const [key, aois] of Object.entries(KNOWN_LOCATION_AOIS)) {
        if (locLower.includes(key)) {
          targetAois = aois;
          break;
        }
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
            const baselineChlor = 2.0 + Math.sin(idx * 1.3) * 1.8;
            const baselineSST = 296.5 + (idx % 5) * 1.8;
            const baselineVessels = Math.floor(1 + (idx % 7) * 2);

            return {
              id: hexId,
              lat,
              lng,
              chlor_a: Math.max(0.5, baselineChlor),
              sst: baselineSST,
              vessels: baselineVessels,
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
    const baseGrid =
      genuineCells && genuineCells.length > 0
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

  // Dynamically load Leaflet and stylesheet on client
  useEffect(() => {
    let mounted = true;
    Promise.all([
      import('leaflet'),
      typeof window !== 'undefined' ? import('leaflet/dist/leaflet.css') : Promise.resolve(),
    ]).then(([leafletModule]) => {
      if (mounted) {
        setL(leafletModule.default);
      }
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
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Voyager tile layer matching wireframe cartography
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [L, centerConfig]);

  // Update bounds or fallback center when genuine cells or location change
  useEffect(() => {
    if (!leafletMapRef.current) {
      return;
    }

    const map = leafletMapRef.current;

    if (genuineCells && genuineCells.length > 0) {
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;

      for (const cell of genuineCells) {
        if (cell.coords) {
          for (const [lat, lng] of cell.coords) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          }
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
          animate: true,
        });
        return;
      }
    }

    // Graceful fallback to center coordinates if loading or no AOIs match
    map.setView([centerConfig.lat, centerConfig.lng], centerConfig.zoom, {
      animate: true,
    });
  }, [genuineCells, centerConfig]);

  // Redraw hexagons and vessel labels when data or indicators change
  useEffect(() => {
    if (!L || !layerGroupRef.current) {
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

      // Tooltip matching wireframe pages 34, 36, and 41
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
  }, [L, gridCells, isChlor, isSST, overlayVessels, selectedCellId, onSelectCell]);

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

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
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
