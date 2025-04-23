'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress, useTheme, Tooltip } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { dataService } from '@/app/services/data-loader/data-loader-service';
import { GeoJSONLevel, ProvinceFilter } from '@/app/services/data-loader/data-loader-interface';
import { Feature } from 'geojson';
import { GEOJsonProperty } from '@/models/geojson';
import { LanguageOutlined } from '@mui/icons-material';
import VisualizationContainer from '../visualization-container/visualization-container';
import { normalizeAsKey } from '@/models/normalize';
import { useAppSelector } from '@/app/store/hooks';
import { stringToColor, getSafeTextColor } from '@/src/utils/colors';

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


// Format large numbers with commas
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Create a client-side only component for the map
const ThailandMapClient: React.FC<ThailandMapProps> = ({
  provinceData = sampleProvinceData,
  height = '100%',
  width = '100%',
  title = 'Thailand',
  onProvinceClick,
  adminLevel = GeoJSONLevel.PROVINCE,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);
  const boundsSetRef = useRef<boolean>(false);
  const theme = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalFeatures, setTotalFeatures] = useState(0);
  const [loadedFeatures, setLoadedFeatures] = useState(0);
  const [L, setL] = useState<any>(null);
  const [languageMode, setLanguageMode] = useState<'th' | 'en'>('en');
  const filters = useAppSelector(state => state.dataset.filters);
  const selectedProvinces = ((filters.find(f => f.type === 'province') as ProvinceFilter)?.province_ids ?? []).map(p => normalizeAsKey(p));

  // Use refs for tooltip data to prevent re-renders
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipDataRef = useRef({
    visible: false,
    content: '',
    position: { x: 0, y: 0 },
    provinceInfo: undefined as ProvinceData | undefined,
    mapColor: undefined as string | undefined
  });

  // Function to update tooltip without causing re-renders
  const updateTooltip = useCallback(() => {
    if (!tooltipRef.current) return;
    
    const tooltip = tooltipRef.current;
    const data = tooltipDataRef.current;
    
    if (data.visible) {
      tooltip.style.display = 'block';
      tooltip.style.transform = `translate(${data.position.x + 10}px, ${data.position.y + 10}px)`;
      
      // Use the map feature color for the tooltip if it exists
      const featureColor = data.mapColor || data.provinceInfo?.color || theme.palette.primary.main;
      
      // Update border color to match the feature
      tooltip.style.borderColor = featureColor;
      
      // Ensure text is readable by darkening light colors
      const titleColor = getSafeTextColor(featureColor);
      const textColor = getSafeTextColor(featureColor);
      
      let tooltipContent = `
        <div style="font-weight: bold; color: ${titleColor}; font-size: 16px; text-shadow: 0 0 1px rgba(0,0,0,0.1);">
          ${data.content}
        </div>
      `;
      
      if (data.provinceInfo) {
        tooltipContent += `
          <div style="margin-top: 8px; color: ${textColor}; font-size: 14px; text-shadow: 0 0 1px rgba(0,0,0,0.1);">
            Visitors: ${data.provinceInfo.visitors.toLocaleString()}
          </div>
        `;
        
        if (data.provinceInfo.trend !== undefined) {
          const trendColor = data.provinceInfo.trend > 0 ? 
            theme.palette.success.main : theme.palette.error.main;
          
          tooltipContent += `
            <div style="color: ${trendColor}; font-size: 14px; text-shadow: 0 0 1px rgba(0,0,0,0.1);">
              Trend: ${data.provinceInfo.trend > 0 ? '+' : ''}${data.provinceInfo.trend}%
            </div>
          `;
        }
      }
      
      tooltip.innerHTML = tooltipContent;
    } else {
      tooltip.style.display = 'none';
    }
  }, [theme.palette.primary.main, theme.palette.success.main, theme.palette.error.main]);

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
    // Reset the bounds flag when admin level changes
    boundsSetRef.current = false;
    
    const fetchGeoJsonData = async () => {
      try {
        // Use streaming version instead of blocking version
        const streamResult = await dataService.getGeoJSONStream(adminLevel);
        
        // Create a feature collection to build incrementally
        const initialFeatureCollection = {
          type: 'FeatureCollection',
          features: []
        };
        
        // Set initial empty feature collection
        setBoundaryData(initialFeatureCollection);
        
        // Set loading state
        setLoading(true);
        setLoadingProgress(0);
        setLoadedFeatures(0);
        
        // Estimate total features (this is approximate as we're streaming)
        // For Thailand provinces, we know there are about 77 provinces
        setTotalFeatures(adminLevel === GeoJSONLevel.PROVINCE ? 77 : 100);
        
        // Process features as they arrive
        let count = 0;
        let allFeatures: Feature[] = []; // Track all features to avoid state update issues
        const batchSize = adminLevel === GeoJSONLevel.PROVINCE ? 5 : 10;
        
        for await (const feature of streamResult.stream) {
          count++;
          allFeatures.push(feature as Feature); // Add to complete collection
          
          // Update progress
          setLoadedFeatures(count);
          setLoadingProgress(Math.min(99, (count / (adminLevel === GeoJSONLevel.PROVINCE ? 77 : 100)) * 100));
          
          // Update boundary data every batch of features - use the complete collection
          if (count % batchSize === 0) {
            console.log(`Updating boundaryData with ${allFeatures.length} features so far`);
            setBoundaryData({
              type: 'FeatureCollection',
              features: [...allFeatures] // Use complete array instead of batches
            });
          }
        }
        
        // Final update with all features to ensure nothing is missed
        console.log(`Final update - total features: ${allFeatures.length}`);
        setBoundaryData({
          type: 'FeatureCollection',
          features: allFeatures
        });
        
        // Done loading
        setLoadingProgress(100);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
        setLoading(false);
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

    // Define Thailand's approximate bounds
    const biggerBounds = L.latLngBounds(
      L.latLng(-10, 70),     // Southwest corner: includes parts of Indonesia
      L.latLng(30, 140)    // Northeast corner: includes parts of China and Japan
    );

    const darrenPreferredZoom = 8;
    const macPreferredZoom = 5;
    
    // Create map centered on Thailand with restricted bounds
    const map = L.map(mapRef.current, {
      // 13.6788232,99.9785312,465243m
      center: [13.6788232,99.9785312], // Center of Thailand
      zoom: macPreferredZoom,
      minZoom: macPreferredZoom, // Prevent zooming out too far
      maxZoom: 12, // Prevent zooming in too far
      maxBounds: biggerBounds, // Restrict panning to these bounds
      maxBoundsViscosity: 1.0 // Makes the bounds completely solid (prevents dragging outside)
    });
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 12,
      bounds: biggerBounds // Also restrict the tile loading to Thailand bounds
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
    console.log(`Rendering map with selected provinces (${selectedProvinces.length}): ${selectedProvinces.join(', ')}`);
    console.log(`Total features in boundaryData: ${boundaryData?.features?.length || 0}`);
    
    if (!L || !leafletMapRef.current || !mapReady || !boundaryData) return;
    
    console.log(`Creating GeoJSON layer with ${boundaryData.features.length} features`);
    // Log the first few features to inspect their structure
    if (boundaryData.features.length > 0) {
      console.log('Sample feature structure:', JSON.stringify(boundaryData.features[0], null, 2).substring(0, 500) + '...');
    }

    const map = leafletMapRef.current;
    console.log("Rendering map with selected provinces", selectedProvinces);
    console.log(`Total features in boundaryData: ${boundaryData?.features?.length || 0}`);
    
    // If we already have a GeoJSON layer and are just updating features
    if (geoJsonLayerRef.current) {
      // Clear the current features
      geoJsonLayerRef.current.clearLayers();
      
      // Add the updated features to the existing layer
      geoJsonLayerRef.current.addData(boundaryData);
      
      // Log the number of features in the layer after update
      console.log(`Features in layer after update: ${Object.keys(geoJsonLayerRef.current._layers).length}`);
      
      // Fit bounds only the first time we have complete data
      if (geoJsonLayerRef.current.getBounds().isValid() && !boundsSetRef.current) {
        map.fitBounds(geoJsonLayerRef.current.getBounds(), {
          padding: [20, 20],
          animate: false // Disable animation to reduce jerkiness
        });
        boundsSetRef.current = true;
      }
      
      // Check if features are properly formatted for GeoJSON
      const validFeatures = boundaryData.features.filter((feature: any) => 
        feature && feature.geometry && feature.properties
      );
      console.log(`Valid GeoJSON features: ${validFeatures.length} out of ${boundaryData.features.length}`);
      
      return;
    }
    
    // First time setup - create the GeoJSON layer
    const geoJsonLayer = L.geoJSON(boundaryData, {
      style: (feature: Feature<any, GEOJsonProperty>) => {
        // Find matching province data to get color and style based on visitor count
        const featureProvinceName = feature?.properties?.ADM1_EN || '';
        const featureProvinceNormalizedName = normalizeAsKey(featureProvinceName);
        
        // Log province names for debugging
        // console.log(`Processing province: ${featureProvinceName}, normalized: ${featureProvinceNormalizedName}, selected: ${selectedProvinces.includes(featureProvinceNormalizedName)}`);
        
        // Set different styles for selected vs non-selected provinces
        const isSelected = selectedProvinces.includes(featureProvinceNormalizedName);
        const fillOpacity = isSelected ? 0.8 : 0.5;
        
        // Always use a color - for selected use the province color, for non-selected use a light gray
        const featureColor = isSelected 
          ? stringToColor(featureProvinceNormalizedName)
          : '#aaaaaa';
        
        return {
          fillColor: featureColor,
          weight: isSelected ? 2 : 1,
          opacity: 1,
          color: 'white',
          fillOpacity: fillOpacity
        };
      },
      onEachFeature: (feature: Feature<any, GEOJsonProperty>, layer: any) => {
        const provinceLabel = languageMode === 'th' ? feature?.properties?.ADM1_TH || '' : feature?.properties?.ADM1_EN || 'Unknown';
        const provinceName = feature?.properties?.ADM1_EN || '';
        
        // Find province info and pre-calculate map color
        const provinceInfo = provinceData.find(p => 
          p.name.toLowerCase() === provinceName.toLowerCase()
        );
        
        // Get the map feature color
        const featureProvinceNormalizedName = normalizeAsKey(provinceName);
        const isSelected = selectedProvinces.includes(featureProvinceNormalizedName);
        const mapColor = isSelected ? stringToColor(featureProvinceNormalizedName) : '#aaaaaa';
        
        // Add hover events for tooltip
        layer.on({
          mouseover: (e: any) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              fillOpacity: 0.9
            });
            l.bringToFront();
            
            // Update tooltip data in ref instead of state
            tooltipDataRef.current.content = provinceLabel;
            tooltipDataRef.current.visible = true;
            tooltipDataRef.current.mapColor = mapColor;
            
            if (provinceInfo) {
              tooltipDataRef.current.provinceInfo = provinceInfo;
            } else {
              tooltipDataRef.current.provinceInfo = undefined;
            }
            
            // Update tooltip directly
            updateTooltip();
          },
          mouseout: (e: any) => {
            const l = e.target;
            geoJsonLayer.resetStyle(l);
            
            // Hide tooltip using ref
            tooltipDataRef.current.visible = false;
            updateTooltip();
          },
          mousemove: (e: any) => {
            // Update tooltip position in ref
            tooltipDataRef.current.position = {
              x: e.originalEvent.pageX,
              y: e.originalEvent.pageY
            };
            updateTooltip();
          },
          click: (e: any) => {
            if (onProvinceClick) {
              const provinceInfo = provinceData.find(p => 
                p.name.toLowerCase() === provinceName.toLowerCase()
              );
              if (provinceInfo) {
                onProvinceClick(provinceInfo);
              }
            }
          }
        });
      }
    }).addTo(map);
    
    // Fit the map to the bounds of the GeoJSON data
    if (geoJsonLayer.getBounds().isValid() && !boundsSetRef.current) {
      map.fitBounds(geoJsonLayer.getBounds(), {
        padding: [20, 20], // Add some padding around the bounds
        animate: false // Disable animation to reduce jerkiness
      });
      boundsSetRef.current = true; // Mark that we've set the bounds
    }
    
    // Store reference to GeoJSON layer
    geoJsonLayerRef.current = geoJsonLayer;

    // If all features are loaded, we can hide the loading indicator
    if (loadingProgress >= 99) {
      setLoading(false);
    }
    
  }, [boundaryData, mapReady, onProvinceClick, theme, L, languageMode, selectedProvinces, provinceData, updateTooltip, loadingProgress]);

  // Create tooltip element on mount
  useEffect(() => {
    // Create tooltip element if it doesn't exist
    if (!tooltipRef.current) {
      const tooltip = document.createElement('div');
      tooltip.style.position = 'fixed';
      tooltip.style.top = '0';
      tooltip.style.left = '0';
      tooltip.style.zIndex = '1000';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      tooltip.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      tooltip.style.borderRadius = '4px';
      tooltip.style.padding = '12px';
      tooltip.style.minWidth = '180px';
      tooltip.style.maxWidth = '250px';
      tooltip.style.border = '2px solid'; // Make border thicker
      tooltip.style.borderColor = theme.palette.primary.main;
      tooltip.style.display = 'none';
      
      document.body.appendChild(tooltip);
      tooltipRef.current = tooltip;
    }
    
    // Clean up on unmount
    return () => {
      if (tooltipRef.current) {
        document.body.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, [theme.palette.primary.main]);

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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
          }}>
            <CircularProgress variant={loading && loadingProgress > 0 ? "determinate" : "indeterminate"} value={loadingProgress} />
            {loading && loadedFeatures > 0 && (
              <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                Loading features: {loadedFeatures} {totalFeatures > 0 ? `/ ~${totalFeatures}` : ''}
              </Typography>
            )}
          </Box>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </Box>
      
      {/* <Box className='leaflet-footer' sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Province color intensity represents visitor volume. Darker regions indicate higher visitor numbers.
        </Typography>
      </Box> */}
    </Box>
  );
};

// Use dynamic import with ssr: false for the map component
const ThailandMap = dynamic(() => Promise.resolve(ThailandMapClient), {
  ssr: false,
  loading: () => {
    return (
      <VisualizationContainer type="map" isLoading={true} />
    );
  },
});

export default ThailandMap;