import { generateThailandHexagons, THAILAND_MAP_CONFIG, ThailandHexagon } from './thailand-map-data';
import type { AdministrativeUnit, ProcessedAdministrativeData } from '@/app/services/data-loader/thailand-administrative-data';

/**
 * Interface for province geographical coordinates (legacy support)
 */
export interface ProvinceCoordinate {
  name: string;
  latitude: number;
  longitude: number;
  population?: number; // Optional for dynamic sizing
}

/**
 * Thailand's geographical boundaries for coordinate mapping
 */
export const THAILAND_GEO_BOUNDS = {
  north: 20.4636,   // Northernmost point (Chiang Rai)
  south: 5.6108,    // Southernmost point (Satun)
  east: 105.6368,   // Easternmost point (Ubon Ratchathani)
  west: 97.3436     // Westernmost point (Mae Hong Son)
};

/**
 * Convert real latitude/longitude coordinates to canvas xy coordinates
 * @param latitude - Real latitude coordinate
 * @param longitude - Real longitude coordinate
 * @param mapWidth - Canvas width for the Thailand map area (default: 300)
 * @param mapHeight - Canvas height for the Thailand map area (default: 400)
 * @param offsetX - Additional x offset (default: 0)
 * @param offsetY - Additional y offset (default: 0)
 * @returns {x, y} coordinates for canvas positioning
 */
export function mapProvinceToXY(
  latitude: number, 
  longitude: number, 
  mapWidth: number = 300, 
  mapHeight: number = 400,
  offsetX: number = 0,
  offsetY: number = 0
): { x: number; y: number } {
  // Convert lat/lng to normalized 0-1 coordinates
  const normalizedX = (longitude - THAILAND_GEO_BOUNDS.west) / (THAILAND_GEO_BOUNDS.east - THAILAND_GEO_BOUNDS.west);
  const normalizedY = (THAILAND_GEO_BOUNDS.north - latitude) / (THAILAND_GEO_BOUNDS.north - THAILAND_GEO_BOUNDS.south);
  
  // Clamp values to 0-1 range to handle edge cases
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const clampedY = Math.max(0, Math.min(1, normalizedY));
  
  // Map to canvas coordinates with offsets
  return {
    x: (clampedX * mapWidth) + offsetX,
    y: (clampedY * mapHeight) + offsetY
  };
}

/**
 * Sample Thailand province coordinates (major provinces)
 * You can expand this with more provinces as needed
 */
export const THAILAND_PROVINCE_COORDINATES: ProvinceCoordinate[] = [
  // Northern Thailand
  { name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853, population: 1781000 },
  { name: 'Chiang Rai', latitude: 19.9105, longitude: 99.8406, population: 1280000 },
  { name: 'Lampang', latitude: 18.2888, longitude: 99.4981, population: 753000 },
  { name: 'Phitsanulok', latitude: 16.8211, longitude: 100.2659, population: 858000 },
  
  // Central Thailand
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, population: 10539000 },
  { name: 'Nonthaburi', latitude: 13.8621, longitude: 100.5144, population: 1257000 },
  { name: 'Pathum Thani', latitude: 14.0208, longitude: 100.5250, population: 1169000 },
  { name: 'Samut Prakan', latitude: 13.5990, longitude: 100.5998, population: 1352000 },
  { name: 'Ayutthaya', latitude: 14.3692, longitude: 100.5877, population: 808000 },
  { name: 'Kanchanaburi', latitude: 14.0227, longitude: 99.5320, population: 871000 },
  { name: 'Ratchaburi', latitude: 13.5282, longitude: 99.8134, population: 849000 },
  
  // Northeastern Thailand (Isaan)
  { name: 'Khon Kaen', latitude: 16.4322, longitude: 102.8236, population: 1789000 },
  { name: 'Udon Thani', latitude: 17.4138, longitude: 102.7877, population: 1560000 },
  { name: 'Nakhon Ratchasima', latitude: 14.9799, longitude: 102.0977, population: 2634000 },
  { name: 'Ubon Ratchathani', latitude: 15.2286, longitude: 104.8698, population: 1844000 },
  { name: 'Surin', latitude: 14.8818, longitude: 103.4936, population: 1383000 },
  { name: 'Buriram', latitude: 14.9930, longitude: 103.1029, population: 1578000 },
  
  // Eastern Thailand
  { name: 'Chonburi', latitude: 13.3611, longitude: 100.9847, population: 1542000 },
  { name: 'Rayong', latitude: 12.6868, longitude: 101.2818, population: 673000 },
  { name: 'Chanthaburi', latitude: 12.6117, longitude: 102.1038, population: 518000 },
  
  // Western Thailand
  { name: 'Tak', latitude: 16.8839, longitude: 99.1260, population: 539000 },
  { name: 'Prachuap Khiri Khan', latitude: 11.8103, longitude: 99.7971, population: 520000 },
  
  // Southern Thailand
  { name: 'Songkhla', latitude: 7.2061, longitude: 100.5959, population: 1408000 },
  { name: 'Surat Thani', latitude: 9.1382, longitude: 99.3215, population: 1040000 },
  { name: 'Phuket', latitude: 7.8804, longitude: 98.3923, population: 417000 },
  { name: 'Krabi', latitude: 8.0863, longitude: 98.9063, population: 458000 },
  { name: 'Nakhon Si Thammarat', latitude: 8.4304, longitude: 99.9631, population: 1547000 },
  { name: 'Yala', latitude: 6.5410, longitude: 101.2815, population: 508000 },
  { name: 'Pattani', latitude: 6.8693, longitude: 101.2503, population: 690000 },
  { name: 'Narathiwat', latitude: 6.4254, longitude: 101.8253, population: 778000 },
];

/**
 * Generate node data from administrative units for use in visualization
 * @param administrativeUnits - Array of administrative units (provinces and/or districts)
 * @param mapWidth - Canvas width for positioning
 * @param mapHeight - Canvas height for positioning
 * @param offsetX - Additional x offset
 * @param offsetY - Additional y offset
 * @returns Array of node objects with id, title, x, y, and size properties
 */
export function generateNodesFromAdministrativeUnits(
  administrativeUnits: AdministrativeUnit[],
  mapWidth: number = 300,
  mapHeight: number = 400,
  offsetX: number = 0,
  offsetY: number = 0
): Array<{ id: string; title: string; x: number; y: number; size: number; type: 'province' | 'district' }> {
  return administrativeUnits.map(unit => {
    const { x, y } = mapProvinceToXY(
      unit.latitude, 
      unit.longitude, 
      mapWidth, 
      mapHeight, 
      offsetX, 
      offsetY
    );
    
    // Calculate node size based on type
    const size = unit.type === 'province' ? 20 : 12;
    
    return {
      id: unit.id,
      title: unit.name,
      x: Math.round(x),
      y: Math.round(y),
      size: Math.round(size),
      type: unit.type
    };
  });
}

/**
 * Legacy function: Generate node data from province coordinates for use in visualization
 * @deprecated Use generateNodesFromAdministrativeUnits instead
 */
export function generateNodesFromProvinces(
  provinces: ProvinceCoordinate[] = THAILAND_PROVINCE_COORDINATES,
  mapWidth: number = 300,
  mapHeight: number = 400,
  offsetX: number = 0,
  offsetY: number = 0
): Array<{ id: string; title: string; x: number; y: number; size: number }> {
  return provinces.map(province => {
    const { x, y } = mapProvinceToXY(
      province.latitude, 
      province.longitude, 
      mapWidth, 
      mapHeight, 
      offsetX, 
      offsetY
    );
    
    // Calculate node size based on population (if available)
    let size = 15; // Default size
    if (province.population) {
      // Scale size based on population (logarithmic scale for better visualization)
      const minSize = 10;
      const maxSize = 30;
      const minPop = 400000;
      const maxPop = 11000000;
      
      const logPop = Math.log(province.population);
      const logMin = Math.log(minPop);
      const logMax = Math.log(maxPop);
      
      const normalizedSize = (logPop - logMin) / (logMax - logMin);
      size = minSize + (normalizedSize * (maxSize - minSize));
      size = Math.max(minSize, Math.min(maxSize, size));
    }
    
    return {
      id: province.name.toLowerCase().replace(/\s+/g, ''),
      title: province.name,
      x: Math.round(x),
      y: Math.round(y),
      size: Math.round(size)
    };
  });
}

/**
 * Utility to print Thailand hexagon coordinates for debugging and customization
 * This helps you identify which row/col coordinates are currently included in the map
 */
export function printThailandCoordinates(): void {
  const hexagons = generateThailandHexagons(18, 15.588, 0, 0); // Use standard hex dimensions
  
  console.log('Thailand Hexagon Coordinates:');
  console.log('============================');
  
  // Group by region for easier visualization
  const byRegion = hexagons.reduce((acc, hex) => {
    if (!acc[hex.region]) acc[hex.region] = [];
    acc[hex.region].push({ row: hex.row, col: hex.col });
    return acc;
  }, {} as Record<string, Array<{row: number, col: number}>>);
  
  Object.entries(byRegion).forEach(([region, coords]) => {
    console.log(`\n${region.toUpperCase()}:`);
    coords
      .sort((a, b) => a.row === b.row ? a.col - b.col : a.row - b.row)
      .forEach(coord => {
        console.log(`  { row: ${coord.row}, col: ${coord.col}, region: '${region}' },`);
      });
  });
  
  console.log(`\nTotal hexagons: ${hexagons.length}`);
  console.log(`Map dimensions: ${THAILAND_MAP_CONFIG.cols} cols x ${THAILAND_MAP_CONFIG.rows} rows`);
}

/**
 * Generate a visual ASCII representation of the Thailand map
 * showing row/col positions for easier editing
 */
export function generateThailandMapAscii(): string {
  const hexagons = generateThailandHexagons(18, 15.588, 0, 0);
  const { cols, rows } = THAILAND_MAP_CONFIG;
  
  // Create a 2D grid
  const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill('  '));
  
  // Fill grid with region indicators
  const regionChars = {
    north: 'N ',
    central: 'C ',
    northeast: 'E ',
    east: 'A ',
    west: 'W ',
    south: 'S '
  };
  
  hexagons.forEach(hex => {
    grid[hex.row][hex.col] = regionChars[hex.region];
  });
  
  // Convert to string with row/col labels
  let result = '\nThailand Map Visualization:\n';
  result += '   '; // Column header spacing
  for (let col = 0; col < cols; col++) {
    result += (col % 10).toString();
  }
  result += '\n';
  
  grid.forEach((row, rowIndex) => {
    const rowLabel = rowIndex.toString().padStart(2, '0');
    result += `${rowLabel} `;
    result += row.join('');
    result += '\n';
  });
  
  result += '\nLegend: N=North, C=Central, E=Northeast, A=East, W=West, S=South\n';
  
  return result;
}

/**
 * Export current Thailand coordinates as a ready-to-use array
 * for manual customization in thailand-map-data.ts
 */
export function exportThailandCoordinatesArray(): string {
  const hexagons = generateThailandHexagons(18, 15.588, 0, 0);
  
  let result = 'export const THAILAND_HEXAGON_COORDINATES: Array<{row: number, col: number, region: ThailandHexagon[\'region\']}> = [\n';
  
  hexagons
    .sort((a, b) => a.row === b.row ? a.col - b.col : a.row - b.row)
    .forEach(hex => {
      result += `  { row: ${hex.row}, col: ${hex.col}, region: '${hex.region}' },\n`;
    });
  
  result += '];\n';
  
  return result;
}

/**
 * Validate and count hexagons by region
 */
export function analyzeThailandMap(): void {
  const hexagons = generateThailandHexagons(18, 15.588, 0, 0);
  
  const stats = hexagons.reduce((acc, hex) => {
    acc[hex.region] = (acc[hex.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Thailand Map Statistics:');
  console.log('========================');
  Object.entries(stats).forEach(([region, count]) => {
    console.log(`${region}: ${count} hexagons`);
  });
  console.log(`Total: ${hexagons.length} hexagons`);
}

// Development helper - call this to see current map layout
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment these lines when you want to analyze the current map:
  console.log(generateThailandMapAscii());
  printThailandCoordinates();
  analyzeThailandMap();
} 