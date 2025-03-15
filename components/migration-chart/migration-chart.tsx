'use client';

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsTooltip, ChartsXAxis, ChartsYAxis } from '@mui/x-charts';

// Define color schemes
const PROVINCE_COLORS = {
  // Industrial provinces (blues/purples)
  bangkok: '#0747A6',        // Deep blue
  samutPrakan: '#2684FF',    // Bright blue
  chonBuri: '#4C9AFF',       // Medium blue
  rayong: '#6554C0',         // Purple
  chachoengsao: '#8777D9',   // Light purple
  
  // Agricultural provinces (greens/earth tones)
  nakhonSawan: '#216E4E',    // Deep green
  chiangMai: '#36B37E'       // Bright green
};

// Define province categories
const PROVINCE_CATEGORIES = {
  industrial: ['bangkok', 'samutPrakan', 'chonBuri', 'rayong', 'chachoengsao'],
  agricultural: ['nakhonSawan', 'chiangMai']
};

// Province display names
const PROVINCE_NAMES = {
  bangkok: 'Bangkok',
  samutPrakan: 'Samut Prakan',
  chonBuri: 'Chon Buri',
  rayong: 'Rayong',
  chachoengsao: 'Chachoengsao',
  nakhonSawan: 'Nakhon Sawan',
  chiangMai: 'Chiang Mai'
};

interface MigrationChartProps {
  data: any[];
  title?: string;
  height?: number;
  width?: string | number;
  dataKey?: 'moveIn' | 'moveOut' | 'net';
  darkMode?: boolean;
}

const MigrationChart: React.FC<MigrationChartProps> = ({
  data,
  title = 'Provincial Migration Patterns',
  height = 400,
  width = '100%',
  dataKey = 'moveIn',
  darkMode = true
}) => {
  const theme = useTheme();
  
  // Format data for MUI Charts
  const formatDataForMuiCharts = () => {
    // Extract months for x-axis
    const months = data.map(item => item.month);
    
    // Create series data for each province
    const series: any[] = [];
    
    // First add industrial provinces (blues/purples)
    PROVINCE_CATEGORIES.industrial.forEach(province => {
      series.push({
        data: data.map(item => item[province as keyof typeof PROVINCE_NAMES]),
        label: PROVINCE_NAMES[province as keyof typeof PROVINCE_NAMES],
        id: province,
        color: PROVINCE_COLORS[province as keyof typeof PROVINCE_NAMES],
        stack: 'industrial',
      });
    });
    
    // Then add agricultural provinces (greens)
    PROVINCE_CATEGORIES.agricultural.forEach(province => {
      series.push({
        data: data.map(item => item[province as keyof typeof PROVINCE_NAMES]),
        label: PROVINCE_NAMES[province as keyof typeof PROVINCE_NAMES],
        id: province,
        color: PROVINCE_COLORS[province as keyof typeof PROVINCE_NAMES],
        stack: 'agricultural',
      });
    });
    
    return { months, series };
  };
  
  const { months, series } = formatDataForMuiCharts();

  // Format number with commas for y-axis
  const formatYAxisLabel = (value: number) => {
    return value.toLocaleString();
  };

  // Calculate the maximum value for y-axis
  const maxValue = Math.max(
    ...data.map(item => 
      Object.keys(item)
        .filter(key => key !== 'month')
        .reduce((sum, key) => sum + item[key], 0)
    )
  );
  
  // Round up to nearest thousand for nice y-axis limits
  const yAxisMax = Math.ceil(maxValue / 1000) * 1000;

  return (
    <Box sx={{ 
      width, 
      height: 'auto',
      p: 3,
      bgcolor: darkMode ? '#121212' : 'background.paper',
      color: darkMode ? '#fff' : 'text.primary',
      borderRadius: 2,
      boxShadow: 1
    }}>
      <Typography variant="h6" gutterBottom color={darkMode ? '#fff' : 'text.primary'}>
        {title}
      </Typography>
      
      <Box sx={{ 
        mt: 2, 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 4
      }}>
        {/* Legend for industrial provinces */}
        <Box>
          <Typography 
            variant="subtitle2" 
            gutterBottom 
            color={darkMode ? '#fff' : 'text.primary'}
          >
            Industrial Provinces
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {PROVINCE_CATEGORIES.industrial.map(province => (
              <Box key={province} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: PROVINCE_COLORS[province as keyof typeof PROVINCE_NAMES],
                  borderRadius: '50%'
                }} />
                <Typography 
                  variant="body2"
                  color={darkMode ? '#fff' : 'text.primary'}
                >
                  {PROVINCE_NAMES[province as keyof typeof PROVINCE_NAMES]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Legend for agricultural provinces */}
        <Box>
          <Typography 
            variant="subtitle2" 
            gutterBottom
            color={darkMode ? '#fff' : 'text.primary'}
          >
            Agricultural Provinces
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {PROVINCE_CATEGORIES.agricultural.map(province => (
              <Box key={province} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: PROVINCE_COLORS[province as keyof typeof PROVINCE_NAMES],
                  borderRadius: '50%'
                }} />
                <Typography 
                  variant="body2"
                  color={darkMode ? '#fff' : 'text.primary'}
                >
                  {PROVINCE_NAMES[province as keyof typeof PROVINCE_NAMES]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ height, width: '100%' }}>
        <BarChart
          series={series}
          xAxis={[{ 
            data: months,
            scaleType: 'band',
            tickLabelStyle: {
              fontSize: 14,
              fill: darkMode ? '#fff' : '#000',
              fontWeight: 'bold'
            },
            label: 'Month',
            labelStyle: {
              fontSize: 16,
              fill: darkMode ? '#fff' : '#000',
              fontWeight: 'bold'
            }
          }]}
          yAxis={[{
            label: 'Number of People',
            labelStyle: {
              fontSize: 14,
              fill: darkMode ? '#fff' : '#000',
              fontWeight: 'bold',
            },
            tickLabelStyle: {
              fontSize: 16,
              fill: darkMode ? '#fff' : '#000',
              fontWeight: 'bold'
            },
            valueFormatter: formatYAxisLabel,
            max: yAxisMax,
            tickSize: 10,
          }]}
          height={height}
          margin={{ top: 40, right: 40, bottom: 60, left: 100 }}
          slotProps={{
            legend: {
              hidden: true, // We're using our custom legend
            },
          }}
          sx={{
            '.MuiChartsAxis-line': {
              stroke: darkMode ? '#aaa' : '#777',
              strokeWidth: 1.5,
            },
            '.MuiChartsAxis-tick': {
              stroke: darkMode ? '#aaa' : '#777',
              strokeWidth: 1.5,
            },
            '.MuiChartsAxis-tickLabel': {
              fontWeight: 'bold',
            },
            '.MuiChartsAxis-grid': {
              stroke: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              strokeDasharray: '3 3',
            },
          }}
          tooltip={{ trigger: 'item' }}
          colors={Object.values(PROVINCE_COLORS)}
          layout="vertical"
        />
      </Box>
      
      <Typography 
        variant="body2" 
        color={darkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'} 
        sx={{ mt: 2, textAlign: 'center' }}
      >
        Data represents monthly migration patterns across Thailand provinces
      </Typography>
    </Box>
  );
};

export default MigrationChart; 