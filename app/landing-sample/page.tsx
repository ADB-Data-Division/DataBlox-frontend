'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  Container,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  Buildings,
  MapPin,
  Calendar,
  TrendUp,
  Users,
  ArrowRight,
  ArrowLeft
} from '@phosphor-icons/react/dist/ssr';
import Scorecard from '../../components/score-card/score-card';
import { metadataService } from '../../app/services/api/metadata-service';
import { migrationService } from '../../app/services/api/migration-service';
import { Province, District, TimePeriods } from '../../models/api-types';

interface LandingStats {
  totalProvinces: number;
  totalDistricts: number;
  totalSubdistricts: number;
  availableTimeRange: {
    start: string;
    end: string;
  };
  sampleMigrationData?: {
    province: Province;
    totalMoveIn: number;
    totalMoveOut: number;
    netMigration: number;
  }[];
}

export default function LandingSamplePage() {
  const theme = useTheme();
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch metadata
        const [provinces, districts, subdistricts, timePeriods] = await Promise.all([
          metadataService.getProvinces(),
          metadataService.getDistricts(),
          metadataService.getSubdistricts(),
          metadataService.getTimePeriods()
        ]);

        // Get sample migration data for top 3 provinces by name
        const topProvinces = provinces
          .sort((a: Province, b: Province) => a.name.localeCompare(b.name))
          .slice(0, 3);

        const sampleMigrationPromises = topProvinces.map(async (province: Province) => {
          try {
            const migrationData = await migrationService.getProvinceMigrationData(
              timePeriods.start_date,
              timePeriods.end_date,
              [province.id],
              'monthly',
              false
            );

            // Calculate totals
            let totalMoveIn = 0;
            let totalMoveOut = 0;

            if (migrationData.data && migrationData.data.length > 0) {
              const locationData = migrationData.data[0];
              Object.values(locationData.time_series).forEach((stats: any) => {
                totalMoveIn += stats.move_in;
                totalMoveOut += stats.move_out;
              });
            }

            return {
              province,
              totalMoveIn,
              totalMoveOut,
              netMigration: totalMoveIn - totalMoveOut
            };
          } catch (error) {
            console.error(`Failed to fetch migration data for ${province.name}:`, error);
            return {
              province,
              totalMoveIn: 0,
              totalMoveOut: 0,
              netMigration: 0
            };
          }
        });

        const sampleMigrationData = await Promise.all(sampleMigrationPromises);

        const landingStats: LandingStats = {
          totalProvinces: provinces.length,
          totalDistricts: districts.length,
          totalSubdistricts: subdistricts.length,
          availableTimeRange: {
            start: timePeriods.start_date,
            end: timePeriods.end_date
          },
          sampleMigrationData
        };

        setStats(landingStats);
      } catch (err) {
        console.error('Failed to fetch landing data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        No data available
      </Alert>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          p: 6,
          mb: 6,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Thailand Migration Data Platform
        </Typography>
        <Typography
          variant="h5"
          sx={{
            mb: 4,
            color: theme.palette.text.secondary,
            maxWidth: '800px',
            lineHeight: 1.6
          }}
        >
          Explore comprehensive migration patterns across Thailand's provinces, districts, and subdistricts.
          Discover population movements, trends, and insights from our extensive dataset.
        </Typography>

        {/* Key Statistics */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          <Box sx={{ minWidth: 250 }}>
            <Scorecard
              title="Provinces"
              value={stats.totalProvinces}
              subtitle="Administrative divisions"
              icon={<Buildings />}
              color="primary"
              size="medium"
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <Scorecard
              title="Districts"
              value={stats.totalDistricts}
              subtitle="Sub-provincial divisions"
              icon={<MapPin />}
              color="secondary"
              size="medium"
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <Scorecard
              title="Subdistricts"
              value={stats.totalSubdistricts}
              subtitle="Local administrative units"
              icon={<Users />}
              color="success"
              size="medium"
            />
          </Box>
          <Box sx={{ minWidth: 250 }}>
            <Scorecard
              title="Time Coverage"
              value={`${formatDate(stats.availableTimeRange.start)} - ${formatDate(stats.availableTimeRange.end)}`}
              subtitle="Available data range"
              icon={<Calendar />}
              color="info"
              size="medium"
            />
          </Box>
        </Box>
      </Paper>

      {/* Sample Migration Data Section */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            fontWeight: 600,
            mb: 4,
            color: theme.palette.text.primary
          }}
        >
          Sample Migration Insights
        </Typography>

        <Typography
          variant="body1"
          sx={{
            mb: 4,
            color: theme.palette.text.secondary,
            maxWidth: '600px'
          }}
        >
          Here's a glimpse of migration patterns for selected provinces. These numbers represent
          total population movements within the available time period.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {stats.sampleMigrationData?.map((sample, index) => (
            <Box key={sample.province.id} sx={{ minWidth: 300, maxWidth: 400 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    color: theme.palette.primary.main
                  }}
                >
                  {sample.province.name}
                </Typography>

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ArrowRight size={20} color={theme.palette.success.main} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Move-in
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {formatNumber(sample.totalMoveIn)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ArrowLeft size={20} color={theme.palette.error.main} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Move-out
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {formatNumber(sample.totalMoveOut)}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Net Migration
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendUp
                        size={16}
                        color={sample.netMigration >= 0 ? theme.palette.success.main : theme.palette.error.main}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: sample.netMigration >= 0 ? theme.palette.success.main : theme.palette.error.main
                        }}
                      >
                        {sample.netMigration >= 0 ? '+' : ''}{formatNumber(sample.netMigration)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Data Coverage Section */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default
        }}
      >
        <Typography
          variant="h4"
          component="h3"
          sx={{
            fontWeight: 600,
            mb: 3,
            color: theme.palette.text.primary
          }}
        >
          Comprehensive Data Coverage
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Geographic Scope
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: theme.palette.text.secondary }}>
              Our platform provides detailed migration data across all administrative levels in Thailand:
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={`${stats.totalProvinces} Provinces`} color="primary" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Changwat (จังหวัด)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={`${stats.totalDistricts} Districts`} color="secondary" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Amphoe (อำเภอ)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={`${stats.totalSubdistricts} Subdistricts`} color="success" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Tambon (ตำบล)
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Available Visualizations
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: theme.palette.text.secondary }}>
              Explore migration patterns through multiple visualization types:
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendUp size={20} color={theme.palette.primary.main} />
                <Typography variant="body2">
                  Migration flow maps and network diagrams
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Buildings size={20} color={theme.palette.secondary.main} />
                <Typography variant="body2">
                  Time-series analysis and trend visualization
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Users size={20} color={theme.palette.success.main} />
                <Typography variant="body2">
                  Sankey diagrams for migration pathways
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MapPin size={20} color={theme.palette.info.main} />
                <Typography variant="body2">
                  Interactive geographic heatmaps
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}