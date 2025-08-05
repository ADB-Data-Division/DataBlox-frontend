/**
 * Example usage of the migration flow transformer
 * This demonstrates how to transform the API response into the format expected by the map visualization
 */

import { transformMigrationDataForMap, getAvailableTimePeriods } from './migration-flow-transformer';
import type { MigrationResponse } from './types';

// The API response you provided
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
        "id": "TH-03",
        "name": "Bangkok",
        "code": "BAN",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 525,
      "flow_rate": 5250000.0,
      "return_flow_count": -525,
      "return_flow_rate": -5250000.0
    },
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
    },
    {
      "origin": {
        "id": "TH-10",
        "name": "Chiang Mai",
        "code": "CHI",
        "parent_id": undefined
      },
      "destination": {
        "id": "TH-10",
        "name": "Chiang Mai",
        "code": "CHI",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 219,
      "flow_rate": 2190000.0,
      "return_flow_count": -219,
      "return_flow_rate": -2190000.0
    },
    {
      "origin": {
        "id": "OTH-00",
        "name": "Other Provinces",
        "code": "OTH",
        "parent_id": undefined
      },
      "destination": {
        "id": "TH-03",
        "name": "Bangkok",
        "code": "BAN",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 167256,
      "flow_rate": 1672560000.0,
      "return_flow_count": undefined,
      "return_flow_rate": undefined
    },
    {
      "origin": {
        "id": "OTH-00",
        "name": "Other Provinces",
        "code": "OTH",
        "parent_id": undefined
      },
      "destination": {
        "id": "TH-10",
        "name": "Chiang Mai",
        "code": "CHI",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 76627,
      "flow_rate": 766270000.0,
      "return_flow_count": undefined,
      "return_flow_rate": undefined
    },
    {
      "origin": {
        "id": "TH-03",
        "name": "Bangkok",
        "code": "BAN",
        "parent_id": undefined
      },
      "destination": {
        "id": "OTH-00",
        "name": "Other Provinces",
        "code": "OTH",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 1500988,
      "flow_rate": 15009880000.0,
      "return_flow_count": undefined,
      "return_flow_rate": undefined
    },
    {
      "origin": {
        "id": "TH-10",
        "name": "Chiang Mai",
        "code": "CHI",
        "parent_id": undefined
      },
      "destination": {
        "id": "OTH-00",
        "name": "Other Provinces",
        "code": "OTH",
        "parent_id": undefined
      },
      "time_period_id": "dec24",
      "flow_count": 181689,
      "flow_rate": 1816890000.0,
      "return_flow_count": undefined,
      "return_flow_rate": undefined
    }
  ]
};

/**
 * Example function showing how to use the transformer
 */
export function demonstrateTransformation() {
  console.log('=== Migration Data Transformation Example ===\n');
  
  // 1. Get available time periods
  const timePeriods = getAvailableTimePeriods(sampleApiResponse);
  console.log('Available time periods:');
  timePeriods.forEach(period => {
    console.log(`  - ${period.id}: ${period.label}`);
  });
  console.log();

  // 2. Transform the data for the map visualization
  const transformedData = transformMigrationDataForMap(sampleApiResponse, 'dec24');
  
  console.log('Transformed Nodes:');
  transformedData.nodes.forEach(node => {
    console.log(`  - ${node.title} (${node.id}): position (${node.x}, ${node.y}), size: ${node.size}`);
  });
  console.log();

  console.log('Transformed Connections:');
  transformedData.connections.forEach(connection => {
    const fromNode = transformedData.nodes.find(n => n.id === connection.fromNodeId);
    const toNode = transformedData.nodes.find(n => n.id === connection.toNodeId);
    console.log(`  - ${fromNode?.title} → ${toNode?.title}:`);
    console.log(`    To Flow Rate: ${connection.toFlowRate} (${connection.metadata.absoluteToFlow.toLocaleString()} people)`);
    console.log(`    From Flow Rate: ${connection.fromFlowRate} (${connection.metadata.absoluteFromFlow.toLocaleString()} people)`);
  });
  console.log();

  return transformedData;
}

/**
 * How to use this in a React component
 */
export const exampleUsageInComponent = `
import { transformMigrationDataForMap } from '@/app/services/api';
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';

function MigrationMapVisualization({ apiResponse, selectedTimePeriod }) {
  // Transform the API response
  const { nodes, connections } = transformMigrationDataForMap(apiResponse, selectedTimePeriod);
  
  // Pass to the map component
  return (
    <NodeFlowAnimation
      nodes={nodes}
      connections={connections}
      curved={true}
      width={960}
      height={600}
    />
  );
}
`;

// Run the demonstration if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  demonstrateTransformation();
}