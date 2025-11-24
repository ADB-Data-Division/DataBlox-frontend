import { MigrationResponse, MigrationFlow } from './types';
import { mapProvinceToXY, THAILAND_PROVINCE_COORDINATES } from '../../../components/node-flow-animation/thailand-map-utils';

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

type PeriodCandidate = {
  id: string;
  start_date?: string;
  end_date?: string;
};

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
function getLocationCoordinates(
  locationId: string,
  locationName?: string
): { lat: number, lng: number, x: number; y: number } {
  // Cast the imported data to the correct type
  const units = thailandAdministrativeUnits as AdministrativeUnit[];

  const normalizedId = normalizeAdministrativeId(locationId);

  // Find the unit by ID
  let unit = units.find(u => normalizeAdministrativeId(u.id) === normalizedId);

  if (!unit && locationName) {
    const lowerName = locationName.toLowerCase();
    unit = units.find(u => 
      u.name_en?.toLowerCase() === lowerName ||
      u.name_th?.toLowerCase() === lowerName
    );
  }

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

  // Fallback to sample province coordinates by name if available
  if (locationName) {
    const fallbackProvince = THAILAND_PROVINCE_COORDINATES.find(
      province => province.name.toLowerCase() === locationName.toLowerCase()
    );

    if (fallbackProvince) {
      const fallbackSvg = mapProvinceToXY(
        fallbackProvince.latitude,
        fallbackProvince.longitude,
        MAP_WIDTH,
        MAP_HEIGHT,
        ORIGIN_X,
        ORIGIN_Y
      );

      console.warn(`No coordinates found for ID ${locationId}. Using fallback coordinates for ${locationName}.`);

      return {
        lat: fallbackProvince.latitude,
        lng: fallbackProvince.longitude,
        x: fallbackSvg.x,
        y: fallbackSvg.y
      };
    }
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
  const periodCandidates = getPeriodCandidates(apiResponse);
  
  console.log('🔄 Transforming migration data:', {
    selectedTimePeriod,
    availableTimePeriods: periodCandidates.map(tp => tp.id),
    totalLocations: apiResponse.data?.length || 0,
    totalFlows: apiResponse.flows?.length || 0
  });

  const timePeriodId = selectedTimePeriod || periodCandidates[0]?.id || '';

  if (!timePeriodId) {
    console.warn('No time period available in the data for the provided API response');
    return {
      nodes: [],
      connections: []
    };
  }

  console.log('📅 Using time period:', timePeriodId);

  // Transform location data into nodes. When the aggregated response lacks
  // detailed `data`, fall back to the flow records so we still have map nodes.
  let nodes: MapNode[] = [];

  if (apiResponse.data && apiResponse.data.length > 0) {
    nodes = apiResponse.data.map(locationData => {
      const location = locationData.location;
      const timeSeriesData = locationData.time_series[timePeriodId];
      
      const coordinates = getLocationCoordinates(location.id, location.name);
      const moveIn = timeSeriesData?.move_in || 0;
      const moveOut = timeSeriesData?.move_out || 0;
      const size = calculateNodeSize(moveIn, moveOut);
      
      const units = thailandAdministrativeUnits as AdministrativeUnit[];
      const unit = units.find(u => normalizeAdministrativeId(u.id) === normalizeAdministrativeId(location.id));
      const locationType = unit?.type || 'province';
      
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
  } else {
    nodes = deriveNodesFromFlows(apiResponse.flows || [], timePeriodId);
  }

  // Filter flows for the selected time period
  const relevantFlows = apiResponse.flows?.filter(flow => 
    flow.time_period_id === timePeriodId
  ) || [];

  // Find maximum flow for normalization. If there are no relevant flows,
  // set maxFlow to 0 to avoid Math.max() returning -Infinity and to ensure
  // normalizeFlowRate behaves correctly.
  const maxFlow = relevantFlows.length > 0 ? Math.max(...relevantFlows.map(flow => Math.abs(flow.flow_count))) : 0;

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
  const periods = getPeriodCandidates(apiResponse);
  return periods.map(period => ({
    id: period.id,
    label: formatTimePeriodLabel(period.start_date, period.end_date, period.id)
  }));
}

/**
 * Format time period dates into a readable label
 * @param startDate - ISO 8601 start date
 * @param endDate - ISO 8601 end date
 * @returns - Formatted label (e.g., "Dec 2024")
 */
function formatTimePeriodLabel(startDate?: string, endDate?: string, fallbackId?: string): string {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${startLabel} - ${endLabel}`;
    }
  }
  
  if (fallbackId) {
    return formatFallbackPeriodLabel(fallbackId);
  }
  
  return 'Unknown Period';
}

function formatFallbackPeriodLabel(periodId: string): string {
  const match = periodId.match(/^([a-z]{3})(\d{2})$/i);
  if (match) {
    const monthAbbrev = match[1].toLowerCase();
    const yearSuffix = parseInt(match[2], 10);
    const monthIndex = MONTH_LOOKUP[monthAbbrev];
    
    if (monthIndex !== undefined) {
      const fullYear = 2000 + yearSuffix;
      const date = new Date(Date.UTC(fullYear, monthIndex, 1));
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  }
  
  return periodId.toUpperCase();
}

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

function getPeriodCandidates(apiResponse: MigrationResponse): PeriodCandidate[] {
  if (apiResponse.time_periods && apiResponse.time_periods.length > 0) {
    return apiResponse.time_periods.map(period => ({
      id: period.id,
      start_date: period.start_date,
      end_date: period.end_date
    }));
  }
  
  const seen = new Set<string>();
  const candidates: PeriodCandidate[] = [];
  
  (apiResponse.flows || []).forEach(flow => {
    if (flow.time_period_id && !seen.has(flow.time_period_id)) {
      seen.add(flow.time_period_id);
      candidates.push({ id: flow.time_period_id });
    }
  });
  
  return candidates;
}

function deriveNodesFromFlows(flows: MigrationFlow[], timePeriodId: string): MapNode[] {
  const filteredFlows = flows.filter(flow => flow.time_period_id === timePeriodId);
  if (filteredFlows.length === 0) {
    return [];
  }
  
  type Aggregate = {
    location: MigrationFlow['origin'];
    moveIn: number;
    moveOut: number;
  };
  
  const aggregates = new Map<string, Aggregate>();
  
  const ensureAggregate = (location: MigrationFlow['origin']) => {
    if (!aggregates.has(location.id)) {
      aggregates.set(location.id, {
        location,
        moveIn: 0,
        moveOut: 0
      });
    }
    return aggregates.get(location.id)!;
  };
  
  filteredFlows.forEach(flow => {
    const magnitude = Math.abs(flow.flow_count);
    const originAggregate = ensureAggregate(flow.origin);
    originAggregate.moveOut += magnitude;
    
    const destinationAggregate = ensureAggregate(flow.destination);
    destinationAggregate.moveIn += magnitude;
  });
  
  const units = thailandAdministrativeUnits as AdministrativeUnit[];
  
  return Array.from(aggregates.values()).map(entry => {
    const coordinates = getLocationCoordinates(entry.location.id, entry.location.name);
    const unit = units.find(u => normalizeAdministrativeId(u.id) === normalizeAdministrativeId(entry.location.id));
    const locationType = unit?.type || 'province';
    
    const { displayText, tooltipText } = getLocationDisplayInfo(
      entry.location.name,
      entry.location.code,
      locationType as 'province' | 'district' | 'subDistrict'
    );
    
    return {
      id: entry.location.id,
      title: displayText,
      tooltip: tooltipText,
      x: coordinates.x,
      y: coordinates.y,
      size: calculateNodeSize(entry.moveIn, entry.moveOut)
    };
  });
}

function normalizeAdministrativeId(id: string): string {
  if (!id) return '';
  return id.toString().toLowerCase()
    .replace(/^th-/, '')
    .replace(/^0+/, '');
}
