'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress, useTheme, Tooltip } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import { MapPin } from '@phosphor-icons/react/dist/ssr';
import dynamic from 'next/dynamic';
import { dataService } from '@/app/services/data-loader/data-loader-service';
import { GeoJSONLevel } from '@/app/services/data-loader/data-loader-interface';
import { Feature, GeoJsonObject } from 'geojson';
import { GEOJsonProperty } from '@/models/geojson';
import { Language, LanguageOutlined } from '@mui/icons-material';
import theme from '@/style/theme/theme';

// Define the props interface
interface ThailandMapProps {
  provinceData?: ProvinceData[];
  height?: string | number;
  width?: string | number;
  title?: string;
  onProvinceClick?: (province: ProvinceData) => void;
  adminLevel?: GeoJSONLevel;
}

// Define the province data interface
export interface ProvinceData {
  name: string;
  visitors: number;
  lat: number;
  lng: number;
  trend?: number;
  color?: string;
}

// Sample data for Thailand provinces
const sampleProvinceData: ProvinceData[] = [
  { name: 'Bangkok', visitors: 12567890, lat: 13.7563, lng: 100.5018, trend: 12.3, color: '#1976d2' },
  { name: 'Phuket', visitors: 5678901, lat: 7.9519, lng: 98.3381, trend: 32.7, color: '#2e7d32' },
  { name: 'Chiang Mai', visitors: 3456789, lat: 18.7883, lng: 98.9853, trend: 15.8, color: '#ed6c02' },
  { name: 'Pattaya (Chonburi)', visitors: 4123456, lat: 12.9236, lng: 100.8824, trend: 22.4, color: '#9c27b0' },
  { name: 'Krabi', visitors: 2345678, lat: 8.0862, lng: 98.9062, trend: 28.9, color: '#d32f2f' },
  { name: 'Koh Samui', visitors: 1987654, lat: 9.5120, lng: 100.0136, trend: 19.2, color: '#0288d1' },
  { name: 'Ayutthaya', visitors: 1456789, lat: 14.3691, lng: 100.5876, trend: 8.7, color: '#f44336' },
  { name: 'Hua Hin', visitors: 1234567, lat: 12.5684, lng: 99.9576, trend: 14.5, color: '#673ab7' },
];

// Create a client-side only component for the map
const ThailandMapClient: React.FC<ThailandMapProps> = ({
  provinceData = sampleProvinceData,
  height = '100%',
  width = '100%',
  title = 'Thailand Visitor Distribution',
  onProvinceClick,
  adminLevel = GeoJSONLevel.PROVINCE,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);
  const theme = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipProvinceInfo, setTooltipProvinceInfo] = useState<ProvinceData | undefined>(undefined);
  const [languageMode, setLanguageMode] = useState<'th' | 'en'>('en');

  // Format large numbers with commas
  const formatNumber = useCallback((num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }, []);

  // Calculate marker size based on visitor count
  const getMarkerSize = useCallback((visitors: number) => {
    const min = 30; // Minimum marker size
    const max = 80; // Maximum marker size
    
    // Find min and max visitor counts
    const minVisitors = Math.min(...provinceData.map(p => p.visitors));
    const maxVisitors = Math.max(...provinceData.map(p => p.visitors));
    
    // Calculate size proportionally
    const size = min + ((visitors - minVisitors) / (maxVisitors - minVisitors)) * (max - min);
    return Math.round(size);
  }, [provinceData]);

  // Dynamically import Leaflet on the client side
  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet.default);
    });
  }, []);

  // Fetch GeoJSON data using the data service
  useEffect(() => {
    const fetchGeoJsonData = async () => {
      try {
        const result = await dataService.getGeoJSON(adminLevel);
        setBoundaryData(result.data);
      } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
      }
    };

    fetchGeoJsonData();
  }, [adminLevel]);

  // Initialize the map
  useEffect(() => {
    console.log("Map initialization check:", { L, mapRef: mapRef.current, leafletMapRef: leafletMapRef.current });
    setLoading(true);
    if (!L || leafletMapRef.current || !mapRef.current) {
      console.log("Skipping map initialization because:", {
        noLeaflet: !L,
        mapAlreadyInitialized: !!leafletMapRef.current,
        noMapRef: !mapRef.current
      });
      return;
    }
    
    console.log("Initializing map...");
    
    
    // Define Thailand's approximate bounds
    const thailandBounds = L.latLngBounds(
      L.latLng(5.6, 97.3),  // Southwest corner (latitude, longitude)
      L.latLng(20.5, 105.6) // Northeast corner (latitude, longitude)
    );
    
    // Create map centered on Thailand with restricted bounds
    const map = L.map(mapRef.current, {
      // 13.6788232,99.9785312,465243m
      center: [13.6788232,99.9785312], // Center of Thailand
      zoom: 8,
      minZoom: 8, // Prevent zooming out too far
      maxZoom: 12, // Prevent zooming in too far
      maxBounds: thailandBounds, // Restrict panning to these bounds
      maxBoundsViscosity: 1.0 // Makes the bounds completely solid (prevents dragging outside)
    });
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 12,
      bounds: thailandBounds // Also restrict the tile loading to Thailand bounds
    }).addTo(map);
    
    // More detailed zoom tracking
    map.on('zoomstart', () => {
      console.log(`Zoom change started from level: ${map.getZoom()}`);
    });

    map.on('zoom', () => {
      console.log(`Zooming... Current level: ${map.getZoom()}`);
    });

    map.on('zoomend', () => {
      console.log(`Zoom change completed. New level: ${map.getZoom()}`);
      console.log(`Current map bounds: ${JSON.stringify(map.getBounds())}`);
      console.log(`Current map center: ${JSON.stringify(map.getCenter())}`);
    });
    
    // Store map reference
    leafletMapRef.current = map;
    setMapReady(true);
    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        // Remove the event listener
        leafletMapRef.current.off('zoomend');
        leafletMapRef.current.off('zoomstart');
        leafletMapRef.current.off('zoom');
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [L]);

  // Add GeoJSON layer when data is loaded and map is ready
  useEffect(() => {
    if (!L || !leafletMapRef.current || !mapReady || !boundaryData) return;
    
    const map = leafletMapRef.current;
    
    // Remove existing GeoJSON layer if it exists
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    
    // Create and add the GeoJSON layer
    const geoJsonLayer = L.geoJSON(boundaryData, {
      style: (feature: Feature<any, GEOJsonProperty>) => {
        // Find matching province data to get color and style based on visitor count
        const provinceName = feature?.properties?.ADM1_EN || '';
        const provinceInfo = provinceData.find(p => 
          p.name.toLowerCase() === provinceName.toLowerCase()
        );
        
        if (!provinceInfo) {
          return {
            fillColor: '#aaaaaa',
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.2,
          };
        }
        
        // Calculate fill opacity based on visitor count (higher count = more opaque)
        const minVisitors = Math.min(...provinceData.map(p => p.visitors));
        const maxVisitors = Math.max(...provinceData.map(p => p.visitors));
        const normalizedValue = (provinceInfo.visitors - minVisitors) / (maxVisitors - minVisitors);
        const fillOpacity = 0.2 + (normalizedValue * 0.6); // Range from 0.2 to 0.8
        
        return {
          fillColor: provinceInfo.color || theme.palette.primary.main,
          weight: 2,
          opacity: 1,
          color: 'white',
          fillOpacity: fillOpacity
        };
      },
      onEachFeature: (feature: Feature<any, GEOJsonProperty>, layer: any) => {
        const provinceLabel = languageMode === 'th' ? feature?.properties?.ADM1_TH || '' : feature?.properties?.ADM1_EN || 'Unknown';
        const provinceName = feature?.properties?.ADM1_EN || '';
        const provinceInfo = provinceData.find(p => 
          p.name.toLowerCase() === provinceName.toLowerCase()
        );
        
        // Add hover events for tooltip
        layer.on({
          mouseover: (e: any) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              fillOpacity: 0.9
            });
            l.bringToFront();
            
            // Update tooltip state
            setTooltipContent(provinceLabel);
            setTooltipVisible(true);
            if (provinceInfo) {
              setTooltipProvinceInfo(provinceInfo);
            } else {
              setTooltipProvinceInfo(undefined);
            }
          },
          mouseout: (e: any) => {
            const l = e.target;
            geoJsonLayer.resetStyle(l);
            
            // Hide tooltip
            setTooltipVisible(false);
          },
          mousemove: (e: any) => {
            // Update tooltip position based on mouse coordinates
            setTooltipPosition({
              x: e.originalEvent.pageX,
              y: e.originalEvent.pageY
            });
          },
          click: (e: any) => {
            if (onProvinceClick && provinceInfo) {
              onProvinceClick(provinceInfo);
            }
          }
        });
      }
    }).addTo(map);
    
    // Fit the map to the bounds of the GeoJSON data
    if (geoJsonLayer.getBounds().isValid()) {
      map.fitBounds(geoJsonLayer.getBounds(), {
        padding: [20, 20] // Add some padding around the bounds
      });
    }
    
    // Store reference to GeoJSON layer
    geoJsonLayerRef.current = geoJsonLayer;

    setLoading(false);
    
  }, [boundaryData, mapReady, provinceData, onProvinceClick, formatNumber, theme, L, languageMode]);

  return (
    <Box sx={{ 
      width, 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: 1,
      bgcolor: 'background.paper',
      position: 'relative', // Important for tooltip positioning
    }}>
      <Box className='leaflet-header' sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Tooltip title="Toggle Language">
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <LanguageOutlined sx={{ cursor: 'pointer' }} onClick={() => {
            if (languageMode === 'th') {
              setLanguageMode('en');
            } else {
              setLanguageMode('th');
            }
          }} />
          <Typography variant="subtitle2" color="text.secondary"> {languageMode === 'th' ? 'TH' : 'EN'} </Typography>
          </Box>
        </Tooltip>
      </Box>
      
      <Box className='leaflet-map' sx={{ position: 'relative', height, width: '100%' }}>
        {(loading || !L) && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
          }}>
            <CircularProgress />
          </Box>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </Box>
      
      <Box className='leaflet-footer' sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Province color intensity represents visitor volume. Darker regions indicate higher visitor numbers.
        </Typography>
      </Box>
      
      {/* Add the tooltip */}
      <MapTooltip
        visible={tooltipVisible}
        content={tooltipContent}
        position={tooltipPosition}
        provinceInfo={tooltipProvinceInfo}
      />
    </Box>
  );
};

// Use dynamic import with ssr: false for the map component
const ThailandMap = dynamic(() => Promise.resolve(ThailandMapClient), {
  ssr: false,
  loading: () => {
    console.log("Loading ThailandMapClient component...");
    return (
      <Box sx={{ 
        width: '100%', 
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
      }}>
        <CircularProgress />
        <Typography ml={2}>Loading map...</Typography>
      </Box>
    );
  },
});

// Enhanced tooltip with more information
const MapTooltip: React.FC<{
  visible: boolean;
  content: string;
  position: { x: number; y: number };
  provinceInfo?: ProvinceData;
}> = ({ visible, content, position, provinceInfo }) => {
  if (!visible) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate(${position.x + 10}px, ${position.y + 10}px)`,
        zIndex: 1000,
        pointerEvents: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        borderRadius: 1,
        padding: 1.5,
        minWidth: 150,
        maxWidth: 250,
        border: '1px solid',
        borderColor: provinceInfo?.color || 'primary.main',
      }}
    >
      <Typography variant="subtitle2" fontWeight="bold" color={provinceInfo?.color || 'primary.main'}>
        {content}
      </Typography>
      
      {provinceInfo && (
        <>
          <Typography variant="body2" sx={{ mt: 0.5, color: theme.palette.primary.light }}>
            Visitors: {provinceInfo.visitors.toLocaleString()}
          </Typography>
          
          {provinceInfo.trend !== undefined && (
            <Typography 
              variant="body2" 
              color={provinceInfo.trend > 0 ? 'success.main' : 'error.main'}
            >
              Trend: {provinceInfo.trend > 0 ? '+' : ''}{provinceInfo.trend}%
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default ThailandMap;