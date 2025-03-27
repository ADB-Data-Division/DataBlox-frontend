import * as React from 'react';
import ThailandMap from '@/components/leaflet/leaflet';
import { GeoJSONLevel } from '@/app/services/data-loader/data-loader-interface';


export default async function OrdersPage() {
  

  return (
    <ThailandMap adminLevel={GeoJSONLevel.PROVINCE} />
  );
}
