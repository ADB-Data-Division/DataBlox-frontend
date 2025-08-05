import * as React from 'react';
import ThailandMap from '@/components/leaflet/leaflet';
import { GeoJSONLevel } from '@/app/services/data-loader/data-loader-interface';
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';
import { transformMigrationDataForMap } from '@/app/services/api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Sample API response data (you can replace this with a real API call)
const sampleApiResponse = {
  metadata: {
    scale: 'province' as const,
    start_date: '2024-12-01T00:00:00',
    end_date: '2024-12-31T23:59:59',
    total_records: 2,
    aggregation: 'monthly' as const
  },
  time_periods: [
    {
      id: 'dec24',
      start_date: '2024-12-01T00:00:00',
      end_date: '2025-01-01T00:00:00'
    }
  ],
  data: [
    {
      location: { id: 'TH-03', name: 'Bangkok', code: 'BAN', parent_id: undefined },
      time_series: { dec24: { move_in: 37360, move_out: 23380, net_migration: 13980 } }
    },
    {
      location: { id: 'TH-10', name: 'Chiang Mai', code: 'CHI', parent_id: undefined },
      time_series: { dec24: { move_in: 7191, move_out: 5617, net_migration: 1574 } }
    }
  ],
  flows: [
    {
      origin: { id: 'TH-03', name: 'Bangkok', code: 'BAN', parent_id: undefined },
      destination: { id: 'TH-10', name: 'Chiang Mai', code: 'CHI', parent_id: undefined },
      time_period_id: 'dec24',
      flow_count: 21433,
      flow_rate: 214330000.0,
      return_flow_count: -5317,
      return_flow_rate: -53170000.0
    },
    {
      origin: { id: 'TH-10', name: 'Chiang Mai', code: 'CHI', parent_id: undefined },
      destination: { id: 'TH-03', name: 'Bangkok', code: 'BAN', parent_id: undefined },
      time_period_id: 'dec24',
      flow_count: 5317,
      flow_rate: 53170000.0,
      return_flow_count: -21433,
      return_flow_rate: -214330000.0
    },
    {
      origin: { id: 'OTH-00', name: 'Other Provinces', code: 'OTH', parent_id: undefined },
      destination: { id: 'TH-03', name: 'Bangkok', code: 'BAN', parent_id: undefined },
      time_period_id: 'dec24',
      flow_count: 167256,
      flow_rate: 1672560000.0,
      return_flow_count: undefined,
      return_flow_rate: undefined
    },
    {
      origin: { id: 'TH-03', name: 'Bangkok', code: 'BAN', parent_id: undefined },
      destination: { id: 'OTH-00', name: 'Other Provinces', code: 'OTH', parent_id: undefined },
      time_period_id: 'dec24',
      flow_count: 1500988,
      flow_rate: 15009880000.0,
      return_flow_count: undefined,
      return_flow_rate: undefined
    }
  ]
};

export default async function MapPage() {
  // Transform the sample data using our transformer
  const { nodes, connections } = transformMigrationDataForMap(sampleApiResponse, 'dec24');
  
  return (
    <Box sx={{ p: 2 }}> 
      <Typography variant="h4" gutterBottom>
        Thailand Migration Flow Map
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Interactive visualization showing migration flows between provinces
      </Typography>
      
      {/* <ThailandMap adminLevel={GeoJSONLevel.PROVINCE} /> */}
      <NodeFlowAnimation 
        nodes={nodes}
        connections={connections}
        curved={true}
        width={960}
        height={600}
      />
    </Box>
  );
}
