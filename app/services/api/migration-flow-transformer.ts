import { MigrationResponse, MigrationFlow, LocationMigrationData } from './types';

// Node interface expected by the map visualization
export interface MapNode {
  id: string;
  title: string;
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

// Province coordinate mapping for Thailand (approximate positions)
const PROVINCE_COORDINATES: Record<string, { x: number; y: number }> = {
  'TH-03': { x: 180, y: 140 }, // Bangkok - Central Thailand
  'TH-10': { x: 110, y: 50 },  // Chiang Mai - Northern Thailand
  'TH-27': { x: 220, y: 90 },  // Khon Kaen - Northeastern Thailand
  'TH-64': { x: 130, y: 290 }, // Songkhla - Southern Thailand
  'TH-23': { x: 150, y: 170 }, // Kanchanaburi - Western Thailand
  'TH-25': { x: 280, y: 180 }, // Ubon Ratchathani - Eastern Thailand
  'TH-52': { x: 100, y: 200 }, // Prachuap Khiri Khan - Southern Thailand
  'TH-42': { x: 250, y: 120 }, // Nong Khai - Northeastern Thailand
  // Default position for "Other Provinces"
  'OTH-00': { x: 300, y: 300 }, // Other Provinces - positioned separately
};

// Default coordinates for unmapped provinces
const DEFAULT_COORDINATES = { x: 200, y: 200 };

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
    const coordinates = PROVINCE_COORDINATES[location.id] || DEFAULT_COORDINATES;
    
    // Calculate node size based on migration volume
    const moveIn = timeSeriesData?.move_in || 0;
    const moveOut = timeSeriesData?.move_out || 0;
    const size = calculateNodeSize(moveIn, moveOut);
    
    return {
      id: location.id,
      title: location.name,
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

  flowPairs.forEach((pair, pairKey) => {
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
    nodes: nodes.length,
    nodeIds: nodes.map(n => `${n.id}:${n.title}`),
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

/**
 * Example usage and test with the provided API response
 */
export function testTransformation() {
  const sampleApiResponse: MigrationResponse = {
    "metadata": {
      "scale": "province",
      "start_date": "2024-12-01T00:00:00",
      "end_date": "2024-12-31T23:59:59",
      "total_records": 2,
      "aggregation": "monthly"
    },
    "time_periods": [
      {
        "id": "dec24",
        "start_date": "2024-12-01T00:00:00",
        "end_date": "2025-01-01T00:00:00"
      }
    ],
    "data": [
      {
        "location": {
          "id": "TH-03",
          "name": "Bangkok",
          "code": "BAN",
          "parent_id": undefined
        },
        "time_series": {
          "dec24": {
            "move_in": 37360,
            "move_out": 23380,
            "net_migration": 13980
          }
        }
      },
      {
        "location": {
          "id": "TH-10",
          "name": "Chiang Mai",
          "code": "CHI",
          "parent_id": undefined
        },
        "time_series": {
          "dec24": {
            "move_in": 7191,
            "move_out": 5617,
            "net_migration": 1574
          }
        }
      }
    ],
    "flows": [
      {
        "origin": {
          "id": "TH-03",
          "name": "Bangkok",
          "code": "BAN",
          "parent_id": undefined
        },
        "destination": {
          "id": "TH-10",
          "name": "Chiang Mai",
          "code": "CHI",
          "parent_id": undefined
        },
        "time_period_id": "dec24",
        "flow_count": 21433,
        "flow_rate": 214330000.0,
        "return_flow_count": -5317,
        "return_flow_rate": -53170000.0
      },
      {
        "origin": {
          "id": "TH-10",
          "name": "Chiang Mai",
          "code": "CHI",
          "parent_id": undefined
        },
        "destination": {
          "id": "TH-03",
          "name": "Bangkok",
          "code": "BAN",
          "parent_id": undefined
        },
        "time_period_id": "dec24",
        "flow_count": 5317,
        "flow_rate": 53170000.0,
        "return_flow_count": -21433,
        "return_flow_rate": -214330000.0
      }
    ]
  };

  return transformMigrationDataForMap(sampleApiResponse, 'dec24');
}