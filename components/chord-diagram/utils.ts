import * as d3 from 'd3';

/**
 * Generates tick divisions for a chord group
 * @param d The chord group data
 * @param step The step size between ticks
 */
export function groupTicks(d: any, step: number) {
  const k = (d.endAngle - d.startAngle) / d.value;
  return d3.range(0, d.value, step).map(value => {
    return { 
      value: value, 
      angle: value * k + d.startAngle,
      isMajor: value % (step * 5) === 0 // Mark every 5th tick as major
    };
  });
}

/**
 * Formats a value as a percentage of the total
 * @param value The value to format
 * @param totalValue The total value
 * @returns Formatted percentage string
 */
export function formatValueAsPercent(value: number, totalValue: number): string {
  return d3.format(".1%")(value / totalValue);
}

/**
 * Calculates the optimal dimension for a chart based on container size
 * @param containerWidth The width of the container
 * @param containerHeight The height of the container
 * @param aspectRatio The desired aspect ratio (width/height)
 * @returns Optimal dimensions object
 */
export function calculateChartDimensions(
  containerWidth: number, 
  containerHeight: number, 
  aspectRatio: number = 1.5
): { width: number; height: number } {
  if (containerWidth / containerHeight > aspectRatio) {
    // Container is wider than desired aspect ratio
    const width = containerHeight * aspectRatio;
    return { width, height: containerHeight };
  } else {
    // Container is taller than desired aspect ratio
    const height = containerWidth / aspectRatio;
    return { width: containerWidth, height };
  }
}

/**
 * Creates a color scale from names array
 * @param names Array of names to generate colors for
 * @param customColors Optional custom color scheme
 * @returns d3 color scale
 */
export function createColorScale(
  names: string[], 
  customColors?: string[]
): d3.ScaleOrdinal<string, string> {
  const colors = customColors || d3.schemeCategory10;
  return d3.scaleOrdinal(names, colors);
}

/**
 * Calculates percentage for tooltip display
 * @param value The value
 * @param totalValue The total value
 * @returns Rounded percentage
 */
export function calculatePercentage(value: number, totalValue: number): number {
  return Math.round((value / totalValue) * 100);
} 