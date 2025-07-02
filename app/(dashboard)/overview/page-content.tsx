'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Skeleton,
  Divider,
  useTheme
} from '@mui/material';
import Scorecard from '../../components/score-card/score-card';
import { 
  ChartBar,
  ArrowsLeftRight,
  ArrowRight,
  ArrowLeft,
  Users,
  Airplane,
  Buildings,
  MapPin,
  House
} from '@phosphor-icons/react/dist/ssr';

// Mock data for Thailand province movement metrics
const mockData = {
  // Total visitor metrics  
  totalVisitors: 28456789,
  visitorsTrend: 15.7,
  
  // Domestic movement
  domesticArrivals: 18934567,
  domesticArrivalsTrend: 8.3,
  domesticDepartures: 17845632,
  domesticDeparturesTrend: 6.9,
  
  // International movement
  internationalArrivals: 9522222,
  internationalArrivalsTrend: 24.5,
  internationalDepartures: 8976543,
  internationalDeparturesTrend: 18.2,
  
  // Top provinces
  bangkokVisitors: 12567890,
  bangkokVisitorsTrend: 12.3,
  phuketVisitors: 5678901,
  phuketVisitorsTrend: 32.7,
  chiangMaiVisitors: 3456789,
  chiangMaiVisitorsTrend: 15.8,
  
  // Occupancy and duration
  averageStayDuration: 4.8,
  averageStayTrend: 0.5,
  occupancyRate: 76.4,
  occupancyTrend: 8.9
};

export default function PageContent() {
  const theme = useTheme();
  const [data, setData] = useState<typeof mockData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate data fetching
  useEffect(() => {
    const fetchData = async () => {
      // In a real app, replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 auto', mb: { xs: 2, md: 0 } }}>
            <Typography variant="h5" fontWeight="medium" gutterBottom>
              Thailand Visitor Movement
            </Typography>
            <Typography variant="body1">
              Thailand has welcomed {loading ? '...' : formatNumber(data?.totalVisitors || 0)} visitors, 
              with {loading ? '...' : formatNumber(data?.internationalArrivals || 0)} international arrivals 
              and {loading ? '...' : formatNumber(data?.domesticArrivals || 0)} domestic movements across provinces.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', ml: { md: 2 } }}>
            <ArrowsLeftRight size={36} weight="thin" />
          </Box>
        </Box>
      </Paper>

      <Typography variant="h5" sx={{ mb: 3, mt: 4 }}>
        Movement & Visitor Metrics
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        mx: -1.5 // Negative margin to offset the padding of child boxes
      }}>
        {loading ? (
          // Show skeletons while loading
          Array.from(new Array(8)).map((_, index) => (
            <Box 
              key={index} 
              sx={{ 
                width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, 
                p: 1.5,
                boxSizing: 'border-box'
              }}
            >
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Box>
          ))
        ) : (
          // Show actual scorecards when data is loaded
          <>
            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Total Visitors"
                value={formatNumber(data?.totalVisitors || 0)}
                subtitle="Across all provinces"
                trend={data?.visitorsTrend}
                trendLabel="vs last year"
                icon={<Users />}
                color="primary"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Domestic Arrivals"
                value={formatNumber(data?.domesticArrivals || 0)}
                subtitle="Inter-province movement"
                trend={data?.domesticArrivalsTrend}
                trendLabel="vs last year"
                icon={<ArrowRight />}
                color="success"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Domestic Departures"
                value={formatNumber(data?.domesticDepartures || 0)}
                subtitle="Inter-province movement"
                trend={data?.domesticDeparturesTrend}
                trendLabel="vs last year"
                icon={<ArrowLeft />}
                color="info"
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="International Arrivals"
                value={formatNumber(data?.internationalArrivals || 0)}
                subtitle="Foreign visitors"
                trend={data?.internationalArrivalsTrend}
                trendLabel="vs last year"
                icon={<Airplane />}
                color="secondary"
              />
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Bangkok Visitors"
                value={formatNumber(data?.bangkokVisitors || 0)}
                subtitle="Capital province"
                trend={data?.bangkokVisitorsTrend}
                trendLabel="increase in visitors"
                icon={<Buildings />}
                color="warning"
              />
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Phuket Visitors"
                value={formatNumber(data?.phuketVisitors || 0)}
                subtitle="Island province"
                trend={data?.phuketVisitorsTrend}
                trendLabel="increase in visitors"
                icon={<MapPin />}
                color="error"
              />
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Average Stay Duration"
                value={data?.averageStayDuration || 0}
                valueSuffix=" days"
                subtitle="Length of visit"
                trend={data?.averageStayTrend}
                trendLabel="vs previous year"
                icon={<House />}
                color="primary"
              />
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' }, p: 1.5, boxSizing: 'border-box' }}>
              <Scorecard
                title="Occupancy Rate"
                value={data?.occupancyRate || 0}
                valueSuffix="%"
                subtitle="Accommodation utilization"
                trend={data?.occupancyTrend}
                trendLabel="improvement"
                icon={<ChartBar />}
                color="secondary"
              />
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Data last updated: {new Date().toLocaleDateString()}
        </Typography>
      </Box>
    </Box>
  );
}
