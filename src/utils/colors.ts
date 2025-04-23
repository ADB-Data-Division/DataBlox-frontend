import * as d3 from 'd3';

/**
 * Generate a consistent color from a string
 * @param str Any string input
 * @returns A color in string format from D3's spectral color scheme
 */
export const stringToColor = (str: string): string => {
  // Create a hash from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Map the hash to a value between 0 and 1
  const normalizedValue = Math.abs(hash) % 1000 / 1000;
  
  // Use D3's color interpolation scales
  return d3.interpolateSpectral(normalizedValue);
};

/**
 * Generates a color based on a numeric value using D3's RdYlBu scale
 * @param value Numeric value to convert to color
 * @param maxValue Maximum possible value in the range
 * @returns A color string
 */
export const valueToColor = (value: number, maxValue: number = 1000000): string => {
  return d3.interpolateRdYlBu(value / maxValue);
};

/**
 * Convert a hex color to RGB components
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Handle shorthand hex
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

  // Parse hex to RGB
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Check if a color is light or dark based on its relative luminance
 * @param color Hex or RGB color
 * @returns true if the color is light, false if it's dark
 */
export const isLightColor = (color: string): boolean => {
  // Handle colors from d3 interpolation (they return rgb() format)
  if (color.startsWith('rgb')) {
    const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (matches) {
      const r = parseInt(matches[1]) / 255;
      const g = parseInt(matches[2]) / 255;
      const b = parseInt(matches[3]) / 255;
      
      // Calculate relative luminance (percieved brightness)
      // Using the formula from WCAG 2.0
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luminance > 0.5;
    }
  }
  
  // Handle hex colors
  const rgb = hexToRgb(color);
  if (!rgb) return true; // Default to light if parsing fails
  
  const { r, g, b } = rgb;
  
  // Calculate relative luminance
  const luminance = 
    0.2126 * (r / 255) + 
    0.7152 * (g / 255) + 
    0.0722 * (b / 255);
  
  return luminance > 0.5;
};

/**
 * Get a contrasting color for text based on background color
 * @param backgroundColor The background color
 * @returns A contrasting color (dark text on light backgrounds, light text on dark backgrounds)
 */
export const getContrastingTextColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
};

/**
 * Get a safely readable text color against a white background
 * @param color The original color
 * @returns A color that is readable against white
 */
export const getSafeTextColor = (color: string): string => {
  // If the color is already dark enough, use it
  if (!isLightColor(color)) {
    return color;
  }
  
  // For light colors, darken them significantly or use a dark alternative
  // Parse the color to RGB first
  if (color.startsWith('rgb')) {
    const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (matches) {
      // Darken the color by reducing brightness
      const r = Math.floor(parseInt(matches[1]) * 0.6);
      const g = Math.floor(parseInt(matches[2]) * 0.6);
      const b = Math.floor(parseInt(matches[3]) * 0.6);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  
  // For hex colors
  const rgb = hexToRgb(color);
  if (rgb) {
    // Darken the color by reducing brightness
    const r = Math.floor(rgb.r * 0.6);
    const g = Math.floor(rgb.g * 0.6);
    const b = Math.floor(rgb.b * 0.6);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Fallback to a safe dark color
  return '#444444';
}; 