'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { 
  Box, Typography, Chip, Button, Paper, CircularProgress, Alert, useTheme,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SankeyDiagram from '@/components/sankey-diagram';
import type { MigrationResponse } from '@/app/services/api/types';
import type { Location } from '../../helper';

interface SankeyResultsProps {
  selectedLocations: Location[];
  startDate: string;
  endDate: string;
  onNewSearch: () => void;
  onEditSearch: () => void;
  apiResponse: MigrationResponse | null;
  loading: boolean;
  error: string | null;
  dateRangeControls?: React.ReactNode;
}

const getLocationIcon = (type: Location['type']) => {
  switch (type) {
    case 'province':
      return <LocationCityIcon fontSize="small" />;
    case 'district':
      return <HomeWorkIcon fontSize="small" />;
    case 'subDistrict':
      return <ApartmentIcon fontSize="small" />;
  }
};

const getLocationColor = (type: Location['type']): 'primary' | 'secondary' | 'default' => {
  switch (type) {
    case 'province':
      return 'primary';
    case 'district':
      return 'secondary';
    case 'subDistrict':
      return 'default';
  }
};

export default function SankeyResults({
  selectedLocations,
  startDate,
  endDate,
  onNewSearch,
  onEditSearch,
  apiResponse,
  loading,
  error,
  dateRangeControls
}: SankeyResultsProps) {
  const theme = useTheme();
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Extract available years from the API response
  const availableYears = useMemo(() => {
    if (!apiResponse?.time_periods) return [];
    
    const years = new Set<number>();
    apiResponse.time_periods.forEach(period => {
      const year = new Date(period.start_date).getFullYear();
      years.add(year);
    });
    
    const sortedYears = Array.from(years).sort();
    console.log('📅 Available years in Sankey data:', sortedYears);
    
    return sortedYears;
  }, [apiResponse]);

  // Extract available months for the selected year
  const availableMonths = useMemo(() => {
    if (!apiResponse?.time_periods || !selectedYear) return [];
    
    const yearNum = parseInt(selectedYear);
    const yearPeriods = apiResponse.time_periods.filter(period => {
      const year = new Date(period.start_date).getFullYear();
      return year === yearNum;
    });
    
    const months = new Set<number>();
    yearPeriods.forEach(period => {
      const month = new Date(period.start_date).getMonth(); // 0-11
      months.add(month);
    });
    
    const sortedMonths = Array.from(months).sort((a, b) => a - b); // Sort chronologically (0=Jan, 11=Dec)
    console.log('📅 Available months for year', selectedYear, ':', sortedMonths.map(m => new Date(2000, m).toLocaleString('default', { month: 'short' })));
    
    return sortedMonths;
  }, [apiResponse, selectedYear]);

  // Auto-select first year when data loads
  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.map(String).includes(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  // Reset month selection when year changes
  useEffect(() => {
    setSelectedMonth('all');
  }, [selectedYear]);

  // Filter API response based on selected year and month
  const filteredApiResponse = useMemo(() => {
    if (!apiResponse || !selectedYear) return apiResponse;
    
    const yearNum = parseInt(selectedYear);
    let filteredPeriods = apiResponse.time_periods.filter(period => {
      const year = new Date(period.start_date).getFullYear();
      return year === yearNum;
    });
    
    // Further filter by month if a specific month is selected
    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth);
      filteredPeriods = filteredPeriods.filter(period => {
        const month = new Date(period.start_date).getMonth();
        return month === monthNum;
      });
    }
    
    const periodIds = new Set(filteredPeriods.map(p => p.id));
    const filteredFlows = apiResponse.flows?.filter(flow => 
      periodIds.has(flow.time_period_id)
    );
    
    return {
      ...apiResponse,
      time_periods: filteredPeriods,
      flows: filteredFlows || []
    };
  }, [apiResponse, selectedYear, selectedMonth]);

  return (
    <Box>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          mb: 3,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ 
            textTransform: 'uppercase', 
            letterSpacing: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            mb: 1.5
          }}
        >
          Selected Locations
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {selectedLocations.map((location, index) => (
            <Chip
              key={location.id}
              icon={getLocationIcon(location.type)}
              label={location.name}
              color={getLocationColor(location.type)}
              size="medium"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
          ))}
          <Chip
            label={`${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{ 
              fontWeight: 500,
              fontSize: '0.75rem',
              borderStyle: 'dashed'
            }}
          />
        </Box>

        <Button 
          variant="outlined" 
          size="small"
          onClick={onEditSearch}
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            mr: 1,
          }}
        >
          Edit Search
        </Button>

        <Button 
          variant="outlined" 
          size="small"
          onClick={onNewSearch}
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          New Search
        </Button>
      </Paper>
      
      {/* Results Container */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          backgroundColor: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          minHeight: '50vh'
        }}
      >
        {/* Loading State */}
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 8,
            minHeight: '40vh'
          }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
              Loading Migration Data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching data for {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''}...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Box sx={{ py: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Unable to load migration data. Please check your connection and try again.
            </Typography>
          </Box>
        )}

        {/* Success State - Sankey Diagram */}
        {!loading && !error && apiResponse && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Migration Flow Sankey Diagram
                {apiResponse && (
                  <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                    {apiResponse.data.length} locations • {apiResponse.flows?.length || 0} total flows • {apiResponse.time_periods.length} time periods
                  </Typography>
                )}
              </Typography>

              {/* Year and Month Filter Dropdowns */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {availableYears.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="year-select-label">Select Year</InputLabel>
                    <Select
                      labelId="year-select-label"
                      id="year-select"
                      value={selectedYear}
                      label="Select Year"
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {availableYears.map(year => (
                        <MenuItem key={year} value={String(year)}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Month Filter Dropdown - only show when a specific year is selected */}
                {selectedYear && availableMonths.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="month-select-label">Select Month</InputLabel>
                    <Select
                      labelId="month-select-label"
                      id="month-select"
                      value={selectedMonth}
                      label="Select Month"
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <MenuItem value="all">All Months</MenuItem>
                      {availableMonths.map(month => (
                        <MenuItem key={month} value={String(month)}>
                          {new Date(2000, month).toLocaleString('default', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Box>

            {/* Date Range Controls */}
            {dateRangeControls && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                {dateRangeControls}
              </Paper>
            )}

            {/* Full Width Diagram */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <SankeyDiagram 
                apiResponse={filteredApiResponse}
              />

              <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block', textAlign: 'center', maxWidth: 900, mx: 'auto' }}>
                {selectedMonth !== 'all'
                  ? `Showing migration flows for ${new Date(parseInt(selectedYear), parseInt(selectedMonth)).toLocaleString('default', { month: 'long', year: 'numeric' })}. Flow thickness represents migration volume.`
                  : `Showing migration flows for ${selectedYear || 'selected year'}. Hover over flows to see monthly breakdown. Flow thickness represents total migration volume.`
                }
              </Typography>
            </Paper>
          </Box>
        )}

        {/* No Data State */}
        {!loading && !error && !apiResponse && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Migration Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No migration flows found for the selected locations and time period.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
