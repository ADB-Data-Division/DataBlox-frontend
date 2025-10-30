'use client';

import { Box, Typography, useTheme } from '@mui/material';
import { ThailandRegion, getRegionDisplayName } from '../../services/api/province-regions';

interface SearchResultsSummaryProps {
  totalResults: number;
  startIndex: number;
  endIndex: number;
  searchQuery: string;
  allowedType: string | null;
  selectedProvinceName?: string | null;
  searchedRegion?: ThailandRegion | null;
}

export function SearchResultsSummary({
  totalResults,
  startIndex,
  endIndex,
  searchQuery,
  allowedType,
  selectedProvinceName,
  searchedRegion
}: SearchResultsSummaryProps) {
  const theme = useTheme();

  if (totalResults === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {searchQuery.trim() ? (
        <Typography variant="body2" color="text.secondary">
          Showing {startIndex + 1}-{Math.min(endIndex, totalResults)} of {totalResults} results
          {searchedRegion && (
            <span style={{ marginLeft: '8px', color: theme.palette.primary.main }}>
              • Provinces in {getRegionDisplayName(searchedRegion)}
            </span>
          )}
          {allowedType && !searchedRegion && (
            <span style={{ marginLeft: '8px', color: theme.palette.primary.main }}>
              • Filtered to {allowedType}s only
            </span>
          )}
          {selectedProvinceName && (
            <span style={{ marginLeft: '8px', color: theme.palette.primary.main }}>
             in {selectedProvinceName}
            </span>
          )}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {allowedType ? (
            `Showing default ${allowedType}s`
          ) : (
            `Showing top ${totalResults} major provinces in Thailand`
          )}
        </Typography>
      )}
    </Box>
  );
}