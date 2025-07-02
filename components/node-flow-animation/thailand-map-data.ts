export interface ThailandHexagon {
  row: number;
  col: number;
  x: number;
  y: number;
  region: 'north' | 'central' | 'northeast' | 'east' | 'west' | 'south';
}

export interface ThailandMapConfig {
  cols: number;
  rows: number;
  centerCol: number;
}

export const THAILAND_MAP_CONFIG: ThailandMapConfig = {
  cols: 25,
  rows: 40,
  centerCol: 12
};

// Define Thailand regions with colors
export const REGION_COLORS = {
  north: '#cccccc',      // Dark blue
  central: '#cccccc',    // Blue  
  northeast: '#cccccc',  // Light blue
  east: '#cccccc',       // Very light blue
  west: '#cccccc',       // Medium blue
  south: '#cccccc'       // Dark blue
};

/**
 * Determines if a given row/col coordinate is within Thailand's borders
 * and returns the appropriate region, or null if outside Thailand
 */
export function getThailandRegion(row: number, col: number): ThailandHexagon['region'] | null {
  const { centerCol } = THAILAND_MAP_CONFIG;
  
  // Thailand's actual shape approximation
  const isInThailand = (row: number, col: number): boolean => {
    // Northern Thailand (Chiang Mai region)
    if (row >= 2 && row <= 12) {
      return col >= centerCol - 4 && col <= centerCol + 4 && 
             Math.abs(col - centerCol) <= (14 - row) * 0.6;
    }
    // Central Thailand (Bangkok region) - wider
    else if (row >= 13 && row <= 22) {
      return col >= centerCol - 5 && col <= centerCol + 6;
    }
    // Upper Southern Thailand
    else if (row >= 23 && row <= 28) {
      return col >= centerCol - 3 && col <= centerCol + 4;
    }
    // Lower Southern Thailand (narrow peninsula)
    else if (row >= 29 && row <= 38) {
      const narrowing = (row - 29) * 0.3;
      return col >= centerCol - 2 + narrowing && col <= centerCol + 2 - narrowing;
    }
    return false;
  };
  
  if (!isInThailand(row, col)) {
    return null;
  }
  
  // Determine region based on row/col position
  // North region (mountainous area)
  if (row >= 2 && row <= 8) {
    return 'north';
  }
  // Northeast region (Isaan plateau)
  else if (row >= 6 && row <= 18 && col >= centerCol + 1) {
    return 'northeast';
  }
  // Central region (Bangkok and surrounding plains)
  else if (row >= 9 && row <= 22 && col >= centerCol - 3 && col <= centerCol + 1) {
    return 'central';
  }
  // West region (border with Myanmar)
  else if (row >= 12 && row <= 26 && col >= centerCol - 5 && col <= centerCol - 2) {
    return 'west';
  }
  // East region (border with Cambodia)
  else if (row >= 18 && row <= 26 && col >= centerCol + 2) {
    return 'east';
  }
  // South region (peninsula)
  else if (row >= 23) {
    return 'south';
  }
  // Default to central for remaining areas
  else {
    return 'central';
  }
}

/**
 * Generate Thailand hexagon data with row/col indices for easy customization
 */
export function generateThailandHexagons(
  hexWidth: number, 
  hexHeight: number, 
  offsetX: number = 100, 
  offsetY: number = 50
): ThailandHexagon[] {
  const hexagons: ThailandHexagon[] = [];
  const { cols, rows } = THAILAND_MAP_CONFIG;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const region = getThailandRegion(row, col);
      
      if (region) {
        const x = col * hexWidth * 0.75 + offsetX; // Horizontal spacing for tessellation
        const y = row * hexHeight + (col % 2) * hexHeight * 0.5 + offsetY; // Proper tessellation offset
        
        hexagons.push({ 
          row, 
          col, 
          x, 
          y, 
          region 
        });
      }
    }
  }
  
  return hexagons;
}

// Compact row-based Thailand coordinate definition
interface ThailandRowData {
  row: number;
  segments: Array<{
    cols: number[] | { start: number; end: number };
    region: ThailandHexagon['region'];
  }>;
}

// Compact Thailand map data - much easier to encode manually
const THAILAND_COMPACT_DATA: ThailandRowData[] = [
  { row: 1, segments: [{ cols: [9, 10, 11], region: 'north' }] },
  { row: 2, segments: [{ cols: { start: 5, end: 12 }, region: 'north' }] },
  { row: 3, segments: [{ cols: { start: 4, end: 12 }, region: 'north' }] },
  { row: 4, segments: [{ cols:{start: 4, end: 12}, region: 'north' }] },
  { row: 5, segments: [{ cols: { start: 4, end: 12 }, region: 'north' }, {cols: {start: 15, end: 18}, region: 'north'}] },
  { row: 6, segments: [
    { cols: { start: 4, end: 19 }, region: 'north' },
    { cols: [18], region: 'northeast' }
  ]},
  { row: 7, segments: [
    { cols: { start: 5, end: 20 }, region: 'north' },
  ]},
  { row: 8, segments: [
    { cols: { start: 6, end: 20 }, region: 'north' },
  ]},
  { row: 9, segments: [
    { cols: { start: 6, end: 11 }, region: 'central' },
    { cols: { start: 12, end: 21 }, region: 'northeast' }
  ]},
  { row: 10, segments: [
    { cols: { start: 6, end: 12 }, region: 'central' },
    { cols: { start: 13, end: 22 }, region: 'northeast' }
  ]},
  { row: 11, segments: [
    { cols: { start: 5, end: 13 }, region: 'central' },
    { cols: { start: 14, end: 22 }, region: 'northeast' }
  ]},
  { row: 12, segments: [
    { cols: [5], region: 'west' },
    { cols: { start: 6, end: 14 }, region: 'central' },
    { cols: { start: 15, end: 22 }, region: 'northeast' }
  ]},
  { row: 13, segments: [
    { cols: [6, 6], region: 'west' },
    { cols: { start: 7, end: 15 }, region: 'central' },
    { cols: { start: 16, end: 22 }, region: 'northeast' }
  ]},
  { row: 14, segments: [
    { cols: { start: 7, end: 16 }, region: 'west' },
    { cols: { start: 6, end: 16 }, region: 'central' }
  ]},
  { row: 15, segments: [
    { cols: [7, 8, 9, 10], region: 'west' },
  ]},
  { row: 16, segments: [
    { cols: [8, 9, 10], region: 'west' },
  ]},
  { row: 17, segments: [
    { cols: [8, 9], region: 'west' },
  ]},
  { row: 18, segments: [
    { cols: [9], region: 'west' },
  ]},
  { row: 19, segments: [
    { cols: [8], region: 'west' },
  ]},
  { row: 20, segments: [
    { cols: [7, 8], region: 'west' },
  ]},
  { row: 21, segments: [
    { cols: [7, 8], region: 'west' },
  ]},
  { row: 22, segments: [
    { cols: [6, 7], region: 'west' },
  ]},
  { row: 23, segments: [{ cols: [6, 7, 9], region: 'south' }] },
  { row: 24, segments: [{ cols: {start: 5, end: 9}, region: 'south' }] },
  { row: 25, segments: [{ cols: {start: 5, end: 10}, region: 'south' }] },
  { row: 26, segments: [{ cols: {start: 5, end: 10}, region: 'south' }] },
  { row: 27, segments: [{ cols: {start: 6, end: 10}, region: 'south' }] },
  { row: 28, segments: [{ cols: {start: 8, end: 10}, region: 'south' }] },
  { row: 29, segments: [{ cols: {start: 9, end: 14}, region: 'south' }] },
  { row: 30, segments: [{ cols: {start: 12, end: 14}, region: 'south' }] },
  { row: 31, segments: [{ cols: {start: 12, end: 14}, region: 'south' }] },
];

// Helper function to expand compact data into full coordinate array
function expandCompactData(): Array<{row: number, col: number, region: ThailandHexagon['region']}> {
  const coordinates: Array<{row: number, col: number, region: ThailandHexagon['region']}> = [];
  
  for (const rowData of THAILAND_COMPACT_DATA) {
    for (const segment of rowData.segments) {
      if (Array.isArray(segment.cols)) {
        // Handle individual column numbers
        for (const col of segment.cols) {
          coordinates.push({ row: rowData.row, col, region: segment.region });
        }
      } else {
        // Handle column ranges
        for (let col = segment.cols.start; col <= segment.cols.end; col++) {
          coordinates.push({ row: rowData.row, col, region: segment.region });
        }
      }
    }
  }
  
  return coordinates;
}

// Export the expanded coordinates for backward compatibility
export const THAILAND_HEXAGON_COORDINATES: Array<{row: number, col: number, region: ThailandHexagon['region']}> = expandCompactData();

/**
 * Alternative function to use manually defined coordinates instead of algorithmic generation
 */
export function generateThailandHexagonsFromCoordinates(
  hexWidth: number, 
  hexHeight: number, 
  offsetX: number = 100, 
  offsetY: number = 50
): ThailandHexagon[] {
  if (THAILAND_HEXAGON_COORDINATES.length === 0) {
    // Fall back to algorithmic generation if no manual coordinates defined
    return generateThailandHexagons(hexWidth, hexHeight, offsetX, offsetY);
  }
  
  return THAILAND_HEXAGON_COORDINATES.map(({ row, col, region }) => {
    const x = col * hexWidth * 0.75 + offsetX;
    const y = row * hexHeight + (col % 2) * hexHeight * 0.5 + offsetY;
    
    return { row, col, x, y, region };
  });
} 