import { TourismResponse, TourismFlow, LocationTourismData } from './types';
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
export interface TourismMapNode {
  id: string;
  title: string;
  tooltip: string;
  x: number;
  y: number;
  size: number; // radius of the circle
}

// Connection interface expected by the map visualization (adapted for tourism)
// For tourism, we only have arrivals (one-way flow), so fromFlowRate will always be 0
export interface TourismMapConnection {
  fromNodeId: string;
  toNodeId: string;
  toFlowRate: number; // normalized rate for arrivals
  fromFlowRate: number; // Always 0 for tourism (no departures data)
  metadata: {
    absoluteToFlow: number; // arrivals count
    absoluteFromFlow: number; // Always 0 for tourism
    units?: string;
  };
}

// Transform result interface
export interface TransformedTourismData {
  nodes: TourismMapNode[];
  connections: TourismMapConnection[];
}

// Thailand map dimensions (consistent with node-flow-animation component)
const MAP_WIDTH = 270;
const MAP_HEIGHT = 500;

// Origin points for coordinate transformation
export const ORIGIN_X = 45;
export const ORIGIN_Y = -70;

/**
 * Get coordinates for a location ID or name from the administrative units data
 * Tourism API returns province names as IDs, so we need to search by both
 */
function getLocationCoordinates(locationIdOrName: string): { lat: number, lng: number, x: number; y: number; unit?: AdministrativeUnit } {
  const units = thailandAdministrativeUnits as AdministrativeUnit[];
  
  // First try to find by ID (numeric)
  let unit = units.find(u => u.id === locationIdOrName);
  
  // If not found, try to find by name (case-insensitive)
  if (!unit) {
    unit = units.find(u => 
      u.name_en.toLowerCase() === locationIdOrName.toLowerCase()
    );
  }
  
  if (unit) {
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
      y: svgCoords.y,
      unit
    };
  }
  
  console.warn(`No coordinates found for location: ${locationIdOrName}, using default coordinates`);
  const defaultSvg = mapProvinceToXY(
    13.7563,
    100.5018,
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
 * Calculate node size based on arrivals volume
 */
function calculateNodeSize(arrivals: number): number {
  const minSize = 15;
  const maxSize = 40;
  
  // Normalize based on typical tourism volumes
  const minArrivals = 1000;
  const maxArrivals = 100000;
  
  const normalizedVolume = Math.min(Math.max(arrivals, minArrivals), maxArrivals);
  const ratio = (normalizedVolume - minArrivals) / (maxArrivals - minArrivals);
  
  return minSize + (ratio * (maxSize - minSize));
}

/**
 * Normalize flow rates for visualization
 */
function normalizeFlowRate(flowCount: number, maxFlow: number): number {
  if (maxFlow === 0) return 0;
  
  const minRate = 1;
  const maxRate = 50;
  
  const ratio = Math.abs(flowCount) / maxFlow;
  return Math.sign(flowCount) * (minRate + (ratio * (maxRate - minRate)));
}

/**
 * Transform tourism API response into format expected by map visualization
 * Note: Tourism data only has arrivals, so flows are one-directional
 */
export function transformTourismDataForMap(
  apiResponse: TourismResponse,
  selectedTimePeriod?: string
): TransformedTourismData {
  console.log('🔄 Transforming tourism data:', {
    selectedTimePeriod,
    availableTimePeriods: apiResponse.time_periods?.map(tp => tp.id) || [],
    totalLocations: apiResponse.data?.length || 0,
    totalFlows: apiResponse.flows?.length || 0
  });

  const timePeriodId = selectedTimePeriod || apiResponse.time_periods?.[0]?.id || '';

  if (!timePeriodId) {
    console.warn('No time period available in the tourism data');
    return {
      nodes: [],
      connections: []
    };
  }

  console.log('📅 Using time period:', timePeriodId);

  // Transform location data into nodes
  const nodes: TourismMapNode[] = apiResponse.data.map(locationData => {
    const location = locationData.location;
    const timeSeriesData = locationData.time_series[timePeriodId];
    
    // Get coordinates and also the administrative unit info
    const coordResult = getLocationCoordinates(location.id);
    
    // Calculate node size based on arrivals volume
    const arrivals = timeSeriesData?.arrivals || 0;
    const size = calculateNodeSize(arrivals);
    
    // Use the unit from coordinate lookup (which searches by both ID and name)
    const unit = coordResult.unit;
    const locationType = unit?.type || 'province';
    
    // For nodes found in administrative data, use proper display info
    // The API now returns proper 3-letter abbreviations in location.code (e.g., BAN, CHI)
    const { displayText, tooltipText } = unit 
      ? getLocationDisplayInfo(
          unit.name_en,
          location.code, // API now returns proper abbreviations like "BAN", "CHI"
          locationType as 'province' | 'district' | 'subDistrict'
        )
      : { displayText: location.code || location.name.substring(0, 3).toUpperCase(), tooltipText: location.name };
    
    // Use the numeric ID from the unit if available, otherwise use the API ID
    const nodeId = unit?.id || location.id;
    
    return {
      id: nodeId,
      title: displayText,
      tooltip: tooltipText,
      x: coordResult.x,
      y: coordResult.y,
      size: size
    };
  });

  // Filter flows for the selected time period
  const relevantFlows = apiResponse.flows?.filter(flow => 
    flow.time_period_id === timePeriodId
  ) || [];

  const maxFlow = relevantFlows.length > 0 
    ? Math.max(...relevantFlows.map(flow => Math.abs(flow.flow_count))) 
    : 0;

  // Create a set of available node IDs for quick lookup
  const availableNodeIds = new Set(nodes.map(node => node.id));
  
  // Create a mapping from API location names to our node IDs
  // The API uses names like "Bangkok" but our nodes now use numeric IDs like "1"
  const nameToNodeIdMap = new Map<string, string>();
  const units = thailandAdministrativeUnits as AdministrativeUnit[];
  apiResponse.data.forEach(locationData => {
    const apiId = locationData.location.id; // e.g., "Bangkok"
    // Find the unit by name to get its numeric ID
    const unit = units.find(u => u.name_en.toLowerCase() === apiId.toLowerCase());
    if (unit) {
      nameToNodeIdMap.set(apiId.toLowerCase(), unit.id);
    }
  });

  // Helper function to resolve API location ID to node ID
  const resolveNodeId = (apiLocationId: string): string | null => {
    // Try direct match first (in case API uses numeric IDs)
    if (availableNodeIds.has(apiLocationId)) {
      return apiLocationId;
    }
    // Try name-based lookup
    const mappedId = nameToNodeIdMap.get(apiLocationId.toLowerCase());
    if (mappedId && availableNodeIds.has(mappedId)) {
      return mappedId;
    }
    return null;
  };

  // Transform flows into connections
  // Group flows to handle bidirectionality correctly matches NodeFlowAnimation expectations
  const flowMap = new Map<string, {
    fromNodeId: string;
    toNodeId: string;
    toFlowRate: number;
    fromFlowRate: number;
    absoluteToFlow: number;
    absoluteFromFlow: number;
  }>();

  relevantFlows.forEach(flow => {
    // Skip self-loops
    if (flow.origin.id === flow.destination.id) {
      return;
    }

    // Resolve to actual node IDs
    const fromNodeId = resolveNodeId(flow.origin.id);
    const toNodeId = resolveNodeId(flow.destination.id);

    // Skip flows where either node doesn't exist
    if (!fromNodeId || !toNodeId) {
      console.log(`Skipping flow from ${flow.origin.name} to ${flow.destination.name} - missing node data`);
      return;
    }

    // Use sorted key to group bidirectional flows
    // This ensures 1->2 and 2->1 are grouped into the same connection object
    const isForward = fromNodeId < toNodeId;
    const key = isForward ? `${fromNodeId}-${toNodeId}` : `${toNodeId}-${fromNodeId}`;

    if (!flowMap.has(key)) {
      flowMap.set(key, {
        fromNodeId: isForward ? fromNodeId : toNodeId,
        toNodeId: isForward ? toNodeId : fromNodeId,
        toFlowRate: 0,
        fromFlowRate: 0,
        absoluteToFlow: 0,
        absoluteFromFlow: 0
      });
    }

    const entry = flowMap.get(key)!;
    const rate = normalizeFlowRate(flow.flow_count, maxFlow);

    if (isForward) {
      // Current flow matches the key direction (from->to)
      // This maps to "toFlowRate" (Traveling To / Move In)
      entry.toFlowRate = rate;
      entry.absoluteToFlow = flow.flow_count;
    } else {
      // Current flow is reverse of key direction (to->from)
      // This maps to "fromFlowRate" (Traveling From / Move Out)
      entry.fromFlowRate = rate;
      entry.absoluteFromFlow = flow.flow_count;
    }
  });

  const connections: TourismMapConnection[] = Array.from(flowMap.values()).map(data => ({
    fromNodeId: data.fromNodeId,
    toNodeId: data.toNodeId,
    toFlowRate: data.toFlowRate,
    fromFlowRate: data.fromFlowRate,
    metadata: {
      absoluteToFlow: data.absoluteToFlow,
      absoluteFromFlow: data.absoluteFromFlow,
      units: 'tourists'
    }
  }));

  console.log('✅ Tourism transformation complete:', {
    nodeCount: nodes.length,
    connectionCount: connections.length
  });

  return {
    nodes,
    connections
  };
}

/**
 * Get available time periods from the tourism API response
 */
export function getTourismTimePeriods(apiResponse: TourismResponse): Array<{
  id: string;
  label: string;
}> {
  const periods = apiResponse.time_periods || [];
  return periods.map(period => ({
    id: period.id,
    label: formatTimePeriodLabel(period.start_date, period.end_date)
  }));
}

/**
 * Format time period dates into a readable label
 */
function formatTimePeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  return `${startLabel} - ${endLabel}`;
}
