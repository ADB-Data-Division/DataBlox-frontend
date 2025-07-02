import * as React from 'react';
import ThailandMap from '@/components/leaflet/leaflet';
import { GeoJSONLevel } from '@/app/services/data-loader/data-loader-interface';
import NodeFlowAnimation from '@/components/node-flow-animation/node-flow-animation';
import Box from '@mui/material/Box';


export default async function MapPage() {
  return (
    <Box> 
      {/* <ThailandMap adminLevel={GeoJSONLevel.PROVINCE} /> */}
      <NodeFlowAnimation />
    </Box>
  );
}
