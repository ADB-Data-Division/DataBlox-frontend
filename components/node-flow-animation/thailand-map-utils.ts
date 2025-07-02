import { generateThailandHexagons, THAILAND_MAP_CONFIG, ThailandHexagon } from './thailand-map-data';

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