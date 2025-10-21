import { MigrationResponse, MigrationFlow } from './types';
import { mapProvinceToXY } from '../../../components/node-flow-animation/thailand-map-utils';

// Import administrative units data for coordinates
import thailandAdministrativeUnits from '../../../public/datasets/thailand_administrative_units.json';

// Import location display utilities
import { getLocationDisplayInfo } from '../../../src/utils/locationDisplay';

// Interface for administrative unit data (matches actual JSON structure)
interface AdministrativeUnit {
  id: string;
  name_en: string;
  name_th: string;
  type: string;
  latitude: number;
  longitude: number;
}

// Node interface expected by the map visualization
export interface MapNode {
  id: string;
  title: string;
  tooltip: string;
  x: number;
  y: number;
  size: number; // radius of the circle
}

// Connection interface expected by the map visualization
export interface MapConnection {
  fromNodeId: string;
  toNodeId: string;
  toFlowRate: number; // normalized rate for "to" direction (negative multiplier)
  fromFlowRate: number; // normalized rate for "from" direction (positive multiplier)
  metadata: {
    absoluteToFlow: number;
    absoluteFromFlow: number;
    units?: string;
  };
}

// Transform result interface
export interface TransformedMigrationData {
  nodes: MapNode[];
  connections: MapConnection[];
}

// Thailand map dimensions (consistent with node-flow-animation component)
const MAP_WIDTH = 270; // Approximate width of Thailand hexagon layout
const MAP_HEIGHT = 500; // Approximate height of Thailand hexagon layout

// Origin points for coordinate transformation (adjustable)
export const ORIGIN_X = 45; // Center the map (centerX from node-flow-animation)
export const ORIGIN_Y = -70; // Center the map (centerY from node-flow-animation)

/**
 * Get coordinates for a location ID from the administrative units data
 * @param locationId - The location ID to look up
 * @returns - Object with lat, lng, and transformed SVG x, y coordinates
 */
function getLocationCoordinates(locationId: string): { lat: number, lng: number, x: number; y: number } {
  // Cast the imported data to the correct type
  const units = thailandAdministrativeUnits as AdministrativeUnit[];
  
  // Find the unit by ID
  const unit = units.find(u => u.id === locationId);
  
  if (unit) {
    // Use the existing coordinate transformation from thailand-map-utils.ts
    const svgCoords = mapProvinceToXY(
      unit.latitude,
      unit.longitude,
      MAP_WIDTH,
      MAP_HEIGHT,
      ORIGIN_X,
      ORIGIN_Y
    );
    return {
      lat: unit.latitude,
      lng: unit.longitude,
      x: svgCoords.x,
      y: svgCoords.y
    };
  }
  
  // Default coordinates (center of Thailand approximately)
  console.warn(`No coordinates found for location ID: ${locationId}, using default coordinates`);
  const defaultSvg = mapProvinceToXY(
    13.7563, // Bangkok latitude
    100.5018, // Bangkok longitude
    MAP_WIDTH,
    MAP_HEIGHT,
    ORIGIN_X,
    ORIGIN_Y
  );
  return {
    lat: 13.7563,
    lng: 100.5018,
    x: defaultSvg.x,
    y: defaultSvg.y
  };
}

/**
 * Calculate node size based on migration volume
 * @param moveIn - Number of people moving into the location
 * @param moveOut - Number of people moving out of the location
 * @returns - Size (radius) for the node
 */
function calculateNodeSize(moveIn: number, moveOut: number): number {
  const totalMigration = moveIn + moveOut;
  
  // Base size between 15-40 pixels
  const minSize = 15;
  const maxSize = 40;
  
  // Normalize based on typical migration volumes (adjust these thresholds as needed)
  const minMigration = 10000;
  const maxMigration = 200000;
  
  const normalizedVolume = Math.min(Math.max(totalMigration, minMigration), maxMigration);
  const ratio = (normalizedVolume - minMigration) / (maxMigration - minMigration);
  
  return minSize + (ratio * (maxSize - minSize));
}

/**
 * Normalize flow rates for visualization
 * @param flowCount - Absolute flow count
 * @param maxFlow - Maximum flow in the dataset
 * @returns - Normalized flow rate (-50 to 50)
 */
function normalizeFlowRate(flowCount: number, maxFlow: number): number {
  if (maxFlow === 0) return 0;
  
  const minRate = 1;
  const maxRate = 50;
  
  const ratio = Math.abs(flowCount) / maxFlow;
  return Math.sign(flowCount) * (minRate + (ratio * (maxRate - minRate)));
}

/**
 * Transform migration API response into format expected by map visualization
 * @param apiResponse - Response from /migrations endpoint
 * @param selectedTimePeriod - Time period ID to focus on (optional, uses first period if not provided)
 * @returns - Transformed data with nodes and connections
 */
export function transformMigrationDataForMap(
  apiResponse: MigrationResponse,
  selectedTimePeriod?: string
): TransformedMigrationData {
  console.log('🔄 Transforming migration data:', {
    selectedTimePeriod,
    availableTimePeriods: apiResponse.time_periods?.map(tp => tp.id) || [],
    totalLocations: apiResponse.data?.length || 0,
    totalFlows: apiResponse.flows?.length || 0
  });

  // Use first time period if none specified
  const timePeriodId = selectedTimePeriod || apiResponse.time_periods[0]?.id;
  
  if (!timePeriodId) {
    throw new Error('No time period available in the data');
  }

  console.log('📅 Using time period:', timePeriodId);

  // Transform location data into nodes
  const nodes: MapNode[] = apiResponse.data.map(locationData => {
    const location = locationData.location;
    const timeSeriesData = locationData.time_series[timePeriodId];
    
    // Get coordinates for this location
    const coordinates = getLocationCoordinates(location.id);
    
    // Calculate node size based on migration volume
    const moveIn = timeSeriesData?.move_in || 0;
    const moveOut = timeSeriesData?.move_out || 0;
    const size = calculateNodeSize(moveIn, moveOut);
    
    // Determine location type from administrative units data
    const units = thailandAdministrativeUnits as AdministrativeUnit[];
    const unit = units.find(u => u.id === location.id);
    const locationType = unit?.type || 'province'; // Default to province if not found
    
    // Get display information based on location type
    const { displayText, tooltipText } = getLocationDisplayInfo(
      location.name,
      location.code,
      locationType as 'province' | 'district' | 'subDistrict'
    );
    
    return {
      id: location.id,
      title: displayText,
      tooltip: tooltipText,
      x: coordinates.x,
      y: coordinates.y,
      size: size
    };
  });

  // Filter flows for the selected time period
  const relevantFlows = apiResponse.flows?.filter(flow => 
    flow.time_period_id === timePeriodId
  ) || [];

  // Find maximum flow for normalization
  const maxFlow = Math.max(...relevantFlows.map(flow => Math.abs(flow.flow_count)));

  // Group flows by origin-destination pairs to combine bidirectional flows
  const flowPairs = new Map<string, {
    originToDestFlow: MigrationFlow | null;
    destToOriginFlow: MigrationFlow | null;
  }>();

  relevantFlows.forEach(flow => {
    const pairKey = `${flow.origin.id}-${flow.destination.id}`;
    const reversePairKey = `${flow.destination.id}-${flow.origin.id}`;
    
    if (flowPairs.has(reversePairKey)) {
      // This is the return flow
      const pair = flowPairs.get(reversePairKey)!;
      pair.destToOriginFlow = flow;
    } else {
      // This is the primary flow
      flowPairs.set(pairKey, {
        originToDestFlow: flow,
        destToOriginFlow: null
      });
    }
  });

  // Transform flow pairs into connections
  const connections: MapConnection[] = [];

  // Create a set of available node IDs for quick lookup
  const availableNodeIds = new Set(nodes.map(node => node.id));

  flowPairs.forEach((pair) => {
    const primaryFlow = pair.originToDestFlow;
    const returnFlow = pair.destToOriginFlow;
    
    if (!primaryFlow) return;

    // Skip self-loops (same origin and destination)
    if (primaryFlow.origin.id === primaryFlow.destination.id) {
      return;
    }

    // Skip flows where either origin or destination node doesn't exist
    // This handles cases like "OTH-00" (Other Provinces) which are aggregated categories
    const originNodeExists = availableNodeIds.has(primaryFlow.origin.id);
    const destinationNodeExists = availableNodeIds.has(primaryFlow.destination.id);
    
    if (!originNodeExists || !destinationNodeExists) {
      console.log(`Skipping flow from ${primaryFlow.origin.name} (${primaryFlow.origin.id}) to ${primaryFlow.destination.name} (${primaryFlow.destination.id}) - missing node data`);
      return;
    }

    // Normalize flow rates
    const toFlowRate = normalizeFlowRate(primaryFlow.flow_count, maxFlow);
    const fromFlowRate = returnFlow 
      ? -normalizeFlowRate(returnFlow.flow_count, maxFlow)
      : 0;

    connections.push({
      fromNodeId: primaryFlow.origin.id,
      toNodeId: primaryFlow.destination.id,
      toFlowRate: toFlowRate,
      fromFlowRate: fromFlowRate,
      metadata: {
        absoluteToFlow: primaryFlow.flow_count,
        absoluteFromFlow: returnFlow?.flow_count || 0,
        units: 'people'
      }
    });
  });

  console.log('✅ Transformation complete:', {
    nodeCount: nodes.length,
    nodes: nodes,
    connections: connections.length,
    connectionDetails: connections.map(c => `${c.fromNodeId}→${c.toNodeId} (to:${c.toFlowRate.toFixed(1)}, from:${c.fromFlowRate.toFixed(1)})`)
  });

  return {
    nodes,
    connections
  };
}

/**
 * Get available time periods from the API response
 * @param apiResponse - Response from /migrations endpoint
 * @returns - Array of time period objects with id and label
 */
export function getAvailableTimePeriods(apiResponse: MigrationResponse): Array<{
  id: string;
  label: string;
}> {
  return apiResponse.time_periods.map(period => ({
    id: period.id,
    label: formatTimePeriodLabel(period.start_date, period.end_date)
  }));
}

/**
 * Format time period dates into a readable label
 * @param startDate - ISO 8601 start date
 * @param endDate - ISO 8601 end date
 * @returns - Formatted label (e.g., "Dec 2024")
 */
function formatTimePeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If it's a monthly period, just show the month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  // For longer periods, show start and end
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  return `${startLabel} - ${endLabel}`;
}