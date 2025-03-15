'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from '@phosphor-icons/react/dist/ssr';

// Define the props interface
interface ThailandMapProps {
  provinceData?: ProvinceData[];
  height?: string | number;
  width?: string | number;
  title?: string;
  loading?: boolean;
  onProvinceClick?: (province: ProvinceData) => void;
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

const ThailandMap: React.FC<ThailandMapProps> = ({
  provinceData = sampleProvinceData,
  height = 500,
  width = '100%',
  title = 'Thailand Visitor Distribution',
  loading = false,
  onProvinceClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const theme = useTheme();
  const [mapReady, setMapReady] = useState(false);

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Calculate marker size based on visitor count
  const getMarkerSize = (visitors: number) => {
    const min = 30; // Minimum marker size
    const max = 80; // Maximum marker size
    
    // Find min and max visitor counts
    const minVisitors = Math.min(...provinceData.map(p => p.visitors));
    const maxVisitors = Math.max(...provinceData.map(p => p.visitors));
    
    // Calculate size proportionally
    const size = min + ((visitors - minVisitors) / (maxVisitors - minVisitors)) * (max - min);
    return Math.round(size);
  };

  // Initialize the map
  useEffect(() => {
    // Skip if map is already initialized or ref is not available
    if (leafletMapRef.current || !mapRef.current) return;
    
    // Fix Leaflet icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });

    // Create map centered on Thailand
    const map = L.map(mapRef.current).setView([15.8700, 100.9925], 6);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
    
    // Store map reference
    leafletMapRef.current = map;
    setMapReady(true);
    
    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Add markers when map is ready and data is available
  useEffect(() => {
    if (!leafletMapRef.current || !mapReady || loading) return;
    
    const map = leafletMapRef.current;
    
    // Clear existing markers
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });
    
    // Add markers for each province
    provinceData.forEach((province) => {
      const size = getMarkerSize(province.visitors);
      const color = province.color || theme.palette.primary.main;
      
      // Create circle marker
      const circle = L.circle([province.lat, province.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.5,
        radius: size * 500, // Scale for map visibility
      }).addTo(map);
      
      // Create popup content
      const popupContent = `
        <div style="text-align: center; padding: 10px;">
          <h3 style="margin: 0 0 8px 0;">${province.name}</h3>
          <p style="margin: 0 0 5px 0;"><strong>Visitors:</strong> ${formatNumber(province.visitors)}</p>
          ${province.trend ? 
            `<p style="margin: 0; color: ${province.trend > 0 ? 'green' : 'red'};">
              <strong>Trend:</strong> ${province.trend > 0 ? '+' : ''}${province.trend}%
            </p>` : ''}
        </div>
      `;
      
      // Add popup to marker
      circle.bindPopup(popupContent);
      
      // Add click handler
      if (onProvinceClick) {
        circle.on('click', () => onProvinceClick(province));
      }
    });
    
  }, [provinceData, mapReady, loading, theme, onProvinceClick, getMarkerSize]);

  return (
    <Box sx={{ 
      width, 
      height: 'auto',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: 1,
      bgcolor: 'background.paper',
    }}>
      <Box sx={{ 
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
        <MapPin size={24} weight="fill" color={theme.palette.primary.main} />
      </Box>
      
      <Box sx={{ position: 'relative', height, width: '100%' }}>
        {loading && (
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
      
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Circle size represents visitor volume. Click on a province for details.
        </Typography>
      </Box>
    </Box>
  );
};

export default ThailandMap;