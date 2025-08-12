'use client';

import {
  Box,
  Pagination,
  Stack,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';

interface SearchPaginationProps {
  totalResults: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
  onPageSizeChange: (event: any) => void;
}

export function SearchPagination({
  totalResults,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange
}: SearchPaginationProps) {
  const totalPages = Math.ceil(totalResults / pageSize);

  if (totalResults === 0 || totalPages <= 1) return null;

  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={3} alignItems="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={onPageChange}
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          siblingCount={1}
          boundaryCount={1}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {totalResults} total results
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Per page</InputLabel>
            <Select
              value={pageSize}
              onChange={onPageSizeChange}
              label="Per page"
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Stack>
    </Box>
  );
}